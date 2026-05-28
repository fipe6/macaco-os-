// Macaco OS — design tokens & formatters

export const MACACO = {
  bg: '#0A0A0F',
  card: '#12121A',
  cardElev: '#171723',
  border: '#1E1E2E',
  borderSoft: '#15151F',
  primary: '#F5C518',
  primaryDim: '#3a2e08',
  cyan: '#00D4FF',
  cyanDim: '#053541',
  danger: '#FF4D4D',
  dangerDim: '#3a1313',
  success: '#00E676',
  successDim: '#0a3a1f',
  orange: '#FF9F40',
  orangeDim: '#3a2510',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.38)',
};

export const clp = (n) => {
  if (n === 0) return '$0';
  const s = Math.round(Math.abs(n)).toString();
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? '-$' : '$') + parts.join('.');
};

export const clpCompact = (n) => {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (Math.abs(n) >= 1_000) return '$' + Math.round(n / 1000) + 'k';
  return clp(n);
};
