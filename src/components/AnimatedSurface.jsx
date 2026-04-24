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
  className = '', 
  children, 
  as: Component = 'div',
  style,
  ...props 
}, ref) {
  const spec = useAnimationSpec(signal);

  if (!spec) {
    return (
      <Component ref={ref} className={className} style={style} {...props}>
        {children}
      </Component>
    );
  }

  const combinedClass = [
    className,
    spec.animClass,
    ...(spec.overlays.map(o => o.class)),
    spec.emergent?.type === 'burst' ? 'burst-active' : null,
  ].filter(Boolean).join(' ');

  return (
      <Component
      ref={ref}
      className={combinedClass}
      style={{ ...spec.cssVars, ...style }}
      aria-live={spec.emergent ? 'polite' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

export default AnimatedSurface;
