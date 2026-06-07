import { useMemo } from 'react';

/**
 * Hook to retrieve CSS variable names or HSL colors for a given school.
 * Useful for theming the EQ bands and overlays dynamically.
 */
export function useSchoolTint(schoolId?: string | null) {
  return useMemo(() => {
    if (!schoolId) {
      return {
        stroke: 'var(--foreground, #ffffff)',
        fill: 'rgba(255, 255, 255, 0.1)',
        glow: 'rgba(255, 255, 255, 0.3)',
      };
    }

    const schoolKey = schoolId.toLowerCase();
    
    return {
      stroke: `var(--${schoolKey}-primary, #808080)`,
      fill: `var(--${schoolKey}-primary-glow, rgba(128, 128, 128, 0.1))`,
      glow: `var(--${schoolKey}-primary-glow, rgba(128, 128, 128, 0.3))`,
    };
  }, [schoolId]);
}
