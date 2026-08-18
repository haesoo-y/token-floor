import { useLayoutEffect, useRef, useState } from "react";

/** Returns whether a clamped element has content outside its visible box. */
export function isElementOverflowing(element: Pick<HTMLElement, "clientHeight" | "scrollHeight">) {
  return element.scrollHeight > element.clientHeight + 1;
}

/** Tracks real layout overflow while preserving the result when content is expanded. */
export function useOverflowState(text: string, expanded: boolean) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;

    const measure = () => setOverflowing(isElementOverflowing(element));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    // The observer owns layout-driven remeasurement and must detach with this rendered body.
    return () => observer.disconnect();
  }, [expanded, text]);

  return { ref, overflowing };
}
