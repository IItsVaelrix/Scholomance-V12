/**
 * BugLatticeMap — Spatial Diagnostics
 * Maps bug fingerprints into a deterministic 2D lattice.
 */

import React, { useEffect, useRef } from 'react';

export function BugLatticeMap({ bug, size = 180 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !bug) return;
        const ctx = canvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        const cellSize = 10;
        for (let x = 0; x <= width; x += cellSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += cellSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        // Deterministic points from bug hash
        const hash = bug.checksum || bug.id;
        const points = [];
        for (let i = 0; i < hash.length - 2; i += 2) {
            const x = parseInt(hash.slice(i, i+1), 16) * (width / 16);
            const y = parseInt(hash.slice(i+1, i+2), 16) * (height / 16);
            points.push({ x, y });
        }

        // Draw connections
        ctx.strokeStyle = `var(--severity-${bug.severity.toLowerCase()})`;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw points
        ctx.globalAlpha = 1.0;
        points.forEach(p => {
            ctx.fillStyle = `var(--severity-${bug.severity.toLowerCase()})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

    }, [bug, size]);

    return (
        <div className="bug-lattice-map">
            <canvas 
                ref={canvasRef} 
                width={size} 
                height={size} 
                style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
            />
            <div className="lattice-status">
                <span className="lattice-node-count">{bug ? (bug.checksum?.length / 2) || 8 : 0} NODES</span>
                <span className="lattice-status-text">LATTICE ACTIVE</span>
            </div>
        </div>
    );
}
