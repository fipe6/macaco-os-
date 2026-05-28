import { useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { sendProducto } from '../services/webhook.js';

const INVENTORY = [
  { name: 'Proteína Grizzly', stock: 8, cost: 20000, price: 36000, status: 'ok' },
  { name: 'Creatina Dragón Pharma', stock: 12, cost: 9000, price: 17500, status: 'ok' },
  { name: 'Creatina Inner Armour', stock: 6, cost: 8000, price: 15000, status: 'ok' },
  { name: 'Omega 3', stock: 5, cost: 7000, price: 13000, status: 'ok' },
  { name: 'Ashwaganda', stock: 3, cost: 8000, price: 15000, status: 'low' },
  { name: 'Glicinato de Magnesio', stock: 7, cost: 8000, price: 15000, status: 'ok' },
  { name: 'Colágeno 90 tabs', stock: 4, cost: 9500, price: 18000, status: 'low' },
  { name: 'Pre-entreno Edge Insanity', stock: 6, cost: 14000, price: 28000, status: 'ok' },
  { name: 'Creatina Gummy', stock: 0, cost: 9000, price: 16000, status: 'out' },
];

const stepBtn = {
  width: 34, height: 34, borderRadius: 8,
  background: MACACO.cardElev, color: '#fff',
  border: `1px solid ${MACACO.border}`,
  fontSize: 18, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function InventarioScreen() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(INVENTORY);
  const [showAdd, setShowAdd] = useState(false);
  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
  const totalCost = items.reduce((s, i) => s + i.stock * i.cost, 0);
  const totalSale = items.reduce((s, i) => s + i.stock * i.price, 0);

  const addProduct = async (p) => {
    const status = p.stock === 0 ? 'out' : p.stock <= 3 ? 'low' : 'ok';
    const newItem = { ...p, status, isNew: true };
    setItems(prev => [newItem, ...prev]);
    setShowAdd(false);
    await sendProducto(newItem);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Stock en tiempo real
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Inventario</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: MACACO.card, border: `1px solid ${MACACO.border}`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 14,
      }}>
        <span style={{ color: MACACO.textMuted, display: 'flex' }}><Icon.search /></span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar producto..."
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#fff',
            outline: 'none', fontSize: 14, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <SummaryTile label="OK" value={items.filter(i=>i.status==='ok').length} color={MACACO.success} />
        <SummaryTile label="Poco" value={items.filter(i=>i.status==='low').length} color={MACACO.primary} />
        <SummaryTile label="Sin stock" value={items.filter(i=>i.status==='out').length} color={MACACO.danger} />
      </div>

      <Card padding={0} style={{ marginBottom: 16 }}>
        {filtered.map((item, i) => {
          const margin = ((item.price - item.cost) / item.price * 100);
          const statusColor = item.status === 'ok' ? MACACO.success : item.status === 'low' ? MACACO.primary : MACACO.danger;
          return (
            <div key={i} style={{
              padding: '14px',
              borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot color={statusColor} size={8} />
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    {item.isNew && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(245,197,24,0.18)', color: MACACO.primary,
                      }}>NUEVO</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: MACACO.textDim, flexWrap: 'wrap' }}>
                    <span><span style={{ color: MACACO.textMuted }}>Costo</span> {clpCompact(item.cost)}</span>
                    <span><span style={{ color: MACACO.textMuted }}>Venta</span> {clpCompact(item.price)}</span>
                    <span><span style={{ color: MACACO.textMuted }}>Margen</span> <b style={{ color: MACACO.success, fontWeight: 600 }}>{margin.toFixed(0)}%</b></span>
                  </div>
                  {item.status === 'out' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: MACACO.danger, fontWeight: 600 }}>¡Reponer ya!</div>
                  )}
                  {item.status === 'low' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: MACACO.primary, fontWeight: 600 }}>Stock bajo — reordenar pronto</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
                    color: item.stock === 0 ? MACACO.danger : '#fff',
                  }}>{item.stock}</div>
                  <div style={{ fontSize: 10, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.08em' }}>UNID.</div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle style={{ marginBottom: 12 }}>Totales</SectionTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
          <span style={{ fontSize: 12.5, color: MACACO.textDim }}>Valor (costo)</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{clp(totalCost)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: `1px solid ${MACACO.borderSoft}` }}>
          <span style={{ fontSize: 12.5, color: MACACO.textDim }}>Valor (venta)</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: MACACO.cyan }}>~{clp(totalSale)}</span>
        </div>
      </Card>

      <button
        onClick={() => setShowAdd(true)}
        style={{
          width: '100%', padding: '14px',
          background: MACACO.primary, color: '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '0.03em',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 0 18px ${MACACO.primary}44`,
        }}
      >
        <Icon.plus size={15}/> AGREGAR PRODUCTO
      </button>

      {showAdd && <AddProductSheet onClose={() => setShowAdd(false)} onSave={addProduct} />}
    </Screen>
  );
}

