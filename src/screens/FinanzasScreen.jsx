import { useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Progress, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { sendDeudaUpdate } from '../services/webhook.js';
import { useApp } from '../store.jsx';
import { gastosDelMes, sumarGastos, MESES } from '../store.jsx';

const ALERTA_GASTOS_NEGOCIO = 273_000;

export default function FinanzasScreen() {
  const { deudas, caja, config, gastos, pagarDeuda, ajustarCaja, agregarDeuda, editarDeuda, eliminarDeuda } = useApp();
  const [pagoSheet, setPagoSheet]   = useState(null);
  const [ajusteCaja, setAjusteCaja] = useState(false);
  const [deudaSheet, setDeudaSheet] = useState(null); // null | 'new' | deuda
  const [gastosExpanded, setGastosExpanded] = useState(false);

  const totalDebt       = deudas.reduce((s, d) => s + d.amt, 0);
  const deudaConInteres = deudas.filter(d => d.rate > 0);
  const interesTotal    = deudaConInteres.reduce((s, d) => s + d.amt * d.rate / 100, 0);
  const pctCaja         = Math.min(100, (caja / 800_000) * 100);
  const cajaSalud       = caja >= 600_000 ? 'Saludable' : caja >= config.colchonMinimo ? 'OK' : 'Crítica';
  const cajaSaludColor  = caja >= 600_000 ? MACACO.success : caja >= config.colchonMinimo ? MACACO.primary : MACACO.danger;

  // Gastos del mes actual y anterior
  const hoy             = new Date();
  const fechaAnt        = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const gMes            = gastosDelMes(gastos, hoy);
  const gMesAnt         = gastosDelMes(gastos, fechaAnt);
  const totalNegocio    = sumarGastos(gMes.filter(g => g.tipo === 'negocio'));
  const totalPersonal   = sumarGastos(gMes.filter(g => g.tipo === 'personal'));
  const totalGastosMes  = totalNegocio + totalPersonal;
  const totalNegocioAnt = sumarGastos(gMesAnt.filter(g => g.tipo === 'negocio'));
  const totalPersonalAnt= sumarGastos(gMesAnt.filter(g => g.tipo === 'personal'));
  const mesNombre       = MESES[hoy.getMonth()];

  const handlePago = async (id, monto) => {
    pagarDeuda(id, monto);
    const deuda = deudas.find(d => d.id === id);
    if (deuda) await sendDeudaUpdate({ ...deuda, amt: Math.max(0, deuda.amt - monto), pago: monto });
    setPagoSheet(null);
  };

  const handleGuardarDeuda = (cambios) => {
    if (deudaSheet === 'new') {
      agregarDeuda(cambios);
      sendDeudaUpdate({ ...cambios, id: 'nueva' });
    } else {
      editarDeuda(deudaSheet.id, cambios);
      sendDeudaUpdate({ ...deudaSheet, ...cambios });
    }
    setDeudaSheet(null);
  };

  const handleEliminarDeuda = (id) => {
    eliminarDeuda(id);
    setDeudaSheet(null);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Salud financiera
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Finanzas</div>
      </div>

      {/* Caja */}
      <Card style={{ marginBottom: 18 }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Caja disponible</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: cajaSaludColor + '18', color: cajaSaludColor,
              fontSize: 11, fontWeight: 600,
            }}>
              <Dot color={cajaSaludColor} size={6} /> {cajaSalud}
            </div>
            <button onClick={() => setAjusteCaja(true)} style={{
              background: 'transparent', border: `1px solid ${MACACO.border}`,
              color: MACACO.textMuted, fontSize: 10, fontWeight: 600,
              padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            }}>Ajustar</button>
          </div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: MACACO.primary }}>{clp(caja)}</div>
        <div style={{ marginTop: 14, position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
            background: `linear-gradient(90deg, ${MACACO.danger} 0%, ${MACACO.primary} 60%, ${MACACO.success} 100%)`,
            borderRadius: 999, opacity: 0.4,
          }} />
          <div style={{
            position: 'absolute',
            left: `calc(${Math.min(96, pctCaja)}% - 7px)`,
            top: -4, width: 14, height: 14, borderRadius: 999,
            background: cajaSaludColor, border: `2px solid ${MACACO.bg}`,
            boxShadow: `0 0 12px ${cajaSaludColor}`,
            transition: 'left 400ms',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: MACACO.textMuted }}>
          <span>Crítico $0</span>
          <span style={{ color: MACACO.danger }}>Mín {clp(config.colchonMinimo)}</span>
          <span>Cómodo $800k</span>
        </div>
      </Card>

      {/* Deudas con interés — alerta */}
      {deudaConInteres.length > 0 && (
        <Card
          accent='rgba(255,77,77,0.3)'
          style={{ marginBottom: 14, background: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))' }}
        >
          <div style={{ fontSize: 10.5, color: MACACO.danger, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            Interés activo · {deudaConInteres.length} deuda{deudaConInteres.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#fff' }}>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{clp(deudaConInteres.reduce((s,d)=>s+d.amt,0))}</b> generan{' '}
            <b style={{ color: MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>{clp(interesTotal)}/mes</b> en pérdidas.
          </div>
        </Card>
      )}

      <SectionTitle right={clp(totalDebt) + ' total'}>Deudas</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {deudas.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '16px 0', color: MACACO.success, fontSize: 13, fontWeight: 600 }}>
              ¡Sin deudas pendientes! 🎉
            </div>
          </Card>
        ) : (
          (() => {
            let urgentCount = 0;
            return deudas.map((d) => {
              const order = d.level === 'urgent' ? ++urgentCount : null;
              return (
                <DebtCard
                  key={d.id}
                  d={{ ...d, order }}
                  onPagar={() => setPagoSheet(d)}
                  onEditar={() => setDeudaSheet(d)}
                />
              );
            });
          })()
        )}
      </div>

      <button
        onClick={() => setDeudaSheet('new')}
        style={{
          width: '100%', padding: '13px', marginBottom: 18,
          background: 'rgba(245,197,24,0.1)', color: MACACO.primary,
          border: `1px solid rgba(245,197,24,0.3)`, borderRadius: 12,
          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '0.03em',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Icon.plus size={13} /> AGREGAR DEUDA
      </button>

      <SectionTitle>Objetivos</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Eliminar deuda total</div>
          <div style={{ fontSize: 12, color: MACACO.textMuted }}>{clp(0)} / {clp(totalDebt)}</div>
        </div>
        <Progress value={0} color={MACACO.danger} height={6} />
      </Card>

      {/* Gastos del mes */}
      <SectionTitle right={totalGastosMes > 0 ? clp(totalGastosMes) + ' total' : undefined}>
        Gastos · {mesNombre}
      </SectionTitle>

      {/* Alerta si gastos negocio superan el umbral */}
      {totalNegocio > ALERTA_GASTOS_NEGOCIO && (
        <Card
          accent='rgba(255,159,64,0.4)'
          style={{ marginBottom: 12, background: 'linear-gradient(135deg, rgba(255,159,64,0.08), rgba(255,159,64,0.02))' }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,159,64,0.15)', color: MACACO.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.warn size={17} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: MACACO.orange, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                Gastos negocio superaron el umbral
              </div>
              <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.45 }}>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{clp(totalNegocio)}</b> vs límite{' '}
                <b style={{ color: MACACO.orange }}>{clp(ALERTA_GASTOS_NEGOCIO)}/mes</b>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI tiles negocio / personal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <GastoTile
          label="Negocio"
          monto={totalNegocio}
          montoAnt={totalNegocioAnt}
          color={MACACO.orange}
        />
        <GastoTile
          label="Personal"
          monto={totalPersonal}
          montoAnt={totalPersonalAnt}
          color={MACACO.cyan}
        />
      </div>

      {/* Lista de gastos */}
      {gMes.length === 0 ? (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ textAlign: 'center', padding: '12px 0', color: MACACO.textMuted, fontSize: 12 }}>
            Sin gastos registrados este mes
          </div>
        </Card>
      ) : (
        <Card padding={0} style={{ marginBottom: 18 }}>
          {(gastosExpanded ? gMes : gMes.slice(0, 5)).map((g, i, arr) => {
            const isLast = i === arr.length - 1 && (!gastosExpanded || gMes.length <= 5);
            const color  = g.tipo === 'negocio' ? MACACO.orange : MACACO.cyan;
            const fecha  = new Date(g.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
            return (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10,
                borderBottom: isLast ? 'none' : `1px solid ${MACACO.borderSoft}`,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                  background: color, boxShadow: `0 0 6px ${color}88`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.categoria}
                  </div>
                  {g.descripcion && (
                    <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 1 }}>{g.descripcion}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {clp(g.monto)}
                  </div>
                  <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 1 }}>{fecha}</div>
                </div>
              </div>
            );
          })}
          {gMes.length > 5 && (
            <button onClick={() => setGastosExpanded(e => !e)} style={{
              width: '100%', padding: '11px',
              background: 'transparent', border: 'none',
              borderTop: `1px solid ${MACACO.borderSoft}`,
              color: MACACO.textDim, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {gastosExpanded ? 'Ver menos' : `Ver los ${gMes.length} gastos`}
            </button>
          )}
        </Card>
      )}

      {pagoSheet && (
        <PagoSheet deuda={pagoSheet} onClose={() => setPagoSheet(null)} onPagar={handlePago} caja={caja} />
      )}
      {ajusteCaja && (
        <AjusteCajaSheet cajaActual={caja} onClose={() => setAjusteCaja(false)} onSave={(v) => { ajustarCaja(v); setAjusteCaja(false); }} />
      )}
      {deudaSheet && (
        <DeudaFormSheet
          deuda={deudaSheet === 'new' ? null : deudaSheet}
          onClose={() => setDeudaSheet(null)}
          onSave={handleGuardarDeuda}
          onDelete={handleEliminarDeuda}
        />
      )}
    </Screen>
  );
}

