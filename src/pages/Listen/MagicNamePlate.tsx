import React, { useState, useEffect, useRef } from 'react';

interface MagicNamePlateProps {
  name: string;
  color: string;
}

const GLYPHS = "01AEIOUYRLMNSKTDZH";

/**
 * MagicNamePlate — Digitally/Magically morphs text and color.
 * Implementation for Spec v1.6
 */
export const MagicNamePlate: React.FC<MagicNamePlateProps> = ({ name, color }) => {
  const [displayText, setDisplayText] = useState(name);
  const [isGlitching, setIsGlitching] = useState(false);
  const prevNameRef = useRef(name);

  useEffect(() => {
    if (name !== prevNameRef.current) {
      setIsGlitching(true);
      prevNameRef.current = name;

      let iteration = 0;
      let seed = 5;
      const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
      const interval = setInterval(() => {
        setDisplayText(() => 
          name.split("").map((char, index) => {
            if (index < iteration) return name[index];
            return GLYPHS[Math.floor(seededRandom() * GLYPHS.length)];
          }).join("")
        );

        if (iteration >= name.length) {
          clearInterval(interval);
          setIsGlitching(false);
        }
        iteration += 1/3;
      }, 30);

      return () => clearInterval(interval);
    }
  }, [name]);

  return (
    <h2 
      className={`magic-name-plate ${isGlitching ? 'is-glitching' : ''}`}
      style={{ 
        '--accent': color,
        transition: 'color 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
        color: 'var(--accent)',
        textShadow: `0 0 10px ${color}66`
      } as React.CSSProperties}
    >
      {displayText.toUpperCase()}
    </h2>
  );
};
