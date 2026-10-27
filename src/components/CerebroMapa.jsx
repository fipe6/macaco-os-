// Mapa del cerebro: una constelación de miles de triángulos diminutos sobre negro
// que forman un cerebro (dos hemisferios), con un punto grande por área.
// Canvas 2D, sin librerías. El brillo de cada punto = qué tan bien va esa área;
// un punto tenue con anillo punteado = todavía sin medir.
// Los botones son HTML encima del canvas: se pueden tocar y los lee un lector de pantalla.
import { useEffect, useRef, useState } from 'react';
import { MACACO } from '../theme.js';

const PALETA = ['#9984D8', '#8052ff', '#ffb829', '#2FA7C9', '#e66fb0', '#3FCB7F', '#6f8cff'];

// Números pseudo-aleatorios con semilla: el cerebro es el mismo cada vez.
function rng(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ¿(x, y) está dentro del cerebro? x e y en -1..1. Dos hemisferios con borde
// ondulado (circunvoluciones), una fisura al centro y un tronco abajo.
function dentro(x, y) {
  const lado = x < 0 ? -1 : 1;
  const dx = (Math.abs(x) - 0.5) / 0.52, dy = (y + 0.02) / 0.74;
  const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx * lado);
  const borde = 1 + 0.07 * Math.sin(7 * th + 0.8) + 0.05 * Math.sin(12 * th + 2.1) + 0.03 * Math.sin(19 * th);
  if (r < borde && Math.abs(x) > 0.022 + 0.03 * Math.max(0, y)) return true;
  // tronco cerebral
  return Math.abs(x) < 0.1 && y > 0.62 && y < 0.92;
}

function crearParticulas(ancho, alto, cantidad, aleatorio) {
  const parts = [];
  const ex = ancho * 0.44, ey = alto * 0.46, cx = ancho / 2, cy = alto / 2;
  let intentos = 0;
  while (parts.length < cantidad && intentos++ < cantidad * 40) {
    const x = aleatorio() * 2 - 1, y = aleatorio() * 2 - 1;
    if (!dentro(x, y)) continue;
    // densidad irregular: más puntos a lo largo de "pliegues"
    const pliegue = 0.5 + 0.5 * Math.sin(x * 16 + Math.sin(y * 9) * 2.4) * Math.cos(y * 13 - x * 5);
    if (aleatorio() > 0.28 + 0.72 * pliegue) continue;
    parts.push({ nx: x, ny: y, x: cx + x * ex, y: cy + y * ey, tam: 1.6 + aleatorio() * 2.6, rot: aleatorio() * Math.PI * 2,
      color: PALETA[Math.floor(aleatorio() * PALETA.length)], fase: aleatorio() * 6.28, vel: 0.4 + aleatorio() * 1.1, base: 0.3 + aleatorio() * 0.55 });
  }
  // partículas sueltas alrededor (más tenues)
  for (let i = 0; i < cantidad * 0.14; i++) {
    parts.push({ x: aleatorio() * ancho, y: aleatorio() * alto, nx: 9, ny: 9, tam: 1.2 + aleatorio() * 1.8, rot: aleatorio() * 6.28,
      color: PALETA[Math.floor(aleatorio() * PALETA.length)], fase: aleatorio() * 6.28, vel: 0.3 + aleatorio(), base: 0.12 + aleatorio() * 0.2 });
  }
  return parts;
}

function triangulo(ctx, x, y, tam, rot) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * 2 * Math.PI) / 3;
    const px = x + Math.cos(a) * tam, py = y + Math.sin(a) * tam;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