function GastoTile({ label, monto, montoAnt, color }) {
  const diff    = monto - montoAnt;
  const hasPrev = montoAnt > 0 || monto > 0;

  return (
    <div style={{
      background: MACACO.card, border: `1px solid ${MACACO.border}`,
      borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 3, height: 26,
        background: color, borderRadius: '0 4px 4px 0',
        boxShadow: `0 0 10px ${color}`,
      }} />
      <div style={{ fontSize: 10, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: monto > 0 ? '#fff' : MACACO.textMuted }}>
        {monto > 0 ? clp(monto) : '$0'}
      </div>
      {hasPrev && montoAnt > 0 && (
        <div style={{ fontSize: 10, marginTop: 4, fontVariantNumeric: 'tabular-nums', color: diff > 0 ? MACACO.danger : MACACO.success, fontWeight: 600 }}>
          {diff > 0 ? '+' : ''}{clp(diff)} vs mes ant.
        </div>
      )}
      {montoAnt === 0 && monto === 0 && (
        <div style={{ fontSize: 10, marginTop: 4, color: MACACO.textMuted }}>Sin gastos</div>
      )}
    </div>
  );
}

function DebtCard({ d, onPagar, onEditar }) {
  const palette = {
    urgent: { bg: 'linear-gradient(135deg, rgba(255,77,77,0.10), rgba(255,77,77,0.02))', border: 'rgba(255,77,77,0.35)', accent: MACACO.danger },
    medium: { bg: MACACO.card, border: 'rgba(255,159,64,0.3)',  accent: MACACO.orange },
    low:    { bg: MACACO.card, border: MACACO.border,            accent: 'rgba(255,255,255,0.4)' },
  }[d.level];

  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 16, padding: 14, position: 'relative',
      boxShadow: d.level === 'urgent' ? `0 0 24px rgba(255,77,77,0.08)` : 'none',
    }}>
      {d.level === 'urgent' && (
        <div style={{
          position: 'absolute', left: 0, top: 14, bottom: 14, width: 3,
          background: palette.accent, borderRadius: '0 4px 4px 0',
          boxShadow: `0 0 12px ${palette.accent}`,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{d.who}</div>
          {d.label && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
              padding: '2px 7px', borderRadius: 4,
              background: palette.accent + '22', color: palette.accent,
            }}>{d.label.toUpperCase()}</span>
          )}
        </div>
        {d.order && (
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: 'rgba(255,77,77,0.18)',
            color: MACACO.danger, fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{d.order}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(d.amt)}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: d.rate ? MACACO.danger : MACACO.textMuted }}>
          {d.rate ? d.rate + '% / mes' : 'Sin interés'}
        </div>
      </div>
      {d.rate > 0 && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 10,
          background: 'rgba(255,77,77,0.08)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Interés mensual</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: MACACO.danger }}>-{clp(Math.round(d.amt * d.rate / 100))}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={onPagar}
          style={{
            flex: 1, padding: '10px',
            background: 'transparent', border: `1px solid ${palette.border}`,
            color: palette.accent, fontSize: 12, fontWeight: 700,
            borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          Registrar pago <Icon.arrowRight size={11} />
        </button>
        <button
          onClick={onEditar}
          aria-label="Editar deuda"
          style={{
            width: 42, flexShrink: 0,
            background: 'transparent', border: `1px solid ${palette.border}`,
            color: palette.accent, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon.edit size={14} />
        </button>
      </div>
    </div>
  );
}

function PagoSheet({ deuda, onClose, onPagar, caja }) {
  const [monto, setMonto] = useState(0);
  const montoNum   = Math.min(deuda.amt, monto);
  const sinFondos  = montoNum > caja;
  const canPagar   = montoNum > 0 && !sinFondos;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Registrar pago</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{deuda.who}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>Deuda total: {clp(deuda.amt)}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Monto a pagar</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px',
          }}>
            <span style={{ color: MACACO.textMuted, fontSize: 18, fontWeight: 600 }}>$</span>
            <input
              type="text" inputMode="numeric" autoFocus
              value={monto === 0 ? '' : monto.toLocaleString('es-CL')}
              placeholder="0"
              onChange={e => setMonto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#fff',
                fontSize: 22, fontWeight: 700, outline: 'none', padding: 0, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[deuda.amt, Math.round(deuda.amt / 2), Math.round(deuda.amt * 0.1)].filter(Boolean).slice(0, 3).map((v, i) => (
            <button key={i} onClick={() => setMonto(v)} style={{
              flex: 1, padding: '8px', borderRadius: 8,
              background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              color: MACACO.textDim, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {i === 0 ? 'Todo' : i === 1 ? '50%' : '10%'}
              <div style={{ fontSize: 10, marginTop: 2 }}>{clp(v)}</div>
            </button>
          ))}
        </div>

        {sinFondos && (
          <div style={{
            marginBottom: 10, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)',
            fontSize: 12, color: MACACO.danger, fontWeight: 600,
          }}>
            Caja insuficiente — tenés {clp(caja)} disponible
          </div>
        )}

        <button
          onClick={() => canPagar && onPagar(deuda.id, montoNum)}
          disabled={!canPagar}
          style={{
            width: '100%', padding: '15px',
            background: canPagar ? MACACO.primary : MACACO.cardElev,
            color: canPagar ? '#0A0A0F' : MACACO.textMuted,
            border: canPagar ? 'none' : `1px solid ${MACACO.border}`,
            borderRadius: 12, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
            cursor: canPagar ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: canPagar ? `0 0 20px ${MACACO.primary}44` : 'none',
          }}
        >
          {canPagar ? `PAGAR ${clp(montoNum)}` : 'INGRESA UN MONTO'}
        </button>
      </div>
    </div>
  );
}

function AjusteCajaSheet({ cajaActual, onClose, onSave }) {
  const [valor, setValor] = useState(cajaActual);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
        <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>Ajustar caja</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Ingresa el valor real</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          borderRadius: 10, padding: '12px 14px', marginBottom: 18,
        }}>
          <span style={{ color: MACACO.textMuted, fontSize: 18, fontWeight: 600 }}>$</span>
          <input
            type="text" inputMode="numeric" autoFocus
            value={valor === 0 ? '' : valor.toLocaleString('es-CL')}
            placeholder="0"
            onChange={e => setValor(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: '#fff',
              fontSize: 22, fontWeight: 700, outline: 'none', padding: 0, fontFamily: 'inherit',
            }}
          />
        </div>
        <button onClick={() => onSave(valor)} style={{
          width: '100%', padding: '15px',
          background: MACACO.primary, color: '#0A0A0F',
          border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: `0 0 20px ${MACACO.primary}44`,
        }}>
          GUARDAR
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
};
const textInputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
  borderRadius: 10, padding: '12px 14px',
  color: '#fff', fontSize: 15, fontWeight: 500,
  outline: 'none', fontFamily: 'inherit',
};

