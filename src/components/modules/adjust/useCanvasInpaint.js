import { ref, unref, watch } from 'vue'
import { fabric } from 'fabric'
import { toast } from '@/utils/toast'
import { useEditorState } from '@/composables/useEditorState'
import { inpaintFetch } from '@/api/inpaintFetch'

// === 模块级单例状态 ===
let canvasRef = null
let saveHistoryFn = null
let initialSnapshot = null
let autoInpaintTimer = null
let isDragging = false
let startPoint = null
let activeRect = null
let isExecuting = false

// 响应式状态
export const brushSize = ref(30)
export const drawMode = ref('brush')

// 注册模块
export const registerInpaintModule = (canvas, saveHistory) => {
  canvasRef = canvas
  saveHistoryFn = saveHistory
}

// === 工具函数 ===
const getCanvas = () => unref(canvasRef)

const getMainImage = () => {
  const canvas = getCanvas()
  if (!canvas) return null
  return canvas.getObjects().find(o => o && o.id === 'main-image')
}

// 将 dataURL 转成 Blob
const dataURLToBlob = async (dataUrl) => {
  const res = await fetch(dataUrl)
  return await res.blob()
}

// 导出主图为 PNG Blob（仅主图像素，不带其它对象）
const exportMainImageBlob = async () => {
  const main = getMainImage()
  if (!main) throw new Error('未找到主图 (id=main-image)')

  // 使用临时 StaticCanvas，按主图原始像素尺寸导出
  const src = main.getSrc()
  return await new Promise((resolve, reject) => {
    fabric.Image.fromURL(src, (img, isError) => {
      if (isError || !img) return reject(new Error(`Failed to load image: ${src}`))

      const w = img.width
      const h = img.height
      const temp = new fabric.StaticCanvas(null, {
        width: w,
        height: h,
        backgroundColor: 'transparent'
      })

      // 同步滤镜（如果主图有滤镜）
      if (main.filters && main.filters.length > 0) {
        img.filters = [...main.filters]
        try {
          img.applyFilters()
        } catch (_) {
          // noop
        }
      }

      // 直接原始像素铺满
      img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        flipX: false,
        flipY: false
      })

      temp.add(img)
      temp.renderAll()

      temp.getElement().toBlob((blob) => {
        try { temp.dispose() } catch (_) { /* noop */ }
        if (!blob) return reject(new Error('export main image toBlob failed'))
        resolve(blob)
      }, 'image/png')
    }, { crossOrigin: 'anonymous' })
  })
}

// === 🔒 画布锁定系统（最小侵入） ===
const setObjectsLocked = (locked) => {
  const canvas = getCanvas()
  if (!canvas) return

  const objects = canvas.getObjects()
  objects.forEach(obj => {
    if (obj.isMaskObject || obj.type === 'path') return

    if (locked) {
      obj._prevSelectable = obj.selectable
      obj._prevEvented = obj.evented
      obj.selectable = false
      obj.evented = false
      obj.lockMovementX = true
      obj.lockMovementY = true
      obj.lockRotation = true
      obj.lockScalingX = true
      obj.lockScalingY = true
    } else {
      obj.selectable = obj._prevSelectable ?? true
      obj.evented = obj._prevEvented ?? true
      obj.lockMovementX = false
      obj.lockMovementY = false
      obj.lockRotation = false
      obj.lockScalingX = false
      obj.lockScalingY = false
    }
  })

  if (locked) {
    canvas.discardActiveObject()
    canvas.selection = false
  } else {
    canvas.selection = true
  }
  canvas.requestRenderAll()
}