export function CerebroMapa({ nodos, onElegir, alto = 400 }) {
  const caja = useRef(null);
  const canvas = useRef(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const el = caja.current;
    const medir = () => setAncho(Math.round(el.clientWidth));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ancho) return;
    const cv = canvas.current, ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = ancho * dpr; cv.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const aleatorio = rng(20261027);
    const parts = crearParticulas(ancho, alto, ancho < 480 ? 820 : 1500, aleatorio);
    const ex = ancho * 0.44, ey = alto * 0.46, cx = ancho / 2, cy = alto / 2;
    const puntos = nodos.map(n => ({ ...n, px: cx + n.x * ex, py: cy + n.y * ey }));
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // cuánto "ilumina" cada punto a las partículas cercanas
    parts.forEach(p => {
      p.luz = 0;
      puntos.forEach(n => {
        const d = Math.hypot(p.x - n.px, p.y - n.py);
        const alcance = 46 + 40 * (n.medido ? n.salud : 0.15);
        if (d < alcance) p.luz = Math.max(p.luz, (1 - d / alcance) * (n.medido ? 0.35 + 0.65 * n.salud : 0.18));
      });
    });

    let raf, visible = true;
    const dibujar = (t) => {
      ctx.clearRect(0, 0, ancho, alto);
      ctx.lineWidth = 1;
      parts.forEach(p => {
        const tw = quieto ? 0.75 : 0.55 + 0.45 * Math.sin(t * 0.001 * p.vel + p.fase);
        const dx = quieto ? 0 : Math.sin(t * 0.0004 * p.vel + p.fase) * 0.9;
        const dy = quieto ? 0 : Math.cos(t * 0.00033 * p.vel + p.fase) * 0.9;
        ctx.globalAlpha = Math.min(1, (p.base + p.luz * 0.7) * tw);
        ctx.strokeStyle = p.luz > 0.25 ? '#ffffff' : p.color;
        triangulo(ctx, p.x + dx, p.y + dy, p.tam + p.luz * 1.4, p.rot + (quieto ? 0 : t * 0.0002 * p.vel));
      });
      // puntos grandes
      puntos.forEach(n => {
        const brillo = n.medido ? 0.35 + 0.65 * n.salud : 0.28;
        const pulso = quieto ? 1 : 1 + 0.06 * Math.sin(t * 0.002 + n.px);
        const r = (7 + 5 * (n.medido ? n.salud : 0.2)) * pulso;
        const g = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r * 5);
        g.addColorStop(0, `rgba(153,132,216,${0.55 * brillo})`);
        g.addColorStop(1, 'rgba(153,132,216,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.px, n.py, r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = Math.min(1, brillo + 0.15);
        ctx.fillStyle = n.medido && n.salud >= 0.66 ? '#3FCB7F' : '#cdbff5';
        ctx.beginPath(); ctx.arc(n.px, n.py, r * 0.62, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9984D8'; ctx.lineWidth = 1.3;
        ctx.globalAlpha = 0.9 * brillo + 0.1;
        ctx.setLineDash(n.medido ? [] : [3, 3]);
        ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1;
      });
      ctx.globalAlpha = 1;
      if (!quieto && visible) raf = requestAnimationFrame(dibujar);
    };
    const alCambiarVisibilidad = () => {
      visible = document.visibilityState === 'visible';
      if (visible && !quieto) raf = requestAnimationFrame(dibujar);
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    raf = requestAnimationFrame(dibujar);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', alCambiarVisibilidad); };
  }, [ancho, alto, nodos]);

  return (
    <div ref={caja} style={{ position: 'relative', width: '100%', height: alto }}>
      <canvas ref={canvas} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {ancho > 0 && nodos.map(n => (
        <button key={n.id} onClick={() => onElegir(n)} aria-label={`${n.nombre}: ${n.dato}`} style={{
          position: 'absolute', left: ancho / 2 + n.x * ancho * 0.44, top: alto / 2 + n.y * alto * 0.46,
          transform: 'translate(-50%, -22px)', width: 108, background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', color: MACACO.text, padding: '0 0 6px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{ height: 44 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.02em', textShadow: '0 0 8px #000, 0 0 3px #000' }}>{n.nombre}</span>
          <span style={{ fontSize: 10.5, fontWeight: 300, color: n.medido ? '#d8d2ee' : MACACO.textMuted, marginTop: 2, textShadow: '0 0 8px #000, 0 0 3px #000' }}>{n.dato}</span>
        </button>
      ))}
    </div>
  );
}
