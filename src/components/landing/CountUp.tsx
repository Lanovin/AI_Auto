'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count-up number animation triggered when the element scrolls into view.
 *
 * Behaviour:
 *   • Starts at 0 (or `from`), tweens to `value` over `duration` ms.
 *   • Uses IntersectionObserver — only fires once, on first intersection.
 *   • Respects prefers-reduced-motion: renders the final value immediately.
 *
 * Formatting is locale-based (default cs-CZ) with a fixed decimal precision
 * — no callback prop, because this is a Client Component and accepting a
 * function from a Server Component parent would violate the serialisation
 * boundary (Next.js error: "Functions cannot be passed directly to Client
 * Components"). For exotic formats, format the value upstream and pass it as
 * a string render via `from`/`value` once Intl can no longer do the job.
 */
interface CountUpProps {
  value: number;
  /** Starting value (default 0). */
  from?: number;
  /** Animation duration in ms (default 1100). */
  duration?: number;
  /** Decimal places shown during the tween. */
  precision?: number;
  /** BCP-47 locale used by Intl.NumberFormat (default cs-CZ). */
  locale?: string;
  className?: string;
  /** Delay before animation starts after entering view (ms). */
  delay?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  from = 0,
  duration = 1100,
  precision = 0,
  locale = 'cs-CZ',
  className,
  delay = 0,
}: CountUpProps) {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [current, setCurrent] = useState<number>(from);
  const startedRef = useRef(false);

  const formatter = (n: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(n);

  useEffect(() => {
    const node = elRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setCurrent(value);
      return;
    }

    const animate = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const start = performance.now() + delay;
      let raf = 0;

      const tick = (now: number) => {
        if (now < start) {
          raf = requestAnimationFrame(tick);
          return;
        }
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        setCurrent(from + (value - from) * eased);
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animate();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, from, duration, delay, locale, precision]);

  return (
    <span ref={elRef} className={className}>
      {formatter(current)}
    </span>
  );
}
