import { onMounted, onUnmounted } from 'vue';
import { useEditorState } from '@/composables/useEditorState';

export function useKeyboardShortcuts(actions) {
  const { state, setGlobalDragMode } = useEditorState();

  // === Space 手型：兼容“按住临时”与“点按切换” ===
  const SPACE_TAP_THRESHOLD = 200;
  let spaceDownAt = 0;
  let spacePrevDragMode = false;
  let spaceIsDown = false;
  
  const isTypingTarget = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName?.toUpperCase?.();
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    // contenteditable
    if (el.isContentEditable) return true;
    return false;
  };

  const handleKeydown = (e) => {
    // 1. 🛡️ 避开输入框：如果用户正在打字，不触发快捷键
    if (isTypingTarget()) return;

    // === Space：手型拖拽（按住临时开启）===
    // 说明：
    // - keydown：若首次按下，记录旧值并强制开启拖拽
    // - keyup：根据是否为“点按”决定切换/恢复
    if (e.code === 'Space') {
      // 防止浏览器页面滚动
      e.preventDefault();

      if (!spaceIsDown) {
        spaceIsDown = true;
        spaceDownAt = Date.now();
        spacePrevDragMode = !!state.isGlobalDragMode;

        // 按住立即开启
        if (!state.isGlobalDragMode) {
          setGlobalDragMode(true);
        }
      }
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

  const handleKeyup = (e) => {
    if (isTypingTarget()) return;

    if (e.code === 'Space') {
      e.preventDefault();

      if (!spaceIsDown) return;
      spaceIsDown = false;

      const heldMs = Date.now() - spaceDownAt;

      // 点按：切换开关
      if (heldMs <= SPACE_TAP_THRESHOLD) {
        setGlobalDragMode(!spacePrevDragMode);
        return;
      }

      // 长按：松开恢复旧状态
      setGlobalDragMode(spacePrevDragMode);
      return;
    }

    // Esc：强制退出手型
    if (e.key === 'Escape') {
      if (state.isGlobalDragMode) {
        setGlobalDragMode(false);
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
  });
}