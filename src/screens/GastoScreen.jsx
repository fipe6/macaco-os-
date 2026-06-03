import { useState, useEffect } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { useApp } from '../store.jsx';

const GASTOS = {
  negocio: [
    { id: 'internet-wom',  nombre: 'Internet WOM',    monto: 12_270 },
    { id: 'meta-verified', nombre: 'Meta Verified',   monto: 5_600 },
    { id: 'chatgpt',       nombre: 'ChatGPT',         monto: 7_990 },
    { id: 'claude',        nombre: 'Claude',          monto: 10_000 },
    { id: 'spotify',       nombre: 'Spotify',         monto: 5_000 },
    { id: 'auspicios',     nombre: 'Auspicios',       monto: 117_000 },
    { id: 'envios',        nombre: 'Envíos',          monto: null },
    { id: 'sueldo',        nombre: 'Sueldo personal', monto: 80_000 },
    { id: 'otros-negocio', nombre: 'Otros',           monto: null },
  ],
  personal: [
    { id: 'alimentacion',   nombre: 'Alimentación', monto: null },
    { id: 'transporte',     nombre: 'Transporte',   monto: null },
    { id: 'salud',          nombre: 'Salud',        monto: null },
    { id: 'ocio',           nombre: 'Ocio',         monto: null },
    { id: 'otros-personal', nombre: 'Otros',        monto: null },
  ],
};

export default function GastoScreen({ go }) {
  const { registrarGasto } = useApp();
  const [tipo, setTipo]           = useState('negocio');
  const [catId, setCatId]         = useState(GASTOS.negocio[0].id);
  const [openPicker, setOpenPicker] = useState(false);
  const [monto, setMonto]         = useState(GASTOS.negocio[0].monto || 0);
  const [desc, setDesc]           = useState('');
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);

  const cats = GASTOS[tipo];
  const cat  = cats.find(c => c.id === catId) || cats[0];

  useEffect(() => {
    const primero = GASTOS[tipo][0];
    setCatId(primero.id);
    setMonto(primero.monto || 0);
  }, [tipo]);

  useEffect(() => {
    if (cat && cat.monto !== null) setMonto(cat.monto);
  }, [catId]);

  const handleSend = () => {
    if (sending || monto <= 0) return;
    setSending(true);
    registrarGasto({
      categoria:   cat.nombre,
      categoriaId: cat.id,
      tipo,
      monto,
      descripcion: desc.trim() || null,
    });
    setSent(true);
    setSending(false);
    setTimeout(() => go('home'), 1400);
  };

  const accentColor = tipo === 'negocio' ? MACACO.orange : MACACO.cyan;
  const isFixed     = cat?.monto !== null;

  return (
    <Screen>
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{ fontSize: 11, color: accentColor, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Nueva entrada
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>
          Registrar Gasto
        </div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 4 }}>
          Se guarda localmente · impacta caja y reportes
        </div>
      </div>

      {/* Tipo */}
      <SectionTitle>Tipo de gasto</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['negocio', 'Negocio', MACACO.orange], ['personal', 'Personal', MACACO.cyan]].map(([t, label, color]) => {
          const active = tipo === t;
          return (
            <button key={t} onClick={() => setTipo(t)} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12,
              background: active ? color + '1A' : MACACO.card,
              color: active ? color : MACACO.textDim,
              border: `1px solid ${active ? color + '55' : MACACO.border}`,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? `0 0 18px ${color}22` : 'none',
              transition: '160ms',
            }}>{label}</button>
          );
        })}
      </div>

      {/* Categoría */}
      <SectionTitle>Categoría</SectionTitle>
      <Card style={{ marginBottom: 14, padding: 0 }}>
        <button
          onClick={() => setOpenPicker(o => !o)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '14px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer', color: '#fff',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{cat.nombre}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>
              {cat.monto !== null
                ? `Monto habitual ${clp(cat.monto)}`
                : 'Monto variable — ingresar manualmente'}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14"
            style={{ transform: openPicker ? 'rotate(180deg)' : 'none', transition: '200ms', flexShrink: 0 }}>
            <path d="M3 5l4 4 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {openPicker && (
          <div style={{ borderTop: `1px solid ${MACACO.borderSoft}`, maxHeight: 260, overflowY: 'auto' }}>
            {cats.map((c, i) => (
              <button key={c.id}
                onClick={() => { setCatId(c.id); setOpenPicker(false); }}
                style={{
                  width: '100%',
                  background: c.id === catId ? accentColor + '10' : 'transparent',
                  border: 'none', padding: '11px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i === cats.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                  cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13.5 }}>{c.nombre}</span>
                {c.monto !== null && (
                  <div style={{ fontSize: 12, color: MACACO.textMuted }}>{clp(c.monto)}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Monto */}
      <SectionTitle>
        Monto{isFixed && (
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: MACACO.textMuted }}>
            {' '}(pre-cargado · editable)
          </span>
        )}
      </SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={14}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 22, color: MACACO.textMuted, fontWeight: 600, marginRight: 4 }}>$</span>
          <input
            type="text" inputMode="numeric"
            value={monto === 0 ? '' : monto.toLocaleString('es-CL')}
            placeholder="0"
            onChange={e => setMonto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: 26, fontWeight: 700, width: '100%', outline: 'none',
              fontVariantNumeric: 'tabular-nums', padding: 0, fontFamily: 'inherit',
            }}
          />
        </div>
      </Card>

      {/* Descripción */}
      <SectionTitle>
        Descripción{' '}
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: MACACO.textMuted }}>
          (opcional)
        </span>
      </SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={0}>
        <input
          type="text" value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Nota adicional..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '14px 16px', color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </Card>

      {/* Resumen */}
      <Card style={{
        marginBottom: 14,
        background: tipo === 'negocio'
          ? 'linear-gradient(135deg, rgba(255,159,64,0.07), rgba(255,159,64,0.02))'
          : 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(0,212,255,0.02))',
        borderColor: tipo === 'negocio' ? 'rgba(255,159,64,0.28)' : 'rgba(0,212,255,0.28)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Total gasto
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(monto)}</div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim }}>Tipo</div>
          <div style={{
            padding: '3px 10px', borderRadius: 999,
            background: accentColor + '18', color: accentColor,
            fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize',
          }}>
            {tipo}
          </div>
        </div>
        {tipo === 'negocio' && monto > 0 && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
            <div style={{ fontSize: 11.5, color: MACACO.textMuted }}>
              Se descontará de caja al registrar
            </div>
          </>
        )}
      </Card>

      <button
        onClick={handleSend}
        disabled={sent || sending || monto <= 0}
        style={{
          width: '100%', padding: '16px',
          background: sent ? MACACO.success : monto <= 0 ? MACACO.cardElev : accentColor,
          color: monto <= 0 ? MACACO.textMuted : '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
          cursor: sent || sending || monto <= 0 ? 'default' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: monto > 0 && !sent ? `0 0 24px ${accentColor}55` : 'none',
          transition: '200ms',
        }}
      >
        {sent
          ? <><Icon.check size={16} /> GASTO REGISTRADO</>
          : sending ? 'GUARDANDO...'
          : <>REGISTRAR GASTO <Icon.arrowRight size={14} /></>}
      </button>
    </Screen>
  );
}
