// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - Exporters
// ═══════════════════════════════════════════════════════════════════════════════

import { jsPDF } from "jspdf"
import Papa from "papaparse"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PdfExportOptions {
  title: string
  columns: string[]
  data: Record<string, unknown>[]
  orientation?: "portrait" | "landscape"
  fontSize?: number
  headerColor?: [number, number, number]
}

interface CsvExportOptions {
  columns: string[]
  data: Record<string, unknown>[]
  delimiter?: string
  header?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Exporter
// ─────────────────────────────────────────────────────────────────────────────

export function exportToPdf(options: PdfExportOptions): Uint8Array {
  const {
    title,
    columns,
    data,
    orientation = "portrait",
    fontSize = 10,
    headerColor = [66, 139, 202],
  } = options

  const doc = new jsPDF({ orientation })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const usableWidth = pageWidth - margin * 2
  const columnWidth = usableWidth / columns.length

  doc.setFontSize(16)
  doc.text(title, margin, 20)

  doc.setFontSize(fontSize)
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  doc.setTextColor(255, 255, 255)

  let yPosition = 35

  columns.forEach((col, index) => {
    const xPosition = margin + index * columnWidth
    doc.rect(xPosition, yPosition - 5, columnWidth, 8, "F")
    doc.text(col, xPosition + 2, yPosition)
  })

  doc.setTextColor(0, 0, 0)
  yPosition += 10

  data.forEach((row) => {
    if (yPosition > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      yPosition = 20
    }

    columns.forEach((col, index) => {
      const xPosition = margin + index * columnWidth
      const value = String(row[col] ?? "")
      const truncatedValue = value.length > 30 ? value.substring(0, 27) + "..." : value
      doc.text(truncatedValue, xPosition + 2, yPosition)
    })

    yPosition += 8
  })

  const timestamp = new Date().toISOString()
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated: ${timestamp}`, margin, doc.internal.pageSize.getHeight() - 10)

  return doc.output("arraybuffer") as unknown as Uint8Array
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Exporter
// ─────────────────────────────────────────────────────────────────────────────

export function exportToCsv(options: CsvExportOptions): string {
  const {
    columns,
    data,
    delimiter = ",",
    header = true,
  } = options

  const rows = data.map((row) => {
    const orderedRow: Record<string, unknown> = {}
    columns.forEach((col) => {
      orderedRow[col] = row[col] ?? ""
    })
    return orderedRow
  })

  return Papa.unparse(rows, {
    columns,
    delimiter,
    header,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getContentType(format: "pdf" | "csv"): string {
  const contentTypes = {
    pdf: "application/pdf",
    csv: "text/csv",
  }
  return contentTypes[format]
}

export function getFileExtension(format: "pdf" | "csv"): string {
  return format
}

export function generateFilename(type: string, format: "pdf" | "csv"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${type}-export-${timestamp}.${format}`
}
