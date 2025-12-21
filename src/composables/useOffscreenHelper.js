import { fabric } from 'fabric';

/**
 * 通用：高保真离屏渲染器
 * @param {fabric.Image} originalImageObj 画布上的源图片对象（用于获取原图 URL 和当前状态）
 * @param {Number} targetWidth 目标导出宽度
 * @param {Number} targetHeight 目标导出高度
 * @param {Function} transformCallback 回调函数，让你在离屏 canvas 上调整图片参数
 * @returns {Promise<string>} 返回生成的 Base64
 */
export const renderHighResSnapshot = (originalImageObj, targetWidth, targetHeight, transformCallback) => {
    return new Promise((resolve) => {
        const originalSrc = originalImageObj.getSrc();

        // 1. 创建离屏画布
        const tempCanvas = new fabric.StaticCanvas(null, {
            width: targetWidth,
            height: targetHeight,
            backgroundColor: 'transparent'
        });

        // 2. 加载原图（避免使用缓存的缩略图）
        fabric.Image.fromURL(originalSrc, (highResImg) => {

            // 3. 执行调用者的自定义变换逻辑
            if (transformCallback) {
                transformCallback(highResImg, tempCanvas);
            } else {
                // 默认行为：居中填满
                highResImg.set({
                    originX: 'center', originY: 'center',
                    left: targetWidth / 2, top: targetHeight / 2
                });
                // 简单的 Cover 逻辑...
            }

            tempCanvas.add(highResImg);
            tempCanvas.renderAll();

            // 4. 导出
            const dataURL = tempCanvas.toDataURL({ format: 'png', quality: 1 });

            // 5. 清理内存
            tempCanvas.dispose();

            resolve(dataURL);
        }, { crossOrigin: 'anonymous' });
    });
};