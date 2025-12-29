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
    shadowOffsetY: 0,

    // === 文字特效（配置驱动）===
    // textEffectId: 当前选中的特效 ID（仅用于 UI 回显 + 新增文本默认样式）
    // 注意：真实生效的 Fabric 属性仍由 fill/stroke/shadow 等承载
    textEffectId: 'none'
});

// 模块内部引用
let canvasRef = null;
let saveHistoryFn = null;

// 缩放过程缓存（避免频繁改写历史；并在 modified 时一次性落地）
let scalingCache = null;

// === 配置池：文字特效 (Configuration-Driven) ===
// 说明：
// 1) 这里的每个 effect 都是“属性集合”，用于一键应用到 Fabric 文本对象。
// 2) UI 预览使用同一份配置源，确保 SSOT。
// 3) effect.props 里只放“特效相关属性”，不会覆盖字体/字号/对齐等基础排版（符合你选择的 2:A）。
const TEXT_EFFECTS = {
    none: {
        id: 'none',
        label: '无',
        props: {
            // 清除描边与阴影
            strokeWidth: 0,
            stroke: '',
            shadow: undefined
        }
    },
    outlineBlue: {
        id: 'outlineBlue',
        label: '蓝色描边',
        props: {
            fill: '#ffffff',
            stroke: '#22b8ff',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlineGreen: {
        id: 'outlineGreen',
        label: '绿色描边',
        props: {
            fill: '#ffffff',
            stroke: '#2f9e44',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    neonCyan: {
        id: 'neonCyan',
        label: '青色霓虹',
        props: {
            fill: '#00e5ff',
            stroke: '#000000',
            strokeWidth: 2,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 229, 255, 0.75)',
                blur: 12,
                offsetX: 0,
                offsetY: 0
            })
        }
    },
    neonPink: {
        id: 'neonPink',
        label: '粉色霓虹',
        props: {
            fill: '#ff4d8d',
            stroke: '#7c3aed',
            strokeWidth: 2,
            shadow: new fabric.Shadow({
                color: 'rgba(255, 77, 141, 0.65)',
                blur: 12,
                offsetX: 0,
                offsetY: 0
            })
        }
    },
    blackYellow: {
        id: 'blackYellow',
        label: '黄底黑边',
        props: {
            fill: '#ffd43b',
            stroke: '#000000',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    greenShadow: {
        id: 'greenShadow',
        label: '绿色阴影',
        props: {
            fill: '#2f9e44',
            stroke: '#000000',
            strokeWidth: 2,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.45)',
                blur: 6,
                offsetX: 4,
                offsetY: 4
            })
        }
    },

    // === 新增模板：模仿参考图的“彩色描边”系列 ===
    outlinePink: {
        id: 'outlinePink',
        label: '粉色描边',
        props: {
            fill: '#ffffff',
            stroke: '#ff5c8a',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlinePurple: {
        id: 'outlinePurple',
        label: '紫色描边',
        props: {
            fill: '#ffffff',
            stroke: '#5f3dc4',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlineOrange: {
        id: 'outlineOrange',
        label: '橙色描边',
        props: {
            fill: '#ffffff',
            stroke: '#ff7a18',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlineBlueFill: {
        id: 'outlineBlueFill',
        label: '蓝字蓝边',
        props: {
            fill: '#4c6ef5',
            stroke: '#ffffff',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlineGreenFill: {
        id: 'outlineGreenFill',
        label: '绿字黑边',
        props: {
            fill: '#37b24d',
            stroke: '#000000',
            strokeWidth: 2,
            shadow: undefined
        }
    },
    outlineCyanFill: {
        id: 'outlineCyanFill',
        label: '青字黑边',
        props: {
            fill: '#22b8cf',
            stroke: '#000000',
            strokeWidth: 2,
            shadow: undefined
        }
    },

    // === 新增模板：更强烈的“黑边亮色字”系列 ===
    blackOutlineCyan: {
        id: 'blackOutlineCyan',
        label: '青字黑边',
        props: {
            fill: '#00f5ff',
            stroke: '#000000',
            strokeWidth: 3,
            shadow: undefined
        }
    },
    blackOutlinePink: {
        id: 'blackOutlinePink',
        label: '粉字黑边',
        props: {
            fill: '#ff4d8d',
            stroke: '#000000',
            strokeWidth: 3,
            shadow: undefined
        }
    },
    blackOutlineLime: {
        id: 'blackOutlineLime',
        label: '荧光绿黑边',
        props: {
            fill: '#a9e34b',
            stroke: '#000000',
            strokeWidth: 3,
            shadow: undefined
        }
    },

    // === 新增模板：轻微投影（更接近图中“干净但有层次”） ===
    outlineBlueSoftShadow: {
        id: 'outlineBlueSoftShadow',
        label: '蓝边轻阴影',
        props: {
            fill: '#ffffff',
            stroke: '#22b8ff',
            strokeWidth: 2,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.25)',
                blur: 4,
                offsetX: 2,
                offsetY: 2
            })
        }
    },
    outlineOrangeSoftShadow: {
        id: 'outlineOrangeSoftShadow',
        label: '橙边轻阴影',
        props: {
            fill: '#ffffff',
            stroke: '#ff7a18',
            strokeWidth: 2,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.25)',
                blur: 4,
                offsetX: 2,
                offsetY: 2
            })
        }
    }
};

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
            // 新增文本默认不加粗（需求：新增文本默认不加粗）
            // 注意：面板里仍可手动切换加粗；这里只影响“新增时的默认值”
            fontWeight: 'normal',
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
            cornerSize: 10,

            // 记录当前特效（用于选中回显）
            textEffectId: textState.value.textEffectId
        });

        c.add(textObj).setActiveObject(textObj).requestRenderAll();
        
        // 新增后：如果当前选择的特效带阴影，但 shadowBlur/offset 为 0 时不会创建 shadow
        // 这里无需额外处理，因为 applyTextEffect 已把默认值折算到 textState 中。

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

            // 同步特效ID（用于 UI 回显）
            // 优先读取对象上记录的 textEffectId；若不存在，则尝试用当前属性匹配预设
            if (selected.textEffectId) {
                textState.value.textEffectId = selected.textEffectId;
            } else {
                const matchedEffect = Object.values(TEXT_EFFECTS).find(effect => {
                    if (!effect || effect.id === 'none') return false;
                    return isEffectMatched(selected, effect);
                });
                textState.value.textEffectId = matchedEffect ? matchedEffect.id : 'none';
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

    // === 工具函数：判断对象当前属性是否匹配指定特效 ===
    const isEffectMatched = (textObj, effect) => {
        if (!effect || !effect.props) return false;
        const props = effect.props;
        
        // 检查描边
        if (props.strokeWidth !== undefined && textObj.strokeWidth !== props.strokeWidth) return false;
        if (props.stroke && textObj.stroke !== props.stroke) return false;
        
        // 检查填充色
        if (props.fill && textObj.fill !== props.fill) return false;
        
        // 检查阴影
        if (props.shadow) {
            if (!textObj.shadow) return false;
            const shadow = props.shadow;
            if (shadow.color !== textObj.shadow.color) return false;
            if (shadow.blur !== textObj.shadow.blur) return false;
            if (shadow.offsetX !== textObj.shadow.offsetX) return false;
            if (shadow.offsetY !== textObj.shadow.offsetY) return false;
        } else if (textObj.shadow) {
            // 特效无阴影但对象有阴影
            return false;
        }
        
        return true;
    };

    // === 核心：应用文字特效 ===
    const applyTextEffect = (effectId) => {
        const c = unref(canvasRef);
        const activeObj = c?.getActiveObject();

        const effect = TEXT_EFFECTS[effectId];
        if (!effect) return;

        // 1) 永远先更新“默认样式缓存”（未选中文本也能选择特效）
        textState.value.textEffectId = effectId;

        const props = effect.props || {};

        // 用于新增文本：把特效折算进 textState 的“默认属性”中
        // 注意：shadow 必须按 Fabric 的真实对象逻辑处理，否则 UI 预览会和画布不一致
        if (props.fill !== undefined) textState.value.fill = props.fill;
        if (props.stroke !== undefined) textState.value.stroke = props.stroke;
        if (props.strokeWidth !== undefined) textState.value.strokeWidth = props.strokeWidth;

        if (props.shadow) {
            // 这里 props.shadow 是 fabric.Shadow 实例
            textState.value.shadowColor = props.shadow.color;
            textState.value.shadowBlur = props.shadow.blur;
            textState.value.shadowOffsetX = props.shadow.offsetX;
            textState.value.shadowOffsetY = props.shadow.offsetY;
        } else {
            // 选择了“无特效/无阴影”等：清空 shadow 相关默认值
            textState.value.shadowBlur = 0;
            textState.value.shadowOffsetX = 0;
            textState.value.shadowOffsetY = 0;
            textState.value.shadowColor = '#ffffff';
        }

        // 2) 若当前有选中文本对象，则同步应用到对象本身
        if (!activeObj || !activeObj.type.includes('text')) {
            return;
        }

        // Fabric 中 shadow 需要重新 new fabric.Shadow，避免引用被复用导致渲染不一致
        const finalProps = { ...props };
        if (props.shadow) {
            finalProps.shadow = new fabric.Shadow({
                color: props.shadow.color,
                blur: props.shadow.blur,
                offsetX: props.shadow.offsetX,
                offsetY: props.shadow.offsetY
            });
        }

        activeObj.set({
            ...finalProps,
            textEffectId: effectId
        });

        c.requestRenderAll();
        if (saveHistoryFn) saveHistoryFn();
    };
    
    // === 重置文字特效 ===
    const resetTextEffect = () => {
        // 仅重置“特效相关属性”，不影响字体字号等
        applyTextEffect('none');
    };
    
    // === 获取特效预览样式 ===
    const getTextEffectPreviewStyle = (effectId) => {
        const effect = TEXT_EFFECTS[effectId];
        if (!effect) return {};
        
        const style = {
            color: effect.props.fill || '#ffffff',
            WebkitTextStroke: effect.props.strokeWidth ? `${effect.props.strokeWidth}px ${effect.props.stroke || 'transparent'}` : 'none',
            textShadow: effect.props.shadow 
                ? `${effect.props.shadow.offsetX || 0}px ${effect.props.shadow.offsetY || 0}px ${effect.props.shadow.blur || 0}px ${effect.props.shadow.color}` 
                : 'none'
        };
        
        return style;
    };

    return {
        textState, 
        textEffects: TEXT_EFFECTS,
        initTextModule, 
        destroyTextModule,
        addText, 
        updateTextProp, 
        toggleStyle,
        applyTextEffect,
        resetTextEffect,
        getTextEffectPreviewStyle,
        isEffectMatched
    };
}