// === 离屏生成遮罩（黑底白遮罩） ===
const getInpaintMaskOffscreen = async () => {
  const canvas = getCanvas()
  if (!canvas) return null

  const main = getMainImage()
  if (!main) return null

  const maskObjects = canvas.getObjects().filter(o => o.isMaskObject || o.type === 'path')
  if (maskObjects.length === 0) return null

  // 主图原始像素尺寸
  const src = main.getSrc()
  const { imgW, imgH } = await new Promise((resolve, reject) => {
    fabric.Image.fromURL(src, (img, isError) => {
      if (isError || !img) return reject(new Error('Failed to load main image for mask sizing'))
      resolve({ imgW: img.width, imgH: img.height })
    }, { crossOrigin: 'anonymous' })
  })

  // 主图画布包围盒（用于坐标映射）
  const rect = main.getBoundingRect(true, true)
  const scaleX = imgW / rect.width
  const scaleY = imgH / rect.height

  const tempCanvas = new fabric.StaticCanvas(null, {
    width: imgW,
    height: imgH,
    backgroundColor: 'black'
  })

  const clones = await Promise.all(maskObjects.map(obj => {
    return new Promise(resolve => {
      obj.clone((cloned) => {
        const left = (obj.left - rect.left) * scaleX
        const top = (obj.top - rect.top) * scaleY

        const objScaleX = (obj.scaleX || 1) * scaleX
        const objScaleY = (obj.scaleY || 1) * scaleY

        cloned.set({
          left,
          top,
          originX: obj.originX || 'left',
          originY: obj.originY || 'top',
          scaleX: objScaleX,
          scaleY: objScaleY,
          angle: obj.angle || 0,
          opacity: 1,
          visible: true,
          evented: false,
          selectable: false
        })

        // 白 = 消除区域
        if (cloned.type === 'path') {
          cloned.set({
            fill: null,
            stroke: 'white',
            strokeWidth: (obj.strokeWidth || brushSize.value) * scaleX
          })
        } else if (cloned.type === 'rect') {
          cloned.set({ fill: 'white', stroke: 'transparent' })
        } else {
          cloned.set({ fill: 'white', stroke: 'white' })
        }

        resolve(cloned)
      })
    })
  }))

  clones.forEach(c => tempCanvas.add(c))
  tempCanvas.renderAll()

  const dataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false })
  tempCanvas.dispose()

  return dataUrl
}

// === 进入/退出模块 ===
export const enterInpaintMode = () => {
  const canvas = getCanvas()
  if (!canvas) return

  if (initialSnapshot) return

  initialSnapshot = JSON.stringify(canvas.toJSON(['id', 'selectable', 'name', 'customTab', 'isMainImage', 'evented']))

  setObjectsLocked(true)
  drawMode.value = 'brush'
  enableBrush()
}

export const exitInpaintMode = () => {
  const canvas = getCanvas()
  if (!canvas) return

  if (autoInpaintTimer) clearTimeout(autoInpaintTimer)
  autoInpaintTimer = null

  unbindEvents()
  canvas.isDrawingMode = false
  setObjectsLocked(false)
  clearMaskObjects()
  canvas.defaultCursor = 'default'

  initialSnapshot = null
}

// === 模式切换 ===
const enableBrush = () => {
  const canvas = getCanvas()
  if (!canvas) return

  unbindEvents()
  canvas.isDrawingMode = true

  const brush = new fabric.PencilBrush(canvas)
  brush.color = 'rgba(255, 0, 0, 0.5)'
  brush.width = brushSize.value
  canvas.freeDrawingBrush = brush

  canvas.defaultCursor = 'crosshair'
  canvas.on('path:created', onPathCreated)
}

const enableRect = () => {
  const canvas = getCanvas()
  if (!canvas) return

  canvas.isDrawingMode = false
  unbindEvents()
  setObjectsLocked(true)
  canvas.defaultCursor = 'crosshair'

  canvas.on('mouse:down', onRectDown)
  canvas.on('mouse:move', onRectMove)
  canvas.on('mouse:up', onRectUp)
}

// === 事件处理 ===
const onPathCreated = (opt) => {
  const path = opt.path
  if (path) {
    path.excludeFromHistory = true
    path.isMaskObject = true
  }

  if (autoInpaintTimer) clearTimeout(autoInpaintTimer)
  autoInpaintTimer = setTimeout(() => executeInpaint(), 1000)
}

const onRectDown = (opt) => {
  const canvas = getCanvas()
  if (!canvas) return

  if (opt.target && !opt.target.isMaskObject) return

  const pointer = canvas.getPointer(opt.e)
  isDragging = true
  startPoint = { x: pointer.x, y: pointer.y }

  activeRect = new fabric.Rect({
    left: startPoint.x,
    top: startPoint.y,
    width: 0,
    height: 0,
    fill: 'rgba(255, 0, 0, 0.5)',
    stroke: 'transparent',
    selectable: false,
    evented: false,
    isMaskObject: true,
    excludeFromHistory: true
  })

  canvas.add(activeRect)
}

