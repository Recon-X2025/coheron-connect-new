import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  disabled?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: KeyboardShortcutOptions = {}
) {
  const { ctrl = false, shift = false, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      if (ctrl && !(e.ctrlKey || e.metaKey)) return;
      if (shift && !e.shiftKey) return;

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    },
    [key, callback, ctrl, shift, disabled]
  );

  useEffect(() => {
    if (disabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, disabled]);
}
