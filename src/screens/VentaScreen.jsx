import { useState, useEffect } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { sendVenta } from '../services/webhook.js';
import { useApp } from '../store.jsx';

const stepBtn = {
  width: 30, height: 30, borderRadius: 8,
  background: MACACO.cardElev, color: '#fff',
  border: `1px solid ${MACACO.border}`,
  fontSize: 18, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function VentaScreen({ go }) {
  const { productos, registrarVenta, registrarMovimiento } = useApp();
  const disponibles = productos.filter(p => p.stock > 0);

  const [productId, setProductId] = useState(disponibles[0]?.id || '');
  const [qty, setQty]             = useState(1);
  const [price, setPrice]         = useState(0);
  const [client, setClient]       = useState('');
  const [method, setMethod]       = useState('Transferencia');
  const [openPicker, setOpenPicker] = useState(false);
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);

  const product = productos.find(p => p.id === productId);

  useEffect(() => {
    if (product) setPrice(product.price);
  }, [productId]);

  useEffect(() => {
    if (!productId && disponibles.length > 0) {
      setProductId(disponibles[0].id);
    }
  }, [disponibles.length]);

  if (!product) {
    return (
      <Screen>
        <div style={{ padding: '40px 0', textAlign: 'center', color: MACACO.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sin stock disponible</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Agrega productos en Inventario primero</div>
        </div>
      </Screen>
    );
  }

  const maxQty   = product.stock;
  const total    = price * qty;
  const margen   = total - (product.cost * qty);
  const margenPct = total > 0 ? (margen / total) * 100 : 0;

  const handleSend = async () => {
    if (sending || qty > maxQty) return;
    setSending(true);
    const venta = {
      productoId:     productId,
      producto:       product.name,
      cantidad:       qty,
      precioUnitario: price,
      costoUnitario:  product.cost,
      total,
      margen,
      cliente:        client || null,
      metodoPago:     method,
    };
    registrarVenta(venta);
    registrarMovimiento({
      productoId:   productId,
      producto:     product.name,
      tipo:         'venta',
      delta:        -qty,
      stockAntes:   product.stock,
      stockDespues: Math.max(0, product.stock - qty),
    });
    await sendVenta(venta);
    setSent(true);
    setSending(false);
    setTimeout(() => { go('home'); }, 1400);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Nueva entrada
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>
          Registrar venta
        </div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 4 }}>
          Se guarda localmente y se envía a n8n
        </div>
      </div>

      <SectionTitle>Producto</SectionTitle>
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>
              Precio sugerido {clp(product.price)} · costo {clp(product.cost)} · <span style={{ color: MACACO.cyan }}>{product.stock} en stock</span>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: openPicker ? 'rotate(180deg)' : 'none', transition: '200ms', flexShrink: 0 }}>
            <path d="M3 5l4 4 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {openPicker && (
          <div style={{ borderTop: `1px solid ${MACACO.borderSoft}`, maxHeight: 240, overflowY: 'auto' }}>
            {disponibles.map((p, i) => (
              <button key={p.id}
                onClick={() => { setProductId(p.id); setOpenPicker(false); setQty(1); }}
                style={{
                  width: '100%', background: p.id === productId ? 'rgba(245,197,24,0.06)' : 'transparent',
                  border: 'none', padding: '11px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i === disponibles.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                  cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13.5 }}>{p.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: MACACO.textDim }}>{clp(p.price)}</div>
                  <div style={{ fontSize: 10, color: p.stock <= 3 ? MACACO.primary : MACACO.textMuted, marginTop: 2 }}>
                    {p.stock} en stock
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10, marginBottom: 14 }}>
        <Card padding={14}>
          <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Cantidad
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={stepBtn}>−</button>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: qty > maxQty ? MACACO.danger : '#fff' }}>{qty}</div>
            <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} style={stepBtn}>+</button>
          </div>
          <div style={{ fontSize: 10, color: MACACO.textMuted, textAlign: 'center', marginTop: 6 }}>
            máx {maxQty}
          </div>
        </Card>
        <Card padding={14}>
          <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Precio unitario
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 18, color: MACACO.textMuted, fontWeight: 600, marginRight: 2 }}>$</span>
            <input
              type="text" inputMode="numeric"
              value={price.toLocaleString('es-CL')}
              onChange={(e) => setPrice(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                fontSize: 20, fontWeight: 700, width: '100%', outline: 'none',
                fontVariantNumeric: 'tabular-nums', padding: 0, fontFamily: 'inherit',
              }}
            />
          </div>
        </Card>
      </div>

      <SectionTitle>Cliente <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: MACACO.textMuted }}>(opcional)</span></SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={0}>
        <input
          type="text" value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Nombre o local"
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '14px 16px', color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </Card>

      <SectionTitle>Método de pago</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['Efectivo', 'Transferencia', 'Otro'].map(m => {
          const active = method === m;
          return (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12,
                background: active ? MACACO.primary : MACACO.card,
                color: active ? '#0A0A0F' : '#fff',
                border: `1px solid ${active ? MACACO.primary : MACACO.border}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active ? `0 0 18px ${MACACO.primary}44` : 'none',
              }}
            >{m}</button>
          );
        })}
      </div>

      <Card style={{
        marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(245,197,24,0.06), rgba(0,212,255,0.04))',
        borderColor: 'rgba(245,197,24,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total venta</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(total)}</div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim }}>Margen estimado</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: MACACO.success }}>{clp(margen)}</span>
            <span style={{ fontSize: 12, color: MACACO.success, fontWeight: 600 }}>({margenPct.toFixed(0)}%)</span>
          </div>
        </div>
      </Card>

      {qty > maxQty && (
        <div style={{
          marginBottom: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)',
          fontSize: 12, color: MACACO.danger, fontWeight: 600,
        }}>
          Stock insuficiente — solo hay {maxQty} unidad{maxQty !== 1 ? 'es' : ''}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sent || sending || qty > maxQty || price === 0}
        style={{
          width: '100%', padding: '16px',
          background: sent ? MACACO.success : (qty > maxQty || price === 0) ? MACACO.cardElev : MACACO.primary,
          color: (qty > maxQty || price === 0) ? MACACO.textMuted : '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
          cursor: sent || sending || qty > maxQty || price === 0 ? 'default' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 0 24px ${(sent ? MACACO.success : MACACO.primary)}55`,
          transition: '200ms',
        }}
      >
        {sent ? <><Icon.check size={16} /> VENTA REGISTRADA</>
          : sending ? 'ENVIANDO...'
          : <>REGISTRAR VENTA <Icon.arrowRight size={14} /></>}
      </button>
      <div style={{
        marginTop: 10, textAlign: 'center', fontSize: 11.5,
        color: MACACO.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Dot color={MACACO.success} size={6} />
        Guarda en dispositivo · sincroniza con n8n
      </div>
    </Screen>
  );
}
