import { useRef, useEffect, useCallback, useId } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

const DISSOLVE_DURATION_MS = 400;
const HOLD_MS = 200;
const FADE_MS = 300;

export default function WatercolorDissolve({ dissolving, onDissolveComplete, children }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const filterId = useId().replace(/:/g, "");
  const displacementRef = useRef(null);
  const wrapperRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const runDissolve = useCallback(() => {
    if (prefersReducedMotion) {
      onDissolveComplete?.();
      return;
    }

    const displacement = displacementRef.current;
    const wrapper = wrapperRef.current;
    if (!displacement || !wrapper) return;

    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / DISSOLVE_DURATION_MS, 1);
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      displacement.setAttribute("scale", String(Math.round(eased * 180)));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          wrapper.style.transition = `opacity ${FADE_MS}ms ease-out`;
          wrapper.style.opacity = "0";
          setTimeout(() => {
            onDissolveComplete?.();
          }, FADE_MS);
        }, HOLD_MS);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [prefersReducedMotion, onDissolveComplete]);

  useEffect(() => {
    if (dissolving) runDissolve();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dissolving, runDissolve]);

  const filterUrl = prefersReducedMotion ? undefined : `url(#${filterId})`;

  return (
    <>
      {!prefersReducedMotion && (
        <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.015 0.025"
                numOctaves="4"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                ref={displacementRef}
                in="SourceGraphic"
                in2="noise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feGaussianBlur in="displaced" stdDeviation="0.5" />
            </filter>
          </defs>
        </svg>
      )}
      <div
        ref={wrapperRef}
        style={{ filter: filterUrl, willChange: "filter, opacity" }}
      >
        {children}
      </div>
    </>
  );
}
