import { ref, unref } from 'vue';
import { fabric } from 'fabric';

// === 单例状态 (SSOT) ===
const textState = ref({
    isActive: false,
    fontFamily: 'Arial',
    fontSize: 40,
    fill: '#333333',
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
    stroke: '#000000',
    strokeWidth: 0,
    shadowColor: '#000000',
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
     *
     * 注意：Fabric 的 `object:scaling` 会被高频触发。
     * 我们只做视觉跟随（实时归一缩放），历史保存统一放到 `object:modified`。
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
                baseScaleY: obj.scaleY || 1
            };
        }

        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;

        // 1) 横向：TextBox 用 width 来承接横向变化；IText 没有“文本框换行语义”，跳过 width 策略
        if (obj.type === 'textbox') {
            const baseW = scalingCache.baseWidth || obj.width || 0;
            if (baseW > 0) {
                const nextWidth = Math.max(TEXT_SCALE_GUARD.minTextboxWidth, baseW * scaleX);
                obj.set('width', nextWidth);
            }
        }

        // 2) 纵向：用 fontSize 承接纵向变化（IText / Textbox 都适用）
        const nextFontSize = clamp(
            (scalingCache.baseFontSize || obj.fontSize || 40) * scaleY,
            TEXT_SCALE_GUARD.minFontSize,
            TEXT_SCALE_GUARD.maxFontSize
        );
        obj.set('fontSize', nextFontSize);

        // 3) 归一缩放，防止字形被非等比拉伸
        obj.set({ scaleX: 1, scaleY: 1 });

        obj.setCoords();
        c.requestRenderAll();
    };

    /**
     * 缩放结束：落地一次历史（由 useCanvas 的 object:modified 也会保存，但这里确保文本内部状态一致）
     */
    const handleTextModified = (e) => {
        const c = unref(canvasRef);
        const obj = e?.target;
        if (!c || !isTextObject(obj)) return;

        // 同步 UI 状态（避免缩放后面板数值不同步）
        textState.value.fontSize = obj.fontSize;

        // 缩放会话结束，释放缓存
        scalingCache = null;

        // 这里不强制 saveHistory，避免与 useCanvas 全局 object:modified 重复入栈。
        // 如果你未来将全局保存逻辑对 text 做了豁免，可再在此处打开。
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
        const textObj = new fabric.Textbox(textStr, {
            left: 100, top: 100,
            width: 300, // ✅ Textbox 需要明确宽度，横向拖拽才有“拉伸文本框/换行”语义
            fontSize: 40,
            fill: '#333333',
            fontFamily: 'Arial',
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
    const updateTextProp = (key, value, shouldSave = true) => {
        const c = unref(canvasRef);
        const activeObj = c?.getActiveObject();
        if (!activeObj || !activeObj.type.includes('text')) return;

        // 1. 处理特殊复合属性：阴影
        if (['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'].includes(key)) {
            const currentShadow = activeObj.shadow ? { ...activeObj.shadow } : { color: '#000000', blur: 0, offsetX: 0, offsetY: 0 };
            const shadowMap = {
                shadowColor: 'color',
                shadowBlur: 'blur',
                shadowOffsetX: 'offsetX',
                shadowOffsetY: 'offsetY'
            };
            currentShadow[shadowMap[key]] = value;
            activeObj.set('shadow', new fabric.Shadow(currentShadow));
        }
        // 2. 处理背景色 (空字符串代表透明)
        else if (key === 'textBackgroundColor' && !value) {
            activeObj.set(key, '');
        }
        // 3. 通用属性处理
        else {
            activeObj.set(key, value);
        }

        // 同步 UI 状态
        textState.value[key] = value;

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
