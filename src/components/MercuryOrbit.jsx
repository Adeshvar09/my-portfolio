import { useEffect, useRef } from 'react';

// A lightweight CSS 3D orbital sculpture. Pointer velocity drives contraction,
// wobble and recovery; no WebGL renderer or animation dependency is required.
export default function MercuryOrbit() {
  const root = useRef(null);
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0, speed: 0, collapse: 0, last: 0, px: 0, py: 0, raf: 0 });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const s = state.current;
    const onMove = (e) => {
      const now = performance.now();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const dt = Math.max(8, now - (s.last || now));
      const dx = e.clientX - s.px, dy = e.clientY - s.py;
      const instant = Math.hypot(dx, dy) / dt;
      s.speed = Math.min(1, instant / 1.65);
      s.vx = dx / dt; s.vy = dy / dt;
      s.x = Math.max(-1, Math.min(1, x / (rect.width * .55)));
      s.y = Math.max(-1, Math.min(1, y / (rect.height * .55)));
      s.last = now; s.px = e.clientX; s.py = e.clientY;
    };
    const onLeave = () => { s.speed = 0; s.x = 0; s.y = 0; };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    const tick = () => {
      const aggressive = Math.max(0, Math.min(1, (s.speed - .27) / .65));
      s.collapse += (aggressive - s.collapse) * (aggressive > s.collapse ? .12 : .035);
      s.speed *= .965;
      const wobble = Math.sin(performance.now() * .025) * s.collapse * 7;
      const rotX = -s.y * 18 + s.vy * 150;
      const rotY = s.x * 22 + s.vx * 150;
      el.style.setProperty('--collapse', s.collapse.toFixed(3));
      el.style.setProperty('--rot-x', `${rotX}deg`);
      el.style.setProperty('--rot-y', `${rotY}deg`);
      el.style.setProperty('--wobble', `${wobble}deg`);
      el.style.setProperty('--shake', `${s.collapse * (Math.sin(performance.now() * .09) * 5)}px`);
      s.vx *= .92; s.vy *= .92;
      s.raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(s.raf); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, []);

  return <div className="orbit-stage" ref={root}>
    <div className="orbit-aura" />
    <div className="orbit-object">
      <div className="orbit-ring ring-one"><i /></div>
      <div className="orbit-ring ring-two"><i /></div>
      <div className="orbit-ring ring-three"><i /></div>
      <div className="orbit-ring ring-four"><i /></div>
      <div className="orbit-ring ring-five"><i /></div>
      <div className="orbit-core" />
    </div>
    <div className="orbit-crosshair horizontal" /><div className="orbit-crosshair vertical" />
    <span className="orbit-tag tag-one">X / 01</span><span className="orbit-tag tag-two">MASS : FLUID</span>
  </div>;
}
