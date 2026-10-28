// Lo primero que se ve al abrir la app: caja, hoy contra ayer y cómo va el mes.
import { ventasDelDia, ventasDelMes, sumarTotal } from '../store/selectors.js';

export function resumenInicio({ ventas = [], config = {}, pedidos = [] }, hoy = new Date()) {
  const ayerFecha = new Date(hoy); ayerFecha.setDate(hoy.getDate() - 1);
  const vHoy = ventasDelDia(ventas, hoy);
  const totalHoy = sumarTotal(vHoy);
  const totalAyer = sumarTotal(ventasDelDia(ventas, ayerFecha));
  const totalMes = sumarTotal(ventasDelMes(ventas, hoy));

  const metaMes = Number(config.metaMensual) || 0;
  const metaDia = Number(config.metaDiaria) || 0;
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasQuedan = diasMes - hoy.getDate() + 1;   // hoy cuenta
  const faltaMes = Math.max(0, metaMes - totalMes);

  const enCamino = pedidos.filter(p => p.estado === 'pedido' || p.estado === 'en_camino');

  return {
    hoy: totalHoy,
    ventasHoy: vHoy.length,
    ayer: totalAyer,
    // diferencia contra ayer; sin ventas ayer no hay porcentaje (fuente o silencio)
    vsAyer: totalAyer > 0 ? Math.round(((totalHoy - totalAyer) / totalAyer) * 100) : null,
    pctDia: metaDia > 0 ? Math.round((totalHoy / metaDia) * 100) : null,
    mes: totalMes,
    pctMes: metaMes > 0 ? Math.round((totalMes / metaMes) * 100) : null,
    faltaMes,
    porDia: faltaMes > 0 && diasQuedan > 0 ? Math.ceil(faltaMes / diasQuedan) : 0,
    diasQuedan,
    pedidosEnCamino: enCamino.length,
  };
}
