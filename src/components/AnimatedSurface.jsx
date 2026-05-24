/**
 * @file src/components/AnimatedSurface.jsx
 * @owner Claude
 * 
 * Reusable wrapper component for PixelBrain-derived animations.
 * Applies school physics and stat overlays to its children.
 */

import React from 'react';
import { useAnimationSpec } from '../hooks/useAnimationSpec';

/**
 * AnimatedSurface Component
 * 
 * @param {Object} props
 * @param {Object} props.signal - The PixelBrain signal driving the animation
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} props.children - Component children
 * @param {string} [props.as] - HTML tag to render (defaults to 'div')
 */
export const AnimatedSurface = React.forwardRef(function AnimatedSurface({ 
  signal,
  motion, 
  className = '', 
  children, 
  as: Component = 'div',
  style,
  ...props 
}, ref) {
  const spec = useAnimationSpec(signal);

  // V12 PERFORMANCE: Support direct motion output from AMP
  const effectiveStyle = {
    ...spec?.cssVars,
    ...(motion?.cssVariables || {}),
    ...style,
  };

  const combinedClass = [
    className,
    spec?.animClass,
    ...(spec?.overlays?.map(o => o.class) || []),
    spec?.emergent?.type === 'burst' ? 'burst-active' : null,
    motion?.ok ? 'amp-active' : null,
  ].filter(Boolean).join(' ');

  return (
      <Component
      ref={ref}
      className={combinedClass}
      style={effectiveStyle}
      aria-live={spec?.emergent ? 'polite' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

