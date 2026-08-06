'use client';

import { useEffect, useRef } from 'react';

export function LivingBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      frame += 0.003;
      const { width, height } = canvas;
      ctx.fillStyle = '#F4F7FB';
      ctx.fillRect(0, 0, width, height);

      const orbs = [
        { cx: 0.2, cy: 0.25, r: 0.35, color: '61, 212, 232' },
        { cx: 0.75, cy: 0.3, r: 0.32, color: '123, 95, 214' },
        { cx: 0.5, cy: 0.7, r: 0.38, color: '212, 79, 160' },
        { cx: 0.35, cy: 0.55, r: 0.22, color: '212, 168, 67' },
      ];

      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const x = (o.cx + Math.sin(frame + i) * 0.03) * width;
        const y = (o.cy + Math.cos(frame + i * 1.3) * 0.03) * height;
        const radius = o.r * Math.min(width, height);
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, `rgba(${o.color}, 0.28)`);
        g.addColorStop(1, `rgba(${o.color}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      raf = requestAnimationFrame(draw);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
