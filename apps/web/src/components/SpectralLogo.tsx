'use client';

import { useEffect, useRef } from 'react';

export function SpectralLogo({ size = 140 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      frame += 0.02;
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.38;
      ctx.clearRect(0, 0, size, size);

      const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.6);
      glow.addColorStop(0, 'rgba(212, 168, 67, 0.35)');
      glow.addColorStop(1, 'rgba(61, 212, 232, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#D4A843';
      ctx.lineWidth = size * 0.06;
      ctx.stroke();

      ctx.font = `600 ${size * 0.34}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const grad = ctx.createLinearGradient(cx - 20, cy, cx + 20, cy);
      grad.addColorStop(0, '#E8C96A');
      grad.addColorStop(0.5, '#42C6D5');
      grad.addColorStop(1, '#9D8BE8');
      ctx.fillStyle = grad;
      ctx.fillText('S', cx, cy + 2);

      for (let i = 0; i < 3; i++) {
        const a = frame + i * 2.1;
        const px = cx + Math.cos(a) * r * 1.15;
        const py = cy + Math.sin(a) * r * 1.15;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61, 212, 232, 0.7)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) draw();
    else draw();

    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="SYLORA"
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
}
