import { useState, useEffect, useRef, useMemo } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Progress, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import {
  useApp, calcBalancePersonal, calcGastoPersonalReal, proyectarPatrimonio,
  alertasVencimiento, saldoPasivo, saldoPorCobrar,
  interesDevengado, interesTotal, pagadoPasivo, pagadoExterno,
  mesKey, mesLabel, MESES,
} from '../store.jsx';

const TABS = [
  { id: 'balance',    label: 'Balance' },
  { id: 'cobrar',     label: 'Por cobrar' },
  { id: 'deudas',     label: 'Deudas' },
  { id: 'metas',      label: 'Metas' },
  { id: 'proyeccion', label: 'Proyección' },
];

export default function PersonalScreen({ go }) {
  const app = useApp();
  const {
    activos, porCobrar, pasivos, metas, planPersonal, patrimonio,
    productos, gastos, snapshotPatrimonio,
  } = app;

  const [tab, setTab] = useState('balance');

  const balance = useMemo(
    () => calcBalancePersonal({ activos, porCobrar, pasivos, productos }),
    [activos, porCobrar, pasivos, productos],
  );

  // Un punto de evolución por día, al abrir la pantalla.
  const yaGuardado = useRef(false);
  useEffect(() => {
    if (yaGuardado.current) return;
    yaGuardado.current = true;
    snapshotPatrimonio({
      activos: balance.totalActivos,
      pasivos: balance.totalPasivos,
      neto:    balance.neto,
    });
  }, [balance, snapshotPatrimonio]);

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => go('finanzas')} style={{
            background: 'transparent', border: 'none', color: MACACO.textMuted,
            padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
            fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ display: 'inline-block', transform: 'rotate(180deg)', lineHeight: 0 }}>
              <Icon.arrowRight size={11} />
            </span>
            Finanzas
          </button>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>
          Finanzas Personales
        </div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 4 }}>
          Patrimonio, deudas, cobros y proyección
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto',
        paddingBottom: 2, scrollbarWidth: 'none',
      }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: '8px 13px', borderRadius: 999,
              background: active ? MACACO.primary : MACACO.card,
              color: active ? '#0A0A0F' : MACACO.textDim,
              border: `1px solid ${active ? MACACO.primary : MACACO.border}`,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? `0 0 18px ${MACACO.primary}44` : 'none',
              transition: '160ms',
            }}>{t.label}</button>
          );
        })}
      </div>

      {tab === 'balance'    && <BalanceTab balance={balance} patrimonio={patrimonio} app={app} />}
      {tab === 'cobrar'     && <CobrarTab app={app} />}
      {tab === 'deudas'     && <DeudasTab app={app} />}
      {tab === 'metas'      && <MetasTab app={app} balance={balance} />}
      {tab === 'proyeccion' && <ProyeccionTab balance={balance} plan={planPersonal} pasivos={pasivos} app={app} />}
    </Screen>
  );
}

