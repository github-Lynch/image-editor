// src/config/theme.js

/**
 * 🎨 Design Token Source (Single Source of Truth)
 * 供 Canvas (JS) 和 UI (CSS) 共同使用
 */
export const THEME = {
    colors: {
        // 品牌色 (对应 style.css 中的 --ie-primary-color)
        primary: '#409eff',
        primaryHover: '#66b1ff',

        // 基础色
        bg: '#242424',            // 画布背景
        panel: '#1e1e1e',         // 工具栏背景 (如果你需要区分的话)
        text: '#333',
        border: '#dcdfe6',

        // Canvas 交互专用 (JS 读取)
        selectionBorder: '#409eff',
        selectionFill: 'rgba(64, 158, 255, 0.1)',
    },

    // 字体栈
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
};

/**
 * 注入主题变量到 CSS
 * @param {HTMLElement} [targetElement] - 如果传入，只注入该元素的 style；否则注入到 document.documentElement
 */
export const applyTheme = (targetElement) => {
    const root = targetElement || document.documentElement;
    const { colors, fontFamily } = THEME;

    // 注入核心变量
    root.style.setProperty('--ie-primary-color', colors.primary);
    root.style.setProperty('--ie-bg-color', colors.bg);
    root.style.setProperty('--ie-text-color', colors.text);
    root.style.setProperty('--ie-border-color', colors.border);
    // 禁用态背景色（用于按钮 disabled 等场景）
    root.style.setProperty('--ie-disabled-bg', '#c0c4cc');
    root.style.setProperty('--ie-font-family', fontFamily);
};