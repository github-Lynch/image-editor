import { fabric } from 'fabric';

/**
 * 通用：高保真离屏渲染器
 * 增强版：增加了错误处理和基础状态同步
 */
export const renderHighResSnapshot = (originalImageObj, targetWidth, targetHeight, transformCallback) => {
    return new Promise((resolve, reject) => {
        const originalSrc = originalImageObj.getSrc();

        const tempCanvas = new fabric.StaticCanvas(null, {
            width: targetWidth,
            height: targetHeight,
            backgroundColor: 'transparent'
        });

        fabric.Image.fromURL(originalSrc, (highResImg, isError) => {
            if (isError) {
                tempCanvas.dispose();
                reject(new Error(`Failed to load image: ${originalSrc}`));
                return;
            }

            // 1. 自动同步滤镜（如果原图有滤镜）
            if (originalImageObj.filters && originalImageObj.filters.length > 0) {
                highResImg.filters = [...originalImageObj.filters];
                highResImg.applyFilters();
            }

            // 2. 执行变换
            if (transformCallback) {
                transformCallback(highResImg, tempCanvas);
            } else {
                // 默认 Cover 逻辑
                const scale = Math.max(targetWidth / highResImg.width, targetHeight / highResImg.height);
                highResImg.set({
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                    left: targetWidth / 2,
                    top: targetHeight / 2
                });
            }

            tempCanvas.add(highResImg);
            tempCanvas.renderAll();

            // 3. 导出并清理
            try {
                const dataURL = tempCanvas.toDataURL({ 
                    format: 'png', 
                    quality: 1,
                    enableRetinaScaling: false // 离屏渲染通常不需要视网膜缩放
                });
                resolve(dataURL);
            } catch (err) {
                reject(err);
            } finally {
                tempCanvas.dispose();
            }
        }, { crossOrigin: 'anonymous' });
    });
};