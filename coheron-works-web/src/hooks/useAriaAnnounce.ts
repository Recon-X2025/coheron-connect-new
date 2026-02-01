import { useCallback, useEffect, useRef } from 'react';

/**
 * Provides a function to announce messages to screen readers
 * via an aria-live region injected into the DOM.
 */
export function useAriaAnnounce() {
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0, 0, 0, 0)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    document.body.appendChild(region);
    regionRef.current = region;
    return () => { document.body.removeChild(region); };
  }, []);

  const announce = useCallback((message: string, assertive = false) => {
    const region = regionRef.current;
    if (!region) return;
    region.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }, []);

  return announce;
}