// ── Balance general ───────────────────────────────────────────────────────────
function BalanceTab({ balance, patrimonio, app }) {
  const { activos, pasivos, gastos, agregarActivo, editarActivo, eliminarActivo } = app;
  const [sheet, setSheet] = useState(null); // null | 'new' | activo

  const negativo = balance.neto < 0;
  const color    = negativo ? MACACO.danger : MACACO.success;
  const gasto    = calcGastoPersonalReal(gastos, pasivos);
  const alertas  = alertasVencimiento(pasivos, 120);

  return (
    <>
      <Card padding={18} style={{
        marginBottom: 14,
        background: negativo
          ? 'linear-gradient(135deg, rgba(255,77,77,0.09), rgba(255,77,77,0.02))'
          : 'linear-gradient(135deg, rgba(0,230,118,0.09), rgba(0,230,118,0.02))',
        borderColor: negativo ? 'rgba(255,77,77,0.3)' : 'rgba(0,230,118,0.3)',
      }}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Patrimonio neto
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color, marginTop: 6 }}>
          {clp(balance.neto)}
        </div>
        <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>
          Activos {clp(balance.totalActivos)} − Pasivos {clp(balance.totalPasivos)}
        </div>
        {balance.totalPasivos !== balance.pasivosHoy && (
          <div style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 6 }}>
            Exigible hoy: <b style={{ color: '#fff' }}>{clp(balance.netoHoy)}</b>
            <span style={{ color: MACACO.textMuted }}> — el resto es interés que aún no corre</span>
          </div>
        )}
        <NetoChart puntos={patrimonio} />
      </Card>

      {alertas.length > 0 && (
        <Card accent="rgba(255,159,64,0.35)" style={{
          marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(255,159,64,0.08), rgba(255,159,64,0.02))',
        }}>
          <div style={{ fontSize: 10.5, color: MACACO.orange, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.warn size={13} /> Vencimientos
          </div>
          {alertas.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <span style={{ fontSize: 13 }}>
                {a.acreedor}
                <span style={{ color: MACACO.textMuted, fontSize: 11.5 }}>
                  {' '}· {a.diasRestantes > 0 ? `en ${a.diasRestantes} días` : 'vencida'}
                </span>
              </span>
              <b style={{ fontSize: 13.5, color: MACACO.orange, fontVariantNumeric: 'tabular-nums' }}>{clp(a.saldo)}</b>
            </div>
          ))}
        </Card>
      )}

      <SectionTitle right={clp(balance.totalActivos)}>Activos</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <MiniStat label="Líquido"    monto={balance.liquido}     color={MACACO.primary} />
        <MiniStat label="Por cobrar" monto={balance.totalCobrar} color={MACACO.cyan} />
        <MiniStat label="Inventario" monto={balance.inventario}  color={MACACO.success} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {activos.map(a => (
          <Card key={a.id} padding={13} onClick={() => setSheet(a)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {a.nombre}
                  {a.reservado && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                      padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(0,212,255,0.16)', color: MACACO.cyan,
                    }}>INTOCABLE</span>
                  )}
                </div>
                {a.nota && (
                  <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 3 }}>{a.nota}</div>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 10 }}>
                {clp(a.monto)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AddButton label="Agregar cuenta" onClick={() => setSheet('new')} />

      {balance.reservado > 0 && (
        <Card padding={13} style={{ marginTop: 12, marginBottom: 14, borderColor: 'rgba(0,212,255,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: MACACO.textDim }}>Reservado (no se toca)</span>
            <b style={{ color: MACACO.cyan, fontVariantNumeric: 'tabular-nums' }}>{clp(balance.reservado)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
            <span style={{ color: MACACO.textDim }}>Disponible para operar</span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{clp(balance.disponible)}</b>
          </div>
        </Card>
      )}

      <SectionTitle right={clp(balance.totalPasivos)} style={{ marginTop: 18 }}>Pasivos</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {pasivos.length === 0 ? (
          <Card><div style={{ textAlign: 'center', padding: '14px 0', color: MACACO.success, fontSize: 13, fontWeight: 600 }}>Sin pasivos 🎉</div></Card>
        ) : pasivos.map(p => (
          <Card key={p.id} padding={13}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.acreedor}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>
                {clp(saldoPasivo(p))}
              </div>
            </div>
            {p.nota && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 4 }}>{p.nota}</div>}
          </Card>
        ))}
      </div>

      {/* Gasto personal real del mes */}
      <SectionTitle>Gasto personal real · {MESES[new Date().getMonth()]}</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <Fila label="Gastos personales"          valor={gasto.gastosPropios} />
        <Fila label="Deuda pagada (propio)"      valor={gasto.deudaPropia} />
        <Fila label="Deuda pagada (beca/externo)" valor={gasto.deudaExterna} color={MACACO.cyan} tachado />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Salió de tu bolsillo</span>
          <b style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{clp(gasto.real)}</b>
        </div>
        <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>
          Pasivo total abonado este mes: {clp(gasto.totalPasivoPagado)} — el aporte externo baja la deuda sin costo propio.
        </div>
      </Card>

      {sheet && (
        <ActivoSheet
          activo={sheet === 'new' ? null : sheet}
          onClose={() => setSheet(null)}
          onGuardar={(datos) => {
            if (sheet === 'new') agregarActivo(datos);
            else editarActivo(sheet.id, datos);
            setSheet(null);
          }}
          onEliminar={sheet !== 'new' ? () => { eliminarActivo(sheet.id); setSheet(null); } : null}
        />
      )}
    </>
  );
}

