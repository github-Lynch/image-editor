import { ref, unref } from 'vue';
import { fabric } from 'fabric';

// === 单例状态 (SSOT) ===
// 说明：textState 同时承担两种职责：
// 1) 选中已有文本时：作为“属性面板”的实时镜像
// 2) 未选中文本时：作为“新增文本默认样式”的缓存
const textState = ref({
    isActive: false,
    fontFamily: 'Arial',
    fontSize: 40,
    fill: '#ffffff',
    textAlign: 'left',
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    linethrough: false,
    // --- 新增功能点 ---
    charSpacing: 0,
    lineHeight: 1.16,
    angle: 0,
    textBackgroundColor: '',
    stroke: '#ffffff',
    strokeWidth: 0,
    shadowColor: '#ffffff',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
});

// 模块内部引用
let canvasRef = null;
let saveHistoryFn = null;

// 缩放过程缓存（避免频繁改写历史；并在 modified 时一次性落地）
let scalingCache = null;

// 配置池：文本“防变形缩放”参数（避免硬编码散落）
const TEXT_SCALE_GUARD = {
    minFontSize: 4,
    maxFontSize: 500,
    // Textbox 横向最小宽度，防止被压成一条线
    minTextboxWidth: 10
};

export function useCanvasText() {

    const isTextObject = (obj) => {
        return !!obj && typeof obj.type === 'string' && obj.type.includes('text');
    };

    const clamp = (num, min, max) => {
        return Math.max(min, Math.min(max, num));
    };

    /**
     * ✅ 防变形策略 (Option B)：
     * - 横向拖动：改变文本框宽度（仅对 Textbox 生效）
     * - 纵向拖动：改变 fontSize
     * - 最终把 scaleX/scaleY 归一回 1，避免字形被拉伸
     */
    const handleTextScaling = (e) => {
        const c = unref(canvasRef);
        const obj = e?.target;
        if (!c || !isTextObject(obj)) return;

        // 初始化缩放基线（第一次进入缩放时记录）
        if (!scalingCache || scalingCache.id !== obj.__uid) {
            // 给对象一个稳定 id（不入 JSON 也没关系，仅用于本次缩放会话）
            if (!obj.__uid) obj.__uid = `text_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            scalingCache = {
                id: obj.__uid,
                baseFontSize: obj.fontSize || 40,
                baseWidth: obj.width || 0,
                baseScaleX: obj.scaleX || 1,
                baseScaleY: obj.scaleY || 1,
                // --- 新增：缓存初始中心点 --- 
                baseLeft: obj.left,
                baseTop: obj.top
            };
        }

        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;

        // 1) 横向：TextBox 用 width 来承接横向变化
        if (obj.type === 'textbox') {
            const baseW = scalingCache.baseWidth || obj.width || 0;
            if (baseW > 0) {
                const nextWidth = Math.max(TEXT_SCALE_GUARD.minTextboxWidth, baseW * scaleX);
                obj.set('width', nextWidth);
            }
        }

        // 2) 纵向：用 fontSize 承接纵向变化
        const nextFontSize = clamp(
            (scalingCache.baseFontSize || obj.fontSize || 40) * scaleY,
            TEXT_SCALE_GUARD.minFontSize,
            TEXT_SCALE_GUARD.maxFontSize
        );
        obj.set('fontSize', nextFontSize);

        // 3) 归一缩放
        obj.set({ scaleX: 1, scaleY: 1 });

        // --- 新增：强制校正中心点，抵消 originX/Y: 'center' 带来的位移 ---
        if (scalingCache) {
            obj.set({
                left: scalingCache.baseLeft,
                top: scalingCache.baseTop
            });
        }

        obj.setCoords();
        c.requestRenderAll();
    };

    const handleTextModified = (e) => {
        const c = unref(canvasRef);
        const obj = e?.target;
        if (!c || !isTextObject(obj)) return;

        // 同步 UI 状态（避免缩放后面板数值不同步）
        textState.value.fontSize = obj.fontSize;

        scalingCache = null;
    };

    const initTextModule = (canvas, saveHistory) => {
        canvasRef = canvas;
        saveHistoryFn = saveHistory;
        const c = unref(canvasRef);
        if (!c) return;

        c.on('selection:created', handleSelection);
        c.on('selection:updated', handleSelection);
        c.on('selection:cleared', clearSelection);

        c.on('object:scaling', handleTextScaling);
        c.on('object:modified', handleTextModified);
    };

    const destroyTextModule = () => {
        const c = unref(canvasRef);
        if (!c) return;
        c.off('selection:created', handleSelection);
        c.off('selection:updated', handleSelection);
        c.off('selection:cleared', clearSelection);

        c.off('object:scaling', handleTextScaling);
        c.off('object:modified', handleTextModified);

        scalingCache = null;
    };

    const addText = (textStr = "双击编辑") => {
        const c = unref(canvasRef);
        if (!c) return;

        // --- 新增：计算默认位置 --- 
        let centerX, centerY;
        const mainImage = c.getObjects().find(obj => obj.isMainImage);

        if (mainImage) {
            // 方案A：主图中心
            centerX = mainImage.left + (mainImage.width * mainImage.scaleX) / 2;
            centerY = mainImage.top + (mainImage.height * mainImage.scaleY) / 2;
        } else {
            // 方案B：画布视口中心 (Fallback)
            const center = c.getCenter();
            centerX = center.left;
            centerY = center.top;
        }

        // ✅ 使用 textState 作为“默认样式”来源
        const textObj = new fabric.Textbox(textStr, {
            // left: 100, // 已删除
            // top: 100, // 已删除
            left: centerX, // 新增
            top: centerY, // 新增
            originX: 'center', // 新增
            originY: 'center', // 新增
            width: 300,

            fontFamily: textState.value.fontFamily,
            fontSize: textState.value.fontSize,
            fill: textState.value.fill,
            textAlign: textState.value.textAlign,
            fontWeight: textState.value.fontWeight,
            fontStyle: textState.value.fontStyle,
            underline: textState.value.underline,
            linethrough: textState.value.linethrough,

            charSpacing: textState.value.charSpacing,
            lineHeight: textState.value.lineHeight,
            angle: textState.value.angle,
            textBackgroundColor: textState.value.textBackgroundColor,
            stroke: textState.value.stroke,
            strokeWidth: textState.value.strokeWidth,

            // shadow 需要用 fabric.Shadow
            shadow: (textState.value.shadowBlur || textState.value.shadowOffsetX || textState.value.shadowOffsetY)
                ? new fabric.Shadow({
                    color: textState.value.shadowColor,
                    blur: textState.value.shadowBlur,
                    offsetX: textState.value.shadowOffsetX,
                    offsetY: textState.value.shadowOffsetY
                })
                : undefined,

            customTab: 'text',
            transparentCorners: false,
            cornerColor: '#ffffff',
            cornerStrokeColor: '#1890ff',
            borderColor: '#1890ff',
            cornerSize: 10
        });

        c.add(textObj).setActiveObject(textObj).requestRenderAll();
        if (saveHistoryFn) saveHistoryFn();
    };

    // --- 核心属性更新逻辑 ---
    // 新规则：
    // - 未选中文本时：仅更新 textState（作为“默认样式”缓存），不触发画布变更
    // - 选中文本时：同时更新 activeObj 并按 shouldSave 控制历史
    const updateTextProp = (key, value, shouldSave = true) => {
        const c = unref(canvasRef);
        const activeObj = c?.getActiveObject();

        // 1) 永远先同步 UI 状态（支持“未选中文本也可调整默认样式”）
        textState.value[key] = value;

        // 2) 若未选中文本对象，则不触发画布更新
        if (!activeObj || !activeObj.type.includes('text')) {
            return;
        }

        // 3) 处理特殊复合属性：阴影
        if (['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'].includes(key)) {
            const currentShadow = activeObj.shadow
                ? { ...activeObj.shadow }
                : { color: '#ffffff', blur: 0, offsetX: 0, offsetY: 0 };
            const shadowMap = {
                shadowColor: 'color',
                shadowBlur: 'blur',
                shadowOffsetX: 'offsetX',
                shadowOffsetY: 'offsetY'
            };
            currentShadow[shadowMap[key]] = value;
            activeObj.set('shadow', new fabric.Shadow(currentShadow));
        }
        // 处理背景色 (空字符串代表透明)
        else if (key === 'textBackgroundColor' && !value) {
            activeObj.set(key, '');
        }
        else {
            activeObj.set(key, value);
        }

        c.requestRenderAll();
        if (shouldSave && saveHistoryFn) saveHistoryFn();
    };

    const handleSelection = (e) => {
        const selected = e.selected?.[0] || unref(canvasRef)?.getActiveObject();
        if (selected && selected.type.includes('text')) {
            textState.value.isActive = true;

            // 批量同步属性
            const props = [
                'fontFamily', 'fontSize', 'fill', 'textAlign',
                'fontWeight', 'fontStyle', 'underline', 'linethrough',
                'charSpacing', 'lineHeight', 'angle', 'textBackgroundColor',
                'stroke', 'strokeWidth'
            ];
            props.forEach(p => textState.value[p] = selected[p]);

            // 阴影特殊解析
            if (selected.shadow) {
                textState.value.shadowColor = selected.shadow.color;
                textState.value.shadowBlur = selected.shadow.blur;
                textState.value.shadowOffsetX = selected.shadow.offsetX;
                textState.value.shadowOffsetY = selected.shadow.offsetY;
            }
        } else {
            textState.value.isActive = false;
        }
    };

    const clearSelection = () => { textState.value.isActive = false; };

    const toggleStyle = (key) => {
        if (key === 'bold') {
            const isBold = textState.value.fontWeight === 'bold';
            updateTextProp('fontWeight', isBold ? 'normal' : 'bold');
        } else if (key === 'italic') {
            const isItalic = textState.value.fontStyle === 'italic';
            updateTextProp('fontStyle', isItalic ? 'normal' : 'italic');
        } else {
            updateTextProp(key, !textState.value[key]);
        }
    };

    return {
        textState, initTextModule, destroyTextModule,
        addText, updateTextProp, toggleStyle
    };
}
