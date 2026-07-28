import { jsPDF } from 'jspdf'

type RGB = [number, number, number]
export const INK: RGB = [29, 29, 31]
export const VOLT: RGB = [201, 243, 29]
export const GREY: RGB = [237, 237, 240]
export const SUB: RGB = [110, 110, 115]

// Donut / anillo de progreso
export function drawDonut(doc: jsPDF, cx: number, cy: number, r: number, pct: number, color: RGB, label: string) {
  const thickness = 5
  doc.setLineWidth(thickness); doc.setLineCap('round')
  // pista
  doc.setDrawColor(...GREY); doc.circle(cx, cy, r, 'S')
  // progreso: segmentos de arco desde -90°
  doc.setDrawColor(...color)
  const steps = Math.max(1, Math.round((pct / 100) * 90))
  for (let i = 0; i < steps; i++) {
    const a1 = (-90 + i * 4) * Math.PI / 180
    const a2 = (-90 + (i + 1) * 4) * Math.PI / 180
    doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2))
  }
  doc.setLineWidth(0.2)
  // centro
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(`${pct}%`, cx, cy + 2, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...SUB)
  doc.text(label, cx, cy + 8, { align: 'center' })
}

// Gráfica de línea (evolución temporal) con área
export function drawLineChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: number[], labels: string[], color: RGB) {
  const max = Math.max(1, ...data)
  const n = data.length
  const dx = n > 1 ? w / (n - 1) : w
  // ejes suaves
  doc.setDrawColor(...GREY); doc.setLineWidth(0.3)
  doc.line(x, y + h, x + w, y + h)
  const pts = data.map((v, i) => ({ px: x + i * dx, py: y + h - (v / max) * h }))
  // área
  doc.setFillColor(color[0], color[1], color[2])
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }))
  for (let i = 0; i < pts.length - 1; i++) {
    doc.triangle(pts[i].px, pts[i].py, pts[i + 1].px, pts[i + 1].py, pts[i].px, y + h, 'F')
    doc.triangle(pts[i + 1].px, pts[i + 1].py, pts[i + 1].px, y + h, pts[i].px, y + h, 'F')
  }
  doc.setGState(new (doc as any).GState({ opacity: 1 }))
  // línea
  doc.setDrawColor(...color); doc.setLineWidth(1.2); doc.setLineCap('round')
  for (let i = 0; i < pts.length - 1; i++) doc.line(pts[i].px, pts[i].py, pts[i + 1].px, pts[i + 1].py)
  // puntos
  doc.setFillColor(...color)
  pts.forEach(p => doc.circle(p.px, p.py, 0.9, 'F'))
  // etiquetas x
  doc.setFontSize(6); doc.setTextColor(...SUB); doc.setFont('helvetica', 'normal')
  labels.forEach((l, i) => { if (i % Math.ceil(n / 6) === 0) doc.text(l, x + i * dx, y + h + 4, { align: 'center' }) })
  doc.setLineWidth(0.2)
}

// Barras horizontales de atributos
export function drawBars(doc: jsPDF, x: number, y: number, w: number, attrs: [string, number][], color: RGB) {
  const rowH = 8, barMax = w - 55
  attrs.forEach(([label, val], i) => {
    const yy = y + i * rowH
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK)
    doc.text(label, x, yy + 2.5)
    doc.setFillColor(...GREY); doc.roundedRect(x + 40, yy, barMax, 3, 1.5, 1.5, 'F')
    doc.setFillColor(...color); doc.roundedRect(x + 40, yy, barMax * Math.min(val, 100) / 100, 3, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...INK)
    doc.text(String(Math.round(val)), x + 40 + barMax + 4, yy + 2.5)
  })
}

// Radar hexagonal (perfil de atributos) para el PDF
export function drawRadar(doc: jsPDF, cx: number, cy: number, r: number, attrs: [string, number][], color: RGB) {
  const n = attrs.length
  if (n < 3) return
  const pt = (i: number, rad: number): [number, number] => {
    const a = (-90 + i * 360 / n) * Math.PI / 180
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]
  }
  // rejilla concéntrica
  doc.setDrawColor(225, 225, 228); doc.setLineWidth(0.3)
  ;[0.25, 0.5, 0.75, 1].forEach(f => {
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pt(i, r * f), [x2, y2] = pt((i + 1) % n, r * f)
      doc.line(x1, y1, x2, y2)
    }
  })
  // radios
  for (let i = 0; i < n; i++) { const [x, y] = pt(i, r); doc.line(cx, cy, x, y) }
  // polígono de valores (relleno translúcido + borde)
  doc.setFillColor(color[0], color[1], color[2])
  doc.setGState(new (doc as any).GState({ opacity: 0.25 }))
  const poly: [number, number][] = attrs.map(([, v], i) => pt(i, r * Math.min(v, 100) / 100))
  for (let i = 1; i < poly.length - 1; i++) doc.triangle(poly[0][0], poly[0][1], poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1], 'F')
  doc.setGState(new (doc as any).GState({ opacity: 1 }))
  doc.setDrawColor(...INK); doc.setLineWidth(0.8)
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; doc.line(a[0], a[1], b[0], b[1]) }
  // vértices
  doc.setFillColor(...INK)
  poly.forEach(([x, y]) => doc.circle(x, y, 0.8, 'F'))
  // etiquetas
  doc.setFontSize(6.5); doc.setTextColor(...SUB); doc.setFont('helvetica', 'bold')
  attrs.forEach(([label], i) => {
    const [x, y] = pt(i, r + 7)
    const align = Math.abs(x - cx) < 2 ? 'center' : x > cx ? 'left' : 'right'
    doc.text(label, x, y, { align: align as any, baseline: 'middle' })
  })
  doc.setLineWidth(0.2)
}
