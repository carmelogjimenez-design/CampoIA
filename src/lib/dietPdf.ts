import { jsPDF } from 'jspdf'
import { Player } from '../types/database'

// Convierte el markdown de la dieta en un PDF limpio con la identidad CAMPO
export function generateDietPDF(player: Player, text: string) {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.width
  const M = 16, maxW = W - M * 2
  let y = 0

  // Cabecera
  doc.setFillColor(29, 29, 31); doc.rect(0, 0, W, 46, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('CAMPO', M, 18)
  doc.setFontSize(20); doc.text('Plan nutricional', M, 32)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(190, 190, 190)
  doc.text(`${player.name}${player.age ? ` · ${player.age} años` : ''}${player.height_cm ? ` · ${player.height_cm}cm` : ''}${player.weight_kg ? ` · ${player.weight_kg}kg` : ''}`, M, 40)
  y = 58

  const lines = text.split('\n')
  for (const raw of lines) {
    if (y > 270) { doc.addPage(); y = 20 }
    let line = raw.trim()
    if (!line) { y += 3; continue }

    // # Título
    if (line.startsWith('# ')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(29, 29, 31)
      doc.splitTextToSize(line.replace(/^#\s*/, ''), maxW).forEach((l: string) => { doc.text(l, M, y); y += 8 })
      y += 2; continue
    }
    // ## Sección (semana) con barra volt
    if (line.startsWith('## ')) {
      y += 3
      doc.setFillColor(201, 243, 29); doc.rect(M, y - 4, 3, 7, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(29, 29, 31)
      doc.splitTextToSize(line.replace(/^##\s*/, ''), maxW - 6).forEach((l: string) => { doc.text(l, M + 6, y); y += 7 })
      y += 2; continue
    }
    // ### Subsección
    if (line.startsWith('### ')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(60, 60, 60)
      doc.splitTextToSize(line.replace(/^###\s*/, ''), maxW).forEach((l: string) => { doc.text(l, M, y); y += 6 })
      continue
    }
    // Lista
    const isList = line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line)
    const clean = line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(70, 70, 70)
    const prefix = isList ? '•  ' : ''
    doc.splitTextToSize(prefix + clean, maxW - (isList ? 4 : 0)).forEach((l: string) => {
      if (y > 285) { doc.addPage(); y = 20 }
      doc.text(l, M + (isList ? 2 : 0), y); y += 5
    })
  }

  doc.setFontSize(7.5); doc.setTextColor(160, 160, 160)
  doc.text(`Generado por CAMPO · ${new Date().toLocaleDateString('es-ES')} · Plan orientativo, no sustituye a un profesional`, M, 290)
  doc.save(`CAMPO-Dieta-${player.name.replace(/\s+/g, '-')}.pdf`)
}
