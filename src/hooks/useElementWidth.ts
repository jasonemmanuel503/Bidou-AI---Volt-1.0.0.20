import { useState, useEffect, RefObject } from 'react';

/**
 * ResizeObserver hook that returns the content-box width of a referenced element.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
          setWidth(entry.contentBoxSize[0].inlineSize);
        } else if (entry.contentRect) {
          setWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(element);
    // Initial sync measurement
    if (element.clientWidth > 0) {
      setWidth(element.clientWidth);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
}
