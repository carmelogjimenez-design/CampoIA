// ════════════════════════════════════════════════════════════
// CAMPO — Sello de versión
// Sirve para saber de un vistazo si lo que estás viendo en el
// navegador es el código que acabas de subir, o una versión
// vieja que sigue cacheada. Sube el número en cada entrega.
// ════════════════════════════════════════════════════════════

export const VERSION = '2.5.1'
export const BUILD_DATE = '2026-07-29'

/** "v2.4.0 · 29 jul" — corto, para pies de página. */
export const versionLabel = (() => {
  const [y, m, d] = BUILD_DATE.split('-').map(Number)
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `v${VERSION} · ${d} ${meses[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`
})()
