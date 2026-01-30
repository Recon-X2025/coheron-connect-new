import { useEffect } from 'react';

/**
 * Hook that adds Escape key dismissal for modals.
 * Call this in any component that renders a modal overlay.
 *
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Function to call when Escape is pressed
 */
export const useModalDismiss = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
};
