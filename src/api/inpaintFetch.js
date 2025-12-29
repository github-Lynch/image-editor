// src/api/inpaintFetch.js
// -------------------------------------------------------------
// 适配「大秘美图」项目的 Inpaint 调用封装
// 1) 使用环境变量作为后端地址，避免硬编码
// 2) 按后端要求发送 base64 字符串（无 dataURL 前缀）
// 3) 返回结果同时提供 dataUrl（推荐用于回填主图，避免 blob: 失效）
// -------------------------------------------------------------

import { toast } from '@/utils/toast'

// 后端基地址：优先读取环境变量，回退到本地默认地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * 将 Blob 转换为 base64 dataURL
 * @param {Blob} blob
 * @returns {Promise<string>} dataURL
 */
function blobToBase64 (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 调用 /api/v1/inpaint
 * @param {Object} p
 * @param {Blob} p.imageBlob - 原图 Blob
 * @param {Blob} p.maskBlob - 遮罩 Blob (白色为消除区域, 黑色为保留)
 * @param {string} [p.prompt]
 * @param {number} [p.sdSeed]
 * @returns {Promise<{blob: Blob, dataUrl: string, seed: string}>}
 */
export async function inpaintFetch ({ imageBlob, maskBlob, prompt = '', sdSeed = -1 }) {
  if (!imageBlob || !maskBlob) {
    throw new Error('ImageBlob & MaskBlob are required')
  }

  try {
    // 1) 将 Blob 转换为 base64 dataURL
    const [imageDataUrl, maskDataUrl] = await Promise.all([
      blobToBase64(imageBlob),
      blobToBase64(maskBlob)
    ])

    // 2) 提取纯 base64（移除 data:image/...;base64, 前缀）
    const imageBase64 = String(imageDataUrl).split(',')[1]
    const maskBase64 = String(maskDataUrl).split(',')[1]

    // 3) 发送请求（JSON）
    const res = await fetch(`${BASE_URL}/api/v1/inpaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        mask: maskBase64,
        prompt,
        sd_seed: sdSeed
      })
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Inpaint failed: ${res.status} ${text}`)
    }

    // 4) 返回 Blob，同时转成 dataUrl（用于下一次继续 inpaint，避免 blob: 被 revoke/失效）
    const blob = await res.blob()
    const dataUrl = await blobToBase64(blob)

    return {
      blob,
      dataUrl,
      seed: res.headers.get('X-Seed') || `${Date.now()}`
    }
  } catch (err) {
    console.error('[inpaintFetch] error:', err)
    toast.error('AI 消除失败，请稍后重试')
    throw err
  }
}