const onRectMove = (opt) => {
  if (!isDragging || !activeRect) return
  const canvas = getCanvas()
  const pointer = canvas.getPointer(opt.e)

  const w = Math.abs(pointer.x - startPoint.x)
  const h = Math.abs(pointer.y - startPoint.y)

  if (pointer.x < startPoint.x) activeRect.set({ left: pointer.x })
  if (pointer.y < startPoint.y) activeRect.set({ top: pointer.y })

  activeRect.set({ width: w, height: h })
  canvas.requestRenderAll()
}

const onRectUp = () => {
  const canvas = getCanvas()
  isDragging = false

  if (activeRect && (activeRect.width < 5 || activeRect.height < 5)) {
    canvas.remove(activeRect)
  } else {
    executeInpaint()
  }

  activeRect = null
}

const unbindEvents = () => {
  const canvas = getCanvas()
  if (!canvas) return
  canvas.off('path:created', onPathCreated)
  canvas.off('mouse:down', onRectDown)
  canvas.off('mouse:move', onRectMove)
  canvas.off('mouse:up', onRectUp)
}

// === 核心执行逻辑 ===
const executeInpaint = async () => {
  const canvas = getCanvas()
  if (!canvas) return
  if (isExecuting) return

  const hasContent = canvas.getObjects().some(o => o.isMaskObject || o.type === 'path')
  if (!hasContent) return

  const main = getMainImage()
  if (!main) {
    toast.error('未找到主图 (id=main-image)')
    return
  }

  const { setLoading } = useEditorState()

  isExecuting = true
  try {
    setLoading(true, '正在消除...')

    const imageBlob = await exportMainImageBlob()

    const maskBase64 = await getInpaintMaskOffscreen()
    if (!maskBase64) {
      setLoading(false)
      isExecuting = false
      return
    }
    const maskBlob = await dataURLToBlob(maskBase64)

    const res = await inpaintFetch({
      imageBlob,
      maskBlob,
      prompt: 'remove the object',
      sdSeed: -1
    })

    // ⚠️ 关键修复：不要把 blob: URL 回填为主图 src（容易在二次消除时失效）
    // 直接使用 dataUrl 回填，可稳定支持“第二次/多次 inpaint”。
    await new Promise((resolve, reject) => {
      main.setSrc(res.dataUrl, () => {
        try {
          clearMaskObjects()
          setObjectsLocked(true)

          if (saveHistoryFn) saveHistoryFn()
          toast.success('消除完成')
          canvas.requestRenderAll()
          canvas.fire('image:updated')

          resolve()
        } catch (e) {
          reject(e)
        }
      }, { crossOrigin: 'anonymous' })
    })

    setLoading(false)
  } catch (error) {
    console.error('[Inpaint] error:', error)
    toast.error(`消除失败：${error?.message || '请重试'}`)
    clearMaskObjects()
    setLoading(false)
  } finally {
    isExecuting = false
  }
}

const clearMaskObjects = () => {
  const canvas = getCanvas()
  if (!canvas) return
  const masks = canvas.getObjects().filter(o => o.isMaskObject || o.type === 'path')
  canvas.remove(...masks)
  canvas.requestRenderAll()
}

// === 恢复原图 ===
export const handleRestoreOriginal = () => {
  const canvas = getCanvas()
  if (!canvas || !initialSnapshot) return

  canvas.loadFromJSON(initialSnapshot, () => {
    setObjectsLocked(true)
    if (drawMode.value === 'brush') enableBrush()
    else enableRect()

    if (saveHistoryFn) saveHistoryFn()
    canvas.fire('image:updated')
    toast.success('已恢复至初始状态')
  })
}

watch(drawMode, (newMode) => {
  if (newMode === 'brush') enableBrush()
  else enableRect()
})

watch(brushSize, (val) => {
  const canvas = getCanvas()
  if (canvas && canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.width = val
  }
})
