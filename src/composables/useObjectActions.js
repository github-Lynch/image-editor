import { inject, unref, reactive, readonly } from 'vue';
import { toast } from '@/utils/toast'; 

// 1. 定义全局剪贴板状态 (放在函数外，保证跨组件共享)
const clipboardState = reactive({
    hasContent: false, 
    data: null         
});

export function useObjectActions() {
    const canvasAPI = inject('canvasAPI');
    
    const getContext = () => {
        const canvas = unref(canvasAPI?.canvas);
        const activeObj = canvas?.getActiveObject();
        return { canvas, activeObj };
    };

    // === 1. 删除 ===
    const deleteActive = () => {
        const { canvas, activeObj } = getContext();
        if (!canvas || !activeObj) return;
        
        if (activeObj.type === 'activeSelection') {
            activeObj.forEachObject(obj => canvas.remove(obj));
            canvas.discardActiveObject();
        } else {
            canvas.remove(activeObj);
        }
        canvas.requestRenderAll();
        canvasAPI.saveHistory && canvasAPI.saveHistory();
    };

    // === 2. 复制 ===
    const copyActive = () => {
        const { activeObj } = getContext();
        if (!activeObj) return;
        
        activeObj.clone((cloned) => {
            // 存入全局状态
            clipboardState.data = cloned;
            clipboardState.hasContent = true; 
            toast.success('已复制');
        });
    };

    // === 3. 剪切 ===
    const cutActive = () => {
        const { canvas, activeObj } = getContext();
        if (!activeObj) return;
        
        activeObj.clone((cloned) => {
            clipboardState.data = cloned;
            clipboardState.hasContent = true;
            
            // 复制后删除原对象
            if (activeObj.type === 'activeSelection') {
                activeObj.forEachObject(obj => canvas.remove(obj));
                canvas.discardActiveObject();
            } else {
                canvas.remove(activeObj);
            }
            canvas.requestRenderAll();
            canvasAPI.saveHistory && canvasAPI.saveHistory();
            toast.success('已剪切');
        });
    };

    // === 4. 粘贴 (核心修改逻辑) ===
    const pasteActive = (point = null) => {
        // 从全局状态读取
        if (!clipboardState.data) {
            return;
        }

        const { canvas } = getContext();
        if (!canvas) return;

        clipboardState.data.clone((clonedObj) => {
            canvas.discardActiveObject();

            clonedObj.set({
                evented: true,
            });

            if (point) {
                // 情况 A: 右键定点粘贴
                clonedObj.set({
                    left: point.x,
                    top: point.y,
                    originX: 'left',
                    originY: 'top',
                });
            } else {
                // 情况 B: 键盘快捷键粘贴 (自动偏移)
                clonedObj.set({
                    left: clonedObj.left + 20,
                    top: clonedObj.top + 20,
                    originX: 'left',
                    originY: 'top',
                });
            }

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
            }
            
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            canvasAPI.saveHistory && canvasAPI.saveHistory();
            
            // 更新剪贴板引用，支持连续粘贴
            clipboardState.data = clonedObj; 
        });
    };

    // === 5. 锁定/解锁 ===
    const toggleLock = () => {
        const { canvas, activeObj } = getContext();
        if (!activeObj) return;

        const isLocked = !activeObj.lockMovementX;
        
        activeObj.set({
            lockMovementX: isLocked,
            lockMovementY: isLocked,
            lockRotation: isLocked,
            lockScalingX: isLocked,
            lockScalingY: isLocked
        });

        if (isLocked) {
             activeObj.selectable = true; 
             toast.success('对象已锁定');
        } else {
             toast.success('对象已解锁');
        }
        
        canvas.requestRenderAll();
        canvasAPI.saveHistory && canvasAPI.saveHistory();
        return isLocked;
    };

    // === 6. 图层调整 (保留所有逻辑) ===
    const moveLayer = (direction) => {
        const { canvas, activeObj } = getContext();
        if (!activeObj) return;

        const objects = canvas.getObjects();
        // 查找主图位置，确保不覆盖主图
        const mainImgIndex = objects.findIndex(o => o.isMainImage);
        const floorIndex = mainImgIndex >= 0 ? mainImgIndex + 1 : 0;
        const currentIndex = objects.indexOf(activeObj);

        switch (direction) {
            case 'front': 
                activeObj.bringToFront(); 
                break;
            case 'back': 
                if (currentIndex > floorIndex) activeObj.moveTo(floorIndex);
                break;
            case 'forward': 
                activeObj.bringForward(); 
                break;
            case 'backward': 
                if (currentIndex > floorIndex) {
                    activeObj.sendBackwards();
                    // 防止被送到底图下面
                    const newIndex = canvas.getObjects().indexOf(activeObj);
                    if (newIndex <= mainImgIndex && mainImgIndex !== -1) {
                         activeObj.moveTo(floorIndex);
                    }
                }
                break;
        }
        canvas.requestRenderAll();
        canvasAPI.saveHistory && canvasAPI.saveHistory();
    };

    return {
        clipboardState: readonly(clipboardState),
        deleteActive,
        copyActive,
        cutActive,
        pasteActive,
        toggleLock,
        moveLayer
    };
}