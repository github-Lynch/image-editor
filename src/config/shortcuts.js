// src/config/shortcuts.js

export const SHORTCUT_GROUPS = [
  {
    title: '基础编辑 (Editing)',
    items: [
      { label: '复制', keys: ['Ctrl', 'C'] },
      { label: '粘贴', keys: ['Ctrl', 'V'] },
      { label: '剪切', keys: ['Ctrl', 'X'] },
      { label: '撤销', keys: ['Ctrl', 'Z'] },
      { label: '重做', keys: ['Ctrl', 'Y'] },
      { label: '删除', keys: ['Delete'] },
    ]
  },
  {
    title: '图层管理 (Layers)',
    items: [
      { label: '上移一层', keys: [']'] },
      { label: '下移一层', keys: ['['] },
      { label: '置顶', keys: ['Shift', ']'] },
      { label: '置底', keys: ['Shift', '['] },
      { label: '锁定/解锁', keys: ['Ctrl', 'Shift', 'L'] },
    ]
  },
  {
    title: '画布视图 (View)',
    items: [
      { label: '放大', keys: ['Ctrl', '+'] }, // 假设你未来会加这个
      { label: '缩小', keys: ['Ctrl', '-'] },
      { label: '重置缩放', keys: ['Ctrl', '0'] },
      { label: '平移画布', keys: ['Space', 'Drag'] },
    ]
  }
];