// Evolución del patrimonio neto — línea simple sobre los snapshots guardados.
function NetoChart({ puntos }) {
  if (!puntos || puntos.length < 2) {
    return (
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 14 }}>
        La evolución se dibuja a partir del segundo día de uso.
      </div>
    );
  }
  const datos = puntos.slice(-30);
  const vals  = datos.map(p => p.neto);
  const min   = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const W = 320, H = 54;
  const coords = datos.map((p, i) => [
    (i / (datos.length - 1)) * W,
    H - ((p.neto - min) / rango) * (H - 6) - 3,
  ]);
  const path  = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const sube  = vals[vals.length - 1] >= vals[0];
  const color = sube ? MACACO.success : MACACO.danger;

  return (
    <div style={{ marginTop: 14 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        {min < 0 && max > 0 && (
          <line x1="0" x2={W} y1={H - ((0 - min) / rango) * (H - 6) - 3} y2={H - ((0 - min) / rango) * (H - 6) - 3}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3" fill={color} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MACACO.textMuted, marginTop: 4 }}>
        <span>{datos[0].fecha}</span>
        <span>{datos.length} registro{datos.length > 1 ? 's' : ''}</span>
        <span>{datos[datos.length - 1].fecha}</span>
      </div>
    </div>
  );
}

// ── Cuentas por cobrar ────────────────────────────────────────────────────────
function CobrarTab({ app }) {
  const { porCobrar, agregarPorCobrar, abonarPorCobrar, eliminarPorCobrar } = app;
  const [sheet, setSheet]   = useState(null); // null | 'new'
  const [abono, setAbono]   = useState(null); // cuenta
  const [abierto, setAbierto] = useState(null);

  const total   = porCobrar.reduce((s, c) => s + saldoPorCobrar(c), 0);
  const cobrado = porCobrar.reduce((s, c) => s + (c.original - saldoPorCobrar(c)), 0);

  return (
    <>
      <Card padding={18} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Por cobrar
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: MACACO.cyan, marginTop: 6, letterSpacing: '-0.02em' }}>
          {clp(total)}
        </div>
        <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>
          {porCobrar.length} persona{porCobrar.length === 1 ? '' : 's'} · {clp(cobrado)} ya recuperado
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {porCobrar.length === 0 && (
          <Card><div style={{ textAlign: 'center', padding: '16px 0', color: MACACO.textMuted, fontSize: 13 }}>Nadie te debe plata.</div></Card>
        )}
        {porCobrar.map(c => {
          const saldo   = saldoPorCobrar(c);
          const pagado  = c.original - saldo;
          const pct     = c.original > 0 ? (pagado / c.original) * 100 : 0;
          const listo   = saldo === 0;
          const open    = abierto === c.id;
          return (
            <Card key={c.id} padding={14} accent={listo ? 'rgba(0,230,118,0.3)' : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {c.persona}
                  {listo && <Dot color={MACACO.success} size={7} />}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: listo ? MACACO.success : '#fff' }}>
                  {clp(saldo)}
                </div>
              </div>
              {pagado > 0 && (
                <>
                  <div style={{ marginTop: 10 }}><Progress value={pct} color={MACACO.success} height={5} /></div>
                  <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 5 }}>
                    {clp(pagado)} de {clp(c.original)} · {Math.round(pct)}%
                  </div>
                </>
              )}
              {c.nota && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>{c.nota}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {!listo && (
                  <button onClick={() => setAbono(c)} style={btnGhost(MACACO.cyan)}>
                    Registrar abono <Icon.arrowRight size={11} />
                  </button>
                )}
                {(c.abonos || []).length > 0 && (
                  <button onClick={() => setAbierto(open ? null : c.id)} style={{ ...btnGhost(MACACO.textDim), flex: listo ? 1 : 0, padding: '10px 12px' }}>
                    {open ? 'Ocultar' : `Historial (${c.abonos.length})`}
                  </button>
                )}
                <button onClick={() => eliminarPorCobrar(c.id)} aria-label="Eliminar cuenta" style={{ ...btnGhost(MACACO.textMuted), flex: 0, width: 42, padding: 0 }}>
                  <Icon.trash size={13} />
                </button>
              </div>

              {open && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${MACACO.borderSoft}`, paddingTop: 8 }}>
                  {[...c.abonos].reverse().map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '3px 0', color: MACACO.textDim }}>
                      <span>{new Date(a.fecha).toLocaleDateString('es-CL')}</span>
                      <b style={{ color: MACACO.success, fontVariantNumeric: 'tabular-nums' }}>+{clp(a.monto)}</b>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <AddButton label="Agregar cuenta por cobrar" onClick={() => setSheet('new')} />

      {sheet && (
        <CobrarSheet onClose={() => setSheet(null)} onGuardar={(d) => { agregarPorCobrar(d); setSheet(null); }} />
      )}
      {abono && (
        <AbonoSheet
          cuenta={abono}
          onClose={() => setAbono(null)}
          onAbonar={(monto, aCaja) => { abonarPorCobrar(abono.id, monto, aCaja); setAbono(null); }}
        />
      )}
    </>
  );
}

// ── Pasivos / deudas personales ───────────────────────────────────────────────
function DeudasTab({ app }) {
  const { pasivos, agregarPasivo, pagarPasivo, eliminarPasivo } = app;
  const [sheet, setSheet] = useState(null);
  const [pago, setPago]   = useState(null);
  const hoy = mesKey();

  const total = pasivos.reduce((s, p) => s + saldoPasivo(p), 0);

  return (
    <>
      <Card padding={18} style={{
        marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))',
        borderColor: 'rgba(255,77,77,0.28)',
      }}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Deuda personal total
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: MACACO.danger, marginTop: 6, letterSpacing: '-0.02em' }}>
          {clp(total)}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {pasivos.map(p => {
          const saldo    = saldoPasivo(p);
          const devengado = interesDevengado(p);
          const iTotal   = interesTotal(p);
          const pagado   = pagadoPasivo(p);
          const externo  = pagadoExterno(p);
          const pct      = (p.capital + iTotal) > 0 ? (pagado / (p.capital + iTotal)) * 100 : 0;
          return (
            <Card key={p.id} padding={14} accent={saldo === 0 ? 'rgba(0,230,118,0.3)' : 'rgba(255,77,77,0.28)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.acreedor}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: saldo === 0 ? MACACO.success : '#fff' }}>
                  {clp(saldo)}
                </div>
              </div>
              {p.nota && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 4 }}>{p.nota}</div>}

              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                <Fila label="Capital" valor={p.capital} small />
                {iTotal > 0 && (
                  <>
                    <Fila label="Interés total del plan" valor={iTotal} color={MACACO.danger} small />
                    <Fila label="Interés ya corrido" valor={devengado} color={MACACO.orange} small />
                  </>
                )}
                {pagado > 0 && <Fila label="Pagado" valor={pagado} color={MACACO.success} small />}
                {externo > 0 && <Fila label="— de eso, externo" valor={externo} color={MACACO.cyan} small />}
              </div>

              {(p.tramos || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Tramos de interés
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.tramos.map(t => {
                      const corrido = t.mes <= hoy;
                      return (
                        <div key={t.mes} style={{
                          flex: 1, padding: '7px 4px', borderRadius: 8, textAlign: 'center',
                          background: corrido ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${corrido ? 'rgba(255,77,77,0.3)' : MACACO.border}`,
                        }}>
                          <div style={{ fontSize: 9.5, color: MACACO.textMuted, textTransform: 'capitalize' }}>
                            {mesLabel(t.mes).split(' ')[0].slice(0, 3)}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: corrido ? MACACO.danger : MACACO.textDim, marginTop: 2 }}>
                            {t.tasa}%
                          </div>
                          <div style={{ fontSize: 9, color: MACACO.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {clpCompact(p.capital * t.tasa / 100)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {p.abonoMensual > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: MACACO.textDim }}>
                  Abono mensual {clp(p.abonoMensual)}
                  {p.aporteExterno > 0 && (
                    <span style={{ color: MACACO.cyan }}> · {clp(p.aporteExterno)} externo</span>
                  )}
                  {saldo > 0 && (
                    <span style={{ color: MACACO.textMuted }}>
                      {' '}· ≈{Math.ceil(saldo / p.abonoMensual)} meses restantes
                    </span>
                  )}
                </div>
              )}
              {p.vencimiento && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: MACACO.orange }}>
                  Vence {new Date(p.vencimiento + 'T12:00:00').toLocaleDateString('es-CL')}
                </div>
              )}

              {pagado > 0 && <div style={{ marginTop: 10 }}><Progress value={pct} color={MACACO.success} height={5} /></div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {saldo > 0 && (
                  <button onClick={() => setPago(p)} style={btnGhost(MACACO.danger)}>
                    Registrar pago <Icon.arrowRight size={11} />
                  </button>
                )}
                <button onClick={() => eliminarPasivo(p.id)} aria-label="Eliminar pasivo" style={{ ...btnGhost(MACACO.textMuted), flex: saldo > 0 ? 0 : 1, width: saldo > 0 ? 42 : undefined, padding: saldo > 0 ? 0 : '10px' }}>
                  <Icon.trash size={13} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <AddButton label="Agregar deuda personal" onClick={() => setSheet('new')} />

      {sheet && <PasivoSheet onClose={() => setSheet(null)} onGuardar={(d) => { agregarPasivo(d); setSheet(null); }} />}
      {pago && (
        <PagoPasivoSheet
          pasivo={pago}
          onClose={() => setPago(null)}
          onPagar={(monto, externo) => { pagarPasivo(pago.id, monto, externo); setPago(null); }}
        />
      )}
    </>
  );
}

