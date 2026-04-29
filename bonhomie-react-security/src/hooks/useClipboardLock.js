import { useEffect } from 'react';

export default function useClipboardLock(options = {}) {
  const {
    blockCopy = true,
    blockCut = true,
    blockPaste = true,
    blockContextMenu = true,
    onBlock, // callback(eventType)
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return;

    const handler = (eventType) => (e) => {
      if (typeof onBlock === 'function') {
        onBlock(eventType, e);
      }
      e.preventDefault();
    };

    const copyHandler = blockCopy ? handler('copy') : null;
    const cutHandler = blockCut ? handler('cut') : null;
    const pasteHandler = blockPaste ? handler('paste') : null;
    const contextHandler = blockContextMenu ? handler('contextmenu') : null;

    if (copyHandler) document.addEventListener('copy', copyHandler);
    if (cutHandler) document.addEventListener('cut', cutHandler);
    if (pasteHandler) document.addEventListener('paste', pasteHandler);
    if (contextHandler)
      document.addEventListener('contextmenu', contextHandler);

    return () => {
      if (copyHandler) document.removeEventListener('copy', copyHandler);
      if (cutHandler) document.removeEventListener('cut', cutHandler);
      if (pasteHandler) document.removeEventListener('paste', pasteHandler);
      if (contextHandler)
        document.removeEventListener('contextmenu', contextHandler);
    };
  }, [blockCopy, blockCut, blockPaste, blockContextMenu, onBlock]);
}
