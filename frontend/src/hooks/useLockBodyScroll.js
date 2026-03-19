import { useLayoutEffect } from 'react';

/**
 * Locks background scroll by setting body overflow hidden.
 * Also compensates for scrollbar width to avoid layout shift.
 */
export default function useLockBodyScroll(locked = true) {
  useLayoutEffect(() => {
    if (!locked) return undefined;
    if (typeof document === 'undefined') return undefined;

    const body = document.body;
    const docEl = document.documentElement;

    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = Math.max(0, window.innerWidth - docEl.clientWidth);
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [locked]);
}