// ── Metas de ahorro ───────────────────────────────────────────────────────────
function MetasTab({ app, balance }) {
  const { metas, agregarMeta, aportarMeta, eliminarMeta } = app;
  const [sheet, setSheet]   = useState(null);
  const [aporte, setAporte] = useState(null);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {metas.length === 0 && (
          <Card><div style={{ textAlign: 'center', padding: '16px 0', color: MACACO.textMuted, fontSize: 13 }}>Sin metas de ahorro todavía.</div></Card>
        )}
        {metas.map(m => {
          const pct     = m.objetivo > 0 ? Math.min(100, (m.acumulado / m.objetivo) * 100) : 0;
          const falta   = Math.max(0, m.objetivo - m.acumulado);
          const listo   = falta === 0;
          const color   = listo ? MACACO.success : MACACO.primary;
          let mesesRest = null;
          if (m.fechaLimite) {
            const d = new Date(m.fechaLimite + 'T12:00:00');
            mesesRest = Math.max(0, Math.round((d - new Date()) / (30 * 86_400_000)));
          }
          return (
            <Card key={m.id} padding={16} accent={listo ? 'rgba(0,230,118,0.3)' : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{m.nombre}</div>
                <div style={{ fontSize: 12, color, fontWeight: 700 }}>{Math.round(pct)}%</div>
              </div>
              <Progress value={pct} color={color} height={8} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clp(m.acumulado)}</span>
                <span style={{ color: MACACO.textMuted, fontVariantNumeric: 'tabular-nums' }}>meta {clp(m.objetivo)}</span>
              </div>
              {!listo && (
                <div style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 8 }}>
                  Faltan <b style={{ color: '#fff' }}>{clp(falta)}</b>
                  {mesesRest !== null && mesesRest > 0 && (
                    <> · {clp(Math.round(falta / mesesRest))}/mes por {mesesRest} mes{mesesRest === 1 ? '' : 'es'}</>
                  )}
                </div>
              )}
              {m.nota && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>{m.nota}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setAporte(m)} style={btnGhost(color)}>
                  Aportar <Icon.arrowRight size={11} />
                </button>
                <button onClick={() => eliminarMeta(m.id)} aria-label="Eliminar meta" style={{ ...btnGhost(MACACO.textMuted), flex: 0, width: 42, padding: 0 }}>
                  <Icon.trash size={13} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <AddButton label="Nueva meta de ahorro" onClick={() => setSheet('new')} />

      <Card padding={13} style={{ marginTop: 14, borderColor: 'rgba(0,212,255,0.25)' }}>
        <div style={{ fontSize: 10.5, color: MACACO.cyan, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Reglas de protección
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: MACACO.textDim, lineHeight: 1.6 }}>
          <li>La reserva marcada como intocable ({clp(balance.reservado)}) no se mezcla con caja operativa.</li>
          <li>El capital de reinversión se usa en tandas, no todo de una vez.</li>
          <li>El fondo de una meta queda líquido y bajo control directo — sin inversiones de terceros.</li>
        </ul>
      </Card>

      {sheet && <MetaSheet onClose={() => setSheet(null)} onGuardar={(d) => { agregarMeta(d); setSheet(null); }} />}
      {aporte && (
        <MontoSheet
          titulo="Aportar a meta" subtitulo={aporte.nombre}
          detalle={`Acumulado ${clp(aporte.acumulado)} de ${clp(aporte.objetivo)}`}
          sugerencias={[Math.max(0, aporte.objetivo - aporte.acumulado), 100_000, 50_000]}
          onClose={() => setAporte(null)}
          onConfirmar={(monto) => { aportarMeta(aporte.id, monto); setAporte(null); }}
        />
      )}
    </>
  );
}

// ── Proyección ────────────────────────────────────────────────────────────────
function ProyeccionTab({ balance, plan, pasivos, app }) {
  const { setPlanPersonal } = app;
  const filas = useMemo(() => proyectarPatrimonio({ balance, plan, pasivos }), [balance, plan, pasivos]);
  const ultima = filas[filas.length - 1];
  const campos = [
    ['sueldoNegocio',    'Sueldo del negocio'],
    ['margenPertigas',   'Margen pértigas'],
    ['gananciaCreatina', 'Ganancia creatina'],
    ['gastoPersonal',    'Gasto personal'],
    ['abonoPropio',      'Abono deuda (propio)'],
    ['abonoExterno',     'Abono deuda (externo)'],
  ];

  return (
    <>
      <Card padding={18} style={{
        marginBottom: 14,
        background: ultima.neto >= 0
          ? 'linear-gradient(135deg, rgba(0,230,118,0.09), rgba(0,230,118,0.02))'
          : 'linear-gradient(135deg, rgba(255,77,77,0.09), rgba(255,77,77,0.02))',
        borderColor: ultima.neto >= 0 ? 'rgba(0,230,118,0.3)' : 'rgba(255,77,77,0.3)',
      }}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Patrimonio proyectado
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em', color: ultima.neto >= 0 ? MACACO.success : MACACO.danger }}>
          {clp(ultima.neto)}
        </div>
        <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>
          A {ultima.label.toLowerCase()} · base {clp(balance.netoHoy)} exigible hoy
        </div>
      </Card>

      <SectionTitle>Plan mensual</SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={14}>
        {campos.map(([key, label], i) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0',
            borderBottom: i === campos.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
          }}>
            <span style={{ fontSize: 12.5, color: MACACO.textDim }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ color: MACACO.textMuted, fontSize: 13 }}>$</span>
              <input
                type="text" inputMode="numeric"
                value={plan[key] ? plan[key].toLocaleString('es-CL') : ''}
                placeholder="0"
                onChange={e => setPlanPersonal({ [key]: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })}
                style={{
                  background: 'transparent', border: 'none', color: '#fff', textAlign: 'right',
                  fontSize: 14, fontWeight: 700, width: 92, outline: 'none',
                  fontVariantNumeric: 'tabular-nums', padding: 0, fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${MACACO.borderSoft}`, marginTop: 4 }}>
          <span style={{ fontSize: 12.5, color: MACACO.textDim }}>Meses a proyectar</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 5, 12].map(n => (
              <button key={n} onClick={() => setPlanPersonal({ meses: n })} style={{
                padding: '5px 11px', borderRadius: 8,
                background: plan.meses === n ? MACACO.primary : MACACO.cardElev,
                color: plan.meses === n ? '#0A0A0F' : MACACO.textDim,
                border: `1px solid ${plan.meses === n ? MACACO.primary : MACACO.border}`,
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>{n}</button>
            ))}
          </div>
        </div>
      </Card>

      <SectionTitle right="neto proyectado">Mes a mes</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {filas.map(f => (
          <Card key={f.mes} padding={13} accent={f.hito ? 'rgba(245,197,24,0.35)' : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: f.neto >= 0 ? MACACO.success : MACACO.danger }}>
                {clp(f.neto)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 7, fontSize: 10.5, color: MACACO.textMuted }}>
              <span>Ingresos {clpCompact(f.ingresos)}</span>
              {f.interes > 0 && <span style={{ color: MACACO.danger }}>Interés {clpCompact(f.interes)}</span>}
              <span>Abono {clpCompact(f.abonoPropio + f.abonoExterno)}</span>
              <span>Pasivo {clpCompact(f.pasivo)}</span>
            </div>
            {f.hito && (
              <div style={{
                marginTop: 9, padding: '7px 10px', borderRadius: 8,
                background: 'rgba(245,197,24,0.10)', color: MACACO.primary,
                fontSize: 11.5, fontWeight: 700,
              }}>{f.hito}</div>
            )}
          </Card>
        ))}
      </div>

      <Card padding={13} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: MACACO.textMuted, lineHeight: 1.6 }}>
          Arranca del saldo exigible hoy ({clp(balance.netoHoy)}) y devenga el interés mes a mes —
          partir del compromiso total ({clp(balance.neto)}) contaría ese interés dos veces.
          Pagar deuda con plata propia no mueve el patrimonio neto: baja el activo y el pasivo por igual.
          Lo que lo cambia es el flujo del mes, el aporte externo (que baja deuda sin costo propio) y el
          interés que se va devengando.
        </div>
      </Card>
    </>
  );
}

// ── Piezas compartidas ────────────────────────────────────────────────────────
const btnGhost = (color) => ({
  flex: 1, padding: '10px', background: 'transparent',
  border: `1px solid ${MACACO.border}`, color,
  fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer',
  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', gap: 6,
});

function AddButton({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px', borderRadius: 12,
      background: MACACO.cardElev, border: `1px dashed ${MACACO.border}`,
      color: MACACO.textDim, fontSize: 12.5, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    }}>
      <Icon.plus size={14} /> {label}
    </button>
  );
}

function MiniStat({ label, monto, color }) {
  return (
    <div style={{
      flex: 1, background: MACACO.card, border: `1px solid ${MACACO.border}`,
      borderRadius: 12, padding: 11, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 22, background: color, borderRadius: '0 4px 4px 0', boxShadow: `0 0 8px ${color}` }} />
      <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{clpCompact(monto)}</div>
    </div>
  );
}

function Fila({ label, valor, color, tachado, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: small ? '3px 0' : '4px 0' }}>
      <span style={{ fontSize: small ? 11.5 : 12.5, color: MACACO.textDim }}>{label}</span>
      <span style={{
        fontSize: small ? 12 : 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: color || '#fff', textDecoration: tachado ? 'line-through' : 'none',
        opacity: tachado ? 0.75 : 1,
      }}>{clp(valor)}</span>
    </div>
  );
}

function Sheet({ titulo, subtitulo, detalle, onClose, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        maxHeight: '88%', overflowY: 'auto',
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{subtitulo}</div>}
            {detalle && <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>{detalle}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CampoTexto({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          borderRadius: 10, padding: '12px 14px', color: '#fff',
          fontSize: 14, outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function CampoMonto({ label, value, onChange, autoFocus }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
        borderRadius: 10, padding: '12px 14px',
      }}>
        <span style={{ color: MACACO.textMuted, fontSize: 18, fontWeight: 600 }}>$</span>
        <input
          type="text" inputMode="numeric" autoFocus={autoFocus}
          value={value ? value.toLocaleString('es-CL') : ''} placeholder="0"
          onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#fff',
            fontSize: 22, fontWeight: 700, outline: 'none', padding: 0,
            fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, color: MACACO.textDim, fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
};

function BotonPrimario({ children, onClick, disabled, color = MACACO.primary }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '15px',
      background: disabled ? MACACO.cardElev : color,
      color: disabled ? MACACO.textMuted : '#0A0A0F',
      border: disabled ? `1px solid ${MACACO.border}` : 'none',
      borderRadius: 12, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      boxShadow: disabled ? 'none' : `0 0 20px ${color}44`,
    }}>{children}</button>
  );
}

// ── Sheets concretos ──────────────────────────────────────────────────────────
function ActivoSheet({ activo, onClose, onGuardar, onEliminar }) {
  const [nombre, setNombre]       = useState(activo?.nombre || '');
  const [monto, setMonto]         = useState(activo?.monto || 0);
  const [reservado, setReservado] = useState(!!activo?.reservado);
  const [nota, setNota]           = useState(activo?.nota || '');
  const valido = nombre.trim().length > 0;

  return (
    <Sheet titulo={activo ? 'Editar cuenta' : 'Nueva cuenta'} subtitulo={activo?.nombre || 'Activo'} onClose={onClose}>
      <CampoTexto label="Nombre" value={nombre} onChange={setNombre} placeholder="Banco, efectivo, reserva..." />
      <CampoMonto label="Monto" value={monto} onChange={setMonto} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tipo de fondo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[[false, 'Operativo', MACACO.primary], [true, 'Intocable', MACACO.cyan]].map(([val, label, color]) => {
            const active = reservado === val;
            return (
              <button key={String(val)} onClick={() => setReservado(val)} style={{
                flex: 1, padding: '11px 8px', borderRadius: 10,
                background: active ? color + '1A' : MACACO.cardElev,
                color: active ? color : MACACO.textDim,
                border: `1px solid ${active ? color + '55' : MACACO.border}`,
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>{label}</button>
            );
          })}
        </div>
      </div>
      <CampoTexto label="Nota (opcional)" value={nota} onChange={setNota} placeholder="Detalle del fondo..." />
      <BotonPrimario onClick={() => valido && onGuardar({ nombre: nombre.trim(), monto, reservado, nota: nota.trim() })} disabled={!valido}>
        GUARDAR
      </BotonPrimario>
      {onEliminar && (
        <button onClick={onEliminar} style={{
          width: '100%', marginTop: 10, padding: '12px',
          background: 'transparent', border: `1px solid rgba(255,77,77,0.3)`,
          color: MACACO.danger, borderRadius: 12, fontSize: 12.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>ELIMINAR CUENTA</button>
      )}
    </Sheet>
  );
}

function CobrarSheet({ onClose, onGuardar }) {
  const [persona, setPersona] = useState('');
  const [monto, setMonto]     = useState(0);
  const [nota, setNota]       = useState('');
  const valido = persona.trim().length > 0 && monto > 0;

  return (
    <Sheet titulo="Nueva cuenta por cobrar" subtitulo="¿Quién te debe?" onClose={onClose}>
      <CampoTexto label="Persona" value={persona} onChange={setPersona} placeholder="Nombre..." />
      <CampoMonto label="Monto adeudado" value={monto} onChange={setMonto} />
      <CampoTexto label="Nota (opcional)" value={nota} onChange={setNota} placeholder="Motivo, plazo..." />
      <BotonPrimario onClick={() => valido && onGuardar({ persona: persona.trim(), original: monto, nota: nota.trim() })} disabled={!valido} color={MACACO.cyan}>
        AGREGAR
      </BotonPrimario>
    </Sheet>
  );
}

function AbonoSheet({ cuenta, onClose, onAbonar }) {
  const saldo = saldoPorCobrar(cuenta);
  const [monto, setMonto] = useState(0);
  const [aCaja, setACaja] = useState(false);
  const montoFinal = Math.min(saldo, monto);

  return (
    <Sheet titulo="Registrar abono" subtitulo={cuenta.persona} detalle={`Saldo pendiente: ${clp(saldo)}`} onClose={onClose}>
      <CampoMonto label="Monto recibido" value={monto} onChange={setMonto} autoFocus />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[saldo, Math.round(saldo / 2)].filter(v => v > 0).map((v, i) => (
          <button key={i} onClick={() => setMonto(v)} style={{
            flex: 1, padding: '8px', borderRadius: 8,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: MACACO.textDim, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {i === 0 ? 'Todo' : '50%'}
            <div style={{ fontSize: 10, marginTop: 2 }}>{clp(v)}</div>
          </button>
        ))}
      </div>
      <button onClick={() => setACaja(v => !v)} style={{
        width: '100%', marginBottom: 16, padding: '12px 14px', borderRadius: 10,
        background: aCaja ? 'rgba(245,197,24,0.10)' : MACACO.cardElev,
        border: `1px solid ${aCaja ? 'rgba(245,197,24,0.4)' : MACACO.border}`,
        color: aCaja ? MACACO.primary : MACACO.textDim,
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `1.5px solid ${aCaja ? MACACO.primary : MACACO.border}`,
          background: aCaja ? MACACO.primary : 'transparent',
          color: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{aCaja && <Icon.check size={11} />}</span>
        Sumar a la caja del negocio
      </button>
      <BotonPrimario onClick={() => montoFinal > 0 && onAbonar(montoFinal, aCaja)} disabled={montoFinal <= 0} color={MACACO.cyan}>
        REGISTRAR ABONO
      </BotonPrimario>
    </Sheet>
  );
}

function PasivoSheet({ onClose, onGuardar }) {
  const [acreedor, setAcreedor]   = useState('');
  const [capital, setCapital]     = useState(0);
  const [abono, setAbono]         = useState(0);
  const [externo, setExterno]     = useState(0);
  const [vencimiento, setVenc]    = useState('');
  const [tramos, setTramos]       = useState([]);
  const [nota, setNota]           = useState('');
  const valido = acreedor.trim().length > 0 && capital > 0;

  const addTramo = () => {
    const ultimo = tramos[tramos.length - 1];
    const base   = ultimo ? ultimo.mes : mesKey();
    const [a, m] = base.split('-').map(Number);
    const sig    = ultimo ? (m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`) : base;
    setTramos([...tramos, { mes: sig, tasa: 5 }]);
  };

  const interes = tramos.reduce((s, t) => s + capital * t.tasa / 100, 0);

  return (
    <Sheet titulo="Nueva deuda personal" subtitulo="¿A quién le debes?" onClose={onClose}>
      <CampoTexto label="Acreedor" value={acreedor} onChange={setAcreedor} placeholder="Nombre..." />
      <CampoMonto label="Capital" value={capital} onChange={setCapital} />

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tramos de interés (tasa fija por mes)</label>
        {tramos.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input
              type="month" value={t.mes}
              onChange={e => setTramos(tramos.map((x, j) => j === i ? { ...x, mes: e.target.value } : x))}
              style={{
                flex: 1, background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13,
                outline: 'none', fontFamily: 'inherit', colorScheme: 'dark',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', width: 78,
              background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              borderRadius: 8, padding: '10px 12px',
            }}>
              <input
                type="text" inputMode="numeric" value={t.tasa}
                onChange={e => setTramos(tramos.map((x, j) => j === i ? { ...x, tasa: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 } : x))}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700, outline: 'none', padding: 0, fontFamily: 'inherit',
                }}
              />
              <span style={{ color: MACACO.textMuted, fontSize: 13 }}>%</span>
            </div>
            <button onClick={() => setTramos(tramos.filter((_, j) => j !== i))} aria-label="Quitar tramo" style={{
              width: 36, height: 38, flexShrink: 0, background: 'transparent',
              border: `1px solid ${MACACO.border}`, borderRadius: 8,
              color: MACACO.textMuted, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon.minus size={13} /></button>
          </div>
        ))}
        <button onClick={addTramo} style={{
          width: '100%', padding: '10px', borderRadius: 8,
          background: 'transparent', border: `1px dashed ${MACACO.border}`,
          color: MACACO.textDim, fontSize: 11.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Agregar tramo</button>
        {interes > 0 && (
          <div style={{ fontSize: 11.5, color: MACACO.danger, marginTop: 8 }}>
            Interés total {clp(interes)} · a pagar {clp(capital + interes)}
          </div>
        )}
      </div>

      <CampoMonto label="Abono mensual (opcional)" value={abono} onChange={setAbono} />
      {abono > 0 && <CampoMonto label="— de eso, aporte externo" value={externo} onChange={setExterno} />}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Vencimiento (opcional)</label>
        <input
          type="date" value={vencimiento} onChange={e => setVenc(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px', color: '#fff',
            fontSize: 14, outline: 'none', fontFamily: 'inherit', colorScheme: 'dark',
          }}
        />
      </div>
      <CampoTexto label="Nota (opcional)" value={nota} onChange={setNota} placeholder="Condiciones..." />

      <BotonPrimario
        onClick={() => valido && onGuardar({
          acreedor: acreedor.trim(), capital, tramos,
          vencimiento: vencimiento || null,
          abonoMensual: abono, aporteExterno: Math.min(externo, abono),
          nota: nota.trim(),
        })}
        disabled={!valido} color={MACACO.danger}
      >
        AGREGAR DEUDA
      </BotonPrimario>
    </Sheet>
  );
}

function PagoPasivoSheet({ pasivo, onClose, onPagar }) {
  const saldo = saldoPasivo(pasivo);
  const [monto, setMonto]     = useState(pasivo.abonoMensual || 0);
  const [externo, setExterno] = useState(pasivo.aporteExterno || 0);
  const montoFinal   = Math.min(saldo, monto);
  const externoFinal = Math.min(externo, montoFinal);
  const propio       = montoFinal - externoFinal;

  return (
    <Sheet titulo="Registrar pago" subtitulo={pasivo.acreedor} detalle={`Saldo: ${clp(saldo)}`} onClose={onClose}>
      <CampoMonto label="Monto del pago" value={monto} onChange={setMonto} autoFocus />
      <CampoMonto label="Aporte externo (beca, terceros)" value={externo} onChange={setExterno} />
      <div style={{
        marginBottom: 16, padding: '12px 14px', borderRadius: 10,
        background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
      }}>
        <Fila label="Sale de tu bolsillo" valor={propio} small />
        <Fila label="Aporte externo" valor={externoFinal} color={MACACO.cyan} small />
        <Fila label="Saldo después" valor={Math.max(0, saldo - montoFinal)} color={MACACO.textDim} small />
      </div>
      <BotonPrimario onClick={() => montoFinal > 0 && onPagar(montoFinal, externoFinal)} disabled={montoFinal <= 0} color={MACACO.danger}>
        REGISTRAR PAGO
      </BotonPrimario>
    </Sheet>
  );
}

function MetaSheet({ onClose, onGuardar }) {
  const [nombre, setNombre]   = useState('');
  const [objetivo, setObj]    = useState(0);
  const [acumulado, setAcum]  = useState(0);
  const [fecha, setFecha]     = useState('');
  const [nota, setNota]       = useState('');
  const valido = nombre.trim().length > 0 && objetivo > 0;

  return (
    <Sheet titulo="Nueva meta de ahorro" subtitulo="¿Para qué ahorrás?" onClose={onClose}>
      <CampoTexto label="Nombre" value={nombre} onChange={setNombre} placeholder="Fondo Valcarce, viaje..." />
      <CampoMonto label="Objetivo" value={objetivo} onChange={setObj} />
      <CampoMonto label="Ya acumulado" value={acumulado} onChange={setAcum} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Fecha límite (opcional)</label>
        <input
          type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px', color: '#fff',
            fontSize: 14, outline: 'none', fontFamily: 'inherit', colorScheme: 'dark',
          }}
        />
      </div>
      <CampoTexto label="Nota (opcional)" value={nota} onChange={setNota} placeholder="Regla o condición..." />
      <BotonPrimario
        onClick={() => valido && onGuardar({ nombre: nombre.trim(), objetivo, acumulado, fechaLimite: fecha || null, nota: nota.trim() })}
        disabled={!valido}
      >
        CREAR META
      </BotonPrimario>
    </Sheet>
  );
}

function MontoSheet({ titulo, subtitulo, detalle, sugerencias = [], onClose, onConfirmar }) {
  const [monto, setMonto] = useState(0);
  const opciones = [...new Set(sugerencias.filter(v => v > 0))].slice(0, 3);

  return (
    <Sheet titulo={titulo} subtitulo={subtitulo} detalle={detalle} onClose={onClose}>
      <CampoMonto label="Monto" value={monto} onChange={setMonto} autoFocus />
      {opciones.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {opciones.map(v => (
            <button key={v} onClick={() => setMonto(v)} style={{
              flex: 1, padding: '8px', borderRadius: 8,
              background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              color: MACACO.textDim, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{clp(v)}</button>
          ))}
        </div>
      )}
      <BotonPrimario onClick={() => monto > 0 && onConfirmar(monto)} disabled={monto <= 0}>
        CONFIRMAR
      </BotonPrimario>
    </Sheet>
  );
}
