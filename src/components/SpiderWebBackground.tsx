import { useEffect, useRef } from 'react';

const SPOKES = 16;
const RINGS = 7;
const LINE = '158, 205, 232';

export function SpiderWebBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const pos = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let moved = false;

    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const park = () => {
      target.x = w * 0.74;
      target.y = h * 0.16;
      if (!moved) { pos.x = target.x; pos.y = target.y; }
    };

    resize();
    park();

    const onMove = (e: PointerEvent) => {
      if (coarse) return;
      moved = true;
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const draw = () => {
      pos.x += (target.x - pos.x) * (reduced ? 1 : 0.055);
      pos.y += (target.y - pos.y) * (reduced ? 1 : 0.055);

      ctx.clearRect(0, 0, w, h);
      const R = Math.hypot(w, h) * 0.52;
      const dirs: Array<[number, number]> = [];
      for (let i = 0; i < SPOKES; i++) {
        const a = (i / SPOKES) * Math.PI * 2 + Math.PI / SPOKES;
        dirs.push([Math.cos(a), Math.sin(a)]);
      }

      // spokes
      ctx.lineWidth = 1;
      for (const dir of dirs) {
        ctx.strokeStyle = `rgba(${LINE}, 0.09)`;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + dir[0] * R, pos.y + dir[1] * R);
        ctx.stroke();
      }

      // rings, sagging between spokes like real silk
      for (let r = 1; r <= RINGS; r++) {
        const radius = R * Math.pow(r / RINGS, 1.18);
        const alpha = 0.05 + 0.15 * (1 - r / RINGS);
        ctx.strokeStyle = `rgba(${LINE}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i <= SPOKES; i++) {
          const a = dirs[i % SPOKES] ?? [1, 0];
          const b = dirs[(i + 1) % SPOKES] ?? [1, 0];
          const x1 = pos.x + a[0] * radius;
          const y1 = pos.y + a[1] * radius;
          const x2 = pos.x + b[0] * radius;
          const y2 = pos.y + b[1] * radius;
          const sag = radius * 0.07;
          const cx = (x1 + x2) / 2 - ((a[0] + b[0]) / 2) * sag;
          const cy = (y1 + y2) / 2 - ((a[1] + b[1]) / 2) * sag;
          if (i === 0) ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cx, cy, x2, y2);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="spiderweb-bg" />;
}
