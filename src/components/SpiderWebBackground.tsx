import { useEffect, useRef } from 'react';

const SPOKES = 18;
const RINGS = 9;
const LINE = '158, 205, 232';

/**
 * The web is a detached object: it hangs parked in the upper-right area,
 * peels off when the cursor moves and chases it on a soft spring (so it
 * swings behind the cursor instead of being glued to it), then drifts
 * back to its parking spot after a few seconds of inactivity.
 */
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
    const vel = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const park = { x: 0, y: 0 };
    let moved = false;
    let lastMove = 0;

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
      park.x = w * 0.74;
      park.y = h * 0.16;
      if (!moved) { pos.x = park.x; pos.y = park.y; target.x = park.x; target.y = park.y; }
    };

    resize();
    pos.x = park.x; pos.y = park.y;
    target.x = park.x; target.y = park.y;

    const onMove = (e: PointerEvent) => {
      if (coarse) return;
      moved = true;
      lastMove = performance.now();
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const onLeave = () => {
      // cursor left the window — the web swings home
      lastMove = 0;
      target.x = park.x;
      target.y = park.y;
    };

    // Spring follow: acceleration toward the target + damping gives a
    // heavy, trailing chase (with a slight overshoot) instead of the web
    // sitting on the cursor.
    const STIFF = reduced ? 0.2 : 0.028;
    const DAMP = 0.86;

    const draw = () => {
      vel.x += (target.x - pos.x) * STIFF;
      vel.y += (target.y - pos.y) * STIFF;
      vel.x *= DAMP;
      vel.y *= DAMP;
      pos.x += vel.x;
      pos.y += vel.y;

      // after a few idle seconds the web drifts back to its spot
      if (moved && performance.now() - lastMove > 3500) {
        target.x = park.x;
        target.y = park.y;
      }

      const speed = Math.min(Math.hypot(vel.x, vel.y), 40);

      ctx.clearRect(0, 0, w, h);
      const R = Math.hypot(w, h) * 0.56;
      const dirs: Array<[number, number]> = [];
      for (let i = 0; i < SPOKES; i++) {
        const a = (i / SPOKES) * Math.PI * 2 + Math.PI / SPOKES;
        dirs.push([Math.cos(a), Math.sin(a)]);
      }

      // anchor threads: while the web is away from its parking spot,
      // a few faint silk lines still stretch back to where it hangs
      const away = Math.hypot(pos.x - park.x, pos.y - park.y);
      if (away > 24) {
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = Math.PI * (0.85 + i * 0.55);
          ctx.strokeStyle = `rgba(${LINE}, 0.06)`;
          ctx.beginPath();
          ctx.moveTo(park.x, park.y);
          ctx.lineTo(pos.x + Math.cos(a) * R * 0.2, pos.y + Math.sin(a) * R * 0.2);
          ctx.stroke();
        }
      }

      // spokes — brighter than before so the web reads as an object
      ctx.lineWidth = 1;
      for (const dir of dirs) {
        ctx.strokeStyle = `rgba(${LINE}, 0.14)`;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + dir[0] * R, pos.y + dir[1] * R);
        ctx.stroke();
      }

      // rings, sagging between spokes like real silk; a touch denser near
      // the hub so the web reads stronger while still staying subtle
      for (let r = 1; r <= RINGS; r++) {
        const radius = R * Math.pow(r / RINGS, 1.18);
        const alpha = 0.07 + 0.2 * (1 - r / RINGS);
        // slight stretch along motion — silk being dragged
        const stretch = 1 + speed * 0.006;
        const sx = 1 + Math.abs(vel.x) / (Math.hypot(vel.x, vel.y) + 1) * (stretch - 1);
        const sy = 1 + Math.abs(vel.y) / (Math.hypot(vel.x, vel.y) + 1) * (stretch - 1);
        ctx.strokeStyle = `rgba(${LINE}, ${alpha.toFixed(3)})`;
        ctx.lineWidth = r <= 3 ? 1.2 : 1;
        ctx.beginPath();
        for (let i = 0; i <= SPOKES; i++) {
          const a = dirs[i % SPOKES] ?? [1, 0];
          const b = dirs[(i + 1) % SPOKES] ?? [1, 0];
          const x1 = pos.x + a[0] * radius * sx;
          const y1 = pos.y + a[1] * radius * sy;
          const x2 = pos.x + b[0] * radius * sx;
          const y2 = pos.y + b[1] * radius * sy;
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
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="spiderweb-bg" />;
}
