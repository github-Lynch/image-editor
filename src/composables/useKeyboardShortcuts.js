import { onMounted, onUnmounted } from 'vue';

export function useKeyboardShortcuts(actions) {
  
  const handleKeydown = (e) => {
    // 1. 🛡️ 避开输入框：如果用户正在打字，不触发快捷键
    const activeTag = document.activeElement.tagName.toUpperCase();
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
      return;
    }

    const isCmd = e.ctrlKey || e.metaKey; // Windows用Ctrl, Mac用Command
    const isShift = e.shiftKey;
    const key = e.key.toLowerCase(); // 统一转小写判断

    // === 组合键 (Cmd/Ctrl + ...) ===
    if (isCmd) {
      switch (key) {
        // --- 基础编辑 ---
        case 'c': 
          e.preventDefault(); 
          actions.copyActive();
          break;
          
        case 'v': 
          e.preventDefault();
          actions.pasteActive(); // 自动触发"键盘偏移粘贴"
          break;
        
        case 'x': // 剪切
          e.preventDefault();
          actions.cutActive();
          break;

        case 'z': // 撤销 & 重做
          e.preventDefault();
          if (isShift) {
            actions.redo && actions.redo(); // 支持 Ctrl+Shift+Z 重做
          } else {
            actions.undo && actions.undo();
          }
          break;
          
        case 'y': // 重做 (Windows 习惯)
          e.preventDefault();
          actions.redo && actions.redo();
          break;

        case 'a': // 全选 (预留)
          e.preventDefault();
          // actions.selectAll();
          break;

        case 's': // 保存 (拦截浏览器保存)
          e.preventDefault();
          // actions.saveCanvas(); 
          break;
          
        // --- 锁定 (Ctrl + Shift + L) ---
        case 'l': 
          if (isShift) {
            e.preventDefault(); // 防止浏览器跳到地址栏
            actions.toggleLock();
          }
          break;
      }
    } 
    
    // === 单键或 Shift 组合键 (不按 Ctrl) ===
    else {
      switch (e.key) { // 这里区分大小写或者用 key code 更准确，这里直接用字符
        // --- 删除 ---
        case 'Delete':
        case 'Backspace':
          actions.deleteActive();
          break;

        // --- 图层层级 (关键) ---
        case '[': // 左中括号
          if (isShift) {
             actions.moveLayer('back'); // Shift + [ = 置底
          } else {
             actions.moveLayer('backward'); // [ = 下移一层
          }
          break;

        case ']': // 右中括号
          if (isShift) {
             actions.moveLayer('front'); // Shift + ] = 置顶
          } else {
             actions.moveLayer('forward'); // ] = 上移一层
          }
          break;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}