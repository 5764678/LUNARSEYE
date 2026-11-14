"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** The content-box width of an element, kept current as it resizes. Lets an SVG chart draw
 *  at its real pixel size, so its labels stay readable instead of scaling with a viewBox. */
export function useElementWidth<T extends HTMLElement>(initial: number): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(1, Math.round(node.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