function SummaryTile({ label, value, color }) {
  return (
    <div style={{
      background: MACACO.card, border: `1px solid ${MACACO.border}`,
      borderRadius: 12, padding: '10px 12px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
      <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function AddProductSheet({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(1);

  const margin = price > 0 ? ((price - cost) / price * 100) : 0;
  const canSave = name.trim() && cost > 0 && price > 0;

  const numInput = (val, setVal, prefix) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      {prefix && <span style={{ color: MACACO.textMuted, fontSize: 15, fontWeight: 600 }}>{prefix}</span>}
      <input
        type="text" inputMode="numeric"
        value={val === 0 ? '' : val.toLocaleString('es-CL')}
        placeholder="0"
        onChange={e => setVal(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        style={{
          flex: 1, background: 'transparent', border: 'none', color: '#fff',
          fontSize: 16, fontWeight: 700, outline: 'none',
          padding: 0, fontFamily: 'inherit', minWidth: 0, width: '100%',
        }}
      />
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      animation: 'fadeUp 220ms cubic-bezier(.2,.7,.2,1)',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 28px',
        maxHeight: '90%', overflowY: 'auto',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 999,
          background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px',
        }}/>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Nuevo producto</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Agregar al inventario</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nombre del producto</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Ej. BCAA Premium"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              borderRadius: 10, padding: '12px 14px',
              color: '#fff', fontSize: 15, fontWeight: 500,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Costo unitario</label>
            {numInput(cost, setCost, '$')}
          </div>
          <div>
            <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Precio venta</label>
            {numInput(price, setPrice, '$')}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cantidad inicial</label>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '8px 12px',
          }}>
            <button onClick={() => setStock(s => Math.max(0, s - 1))} style={stepBtn}>−</button>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stock} <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>UND</span></div>
            <button onClick={() => setStock(s => s + 1)} style={stepBtn}>+</button>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245,197,24,0.06), rgba(0,212,255,0.04))',
          border: '1px solid rgba(245,197,24,0.2)',
          borderRadius: 12, padding: 12, marginBottom: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Margen</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: margin > 0 ? MACACO.success : MACACO.textMuted }}>
              {margin > 0 ? margin.toFixed(0) + '%' : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Inversión inicial</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{clp(cost * stock)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Valor potencial</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: MACACO.cyan }}>{clp(price * stock)}</span>
          </div>
        </div>

        <button
          onClick={() => canSave && onSave({ name: name.trim(), cost, price, stock })}
          disabled={!canSave}
          style={{
            width: '100%', padding: '15px',
            background: canSave ? MACACO.primary : MACACO.cardElev,
            color: canSave ? '#0A0A0F' : MACACO.textMuted,
            border: canSave ? 'none' : `1px solid ${MACACO.border}`,
            borderRadius: 12,
            fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: canSave ? `0 0 20px ${MACACO.primary}44` : 'none',
          }}
        >
          {canSave ? 'GUARDAR PRODUCTO' : 'COMPLETA LOS CAMPOS'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: MACACO.textMuted }}>
          Se sincroniza vía webhook a n8n
        </div>
      </div>
    </div>
  );
}