function DeudaFormSheet({ deuda, onClose, onSave, onDelete }) {
  const isNew = !deuda;
  const [who, setWho]     = useState(deuda?.who || '');
  const [amt, setAmt]     = useState(deuda?.amt || 0);
  const [rate, setRate]   = useState(deuda?.rate || 0);
  const [level, setLevel] = useState(deuda?.level || 'low');
  const [label, setLabel] = useState(deuda?.label || '');

  const canSave = who.trim().length > 0 && amt > 0;

  const levelOpts = [
    { id: 'urgent', label: 'Urgente', color: MACACO.danger },
    { id: 'medium', label: 'Media',   color: MACACO.orange },
    { id: 'low',    label: 'Baja',    color: MACACO.textMuted },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', maxHeight: '90%', overflowY: 'auto',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {isNew ? 'Nueva deuda' : 'Editar deuda'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{isNew ? 'Agregar deuda' : deuda.who}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nombre</label>
          <input
            value={who} onChange={e => setWho(e.target.value)}
            placeholder="Ej. Roxana" autoFocus={isNew}
            style={textInputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Monto de la deuda</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px',
          }}>
            <span style={{ color: MACACO.textMuted, fontSize: 18, fontWeight: 600 }}>$</span>
            <input
              type="text" inputMode="numeric"
              value={amt === 0 ? '' : amt.toLocaleString('es-CL')}
              placeholder="0"
              onChange={e => setAmt(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#fff',
                fontSize: 22, fontWeight: 700, outline: 'none', padding: 0, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Interés mensual</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px',
          }}>
            <input
              type="text" inputMode="decimal"
              value={rate === 0 ? '' : String(rate)}
              placeholder="0"
              onChange={e => {
                const v = e.target.value.replace(/[^\d.]/g, '');
                setRate(v === '' ? 0 : Math.min(100, parseFloat(v) || 0));
              }}
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#fff',
                fontSize: 22, fontWeight: 700, outline: 'none', padding: 0, fontFamily: 'inherit',
              }}
            />
            <span style={{ color: MACACO.textMuted, fontSize: 15, fontWeight: 600 }}>% / mes</span>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Prioridad</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {levelOpts.map(o => {
              const active = level === o.id;
              return (
                <button key={o.id} onClick={() => setLevel(o.id)} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10,
                  background: active ? o.color + '18' : MACACO.cardElev,
                  border: `1px solid ${active ? o.color + '55' : MACACO.border}`,
                  color: active ? o.color : MACACO.textDim,
                  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Nota (opcional)</label>
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Ej. Sin interés · largo plazo"
            style={textInputStyle}
          />
        </div>

        <button
          onClick={() => canSave && onSave({ who: who.trim(), amt, rate, level, label: label.trim() })}
          disabled={!canSave}
          style={{
            width: '100%', padding: '15px',
            background: canSave ? MACACO.primary : MACACO.cardElev,
            color: canSave ? '#0A0A0F' : MACACO.textMuted,
            border: canSave ? 'none' : `1px solid ${MACACO.border}`,
            borderRadius: 12, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: canSave ? `0 0 20px ${MACACO.primary}44` : 'none',
          }}
        >
          {canSave ? (isNew ? 'AGREGAR DEUDA' : 'GUARDAR CAMBIOS') : 'COMPLETA LOS CAMPOS'}
        </button>

        {!isNew && (
          <button
            onClick={() => { if (window.confirm(`¿Eliminar la deuda de ${deuda.who}?`)) onDelete(deuda.id); }}
            style={{
              width: '100%', padding: '12px', marginTop: 10,
              background: 'transparent', border: 'none',
              color: MACACO.danger, fontSize: 12.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon.trash size={13} /> Eliminar deuda
          </button>
        )}
      </div>
    </div>
  );
}
