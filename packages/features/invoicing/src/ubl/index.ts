// ═══════════════════════════════════════════════════════════════════════════════
// UBL 2.1 Invoice Generation - Netherlands E-Invoicing Standard
// ═══════════════════════════════════════════════════════════════════════════════

import type { Invoice, InvoiceItem, InvoiceAddress } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// UBL Invoice Generator
// ─────────────────────────────────────────────────────────────────────────────

export interface UblInvoiceData {
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  supplier: {
    name: string
    address: InvoiceAddress
    vatNumber?: string
    kvkNumber?: string
    iban?: string
  }
  customer: {
    name: string
    address: InvoiceAddress
    vatNumber?: string
    kvkNumber?: string
  }
  items: InvoiceItem[]
  subtotal: number
  vatAmount: number
  total: number
  currency: string
  notes?: string
}

export function generateUblInvoice(data: UblInvoiceData): string {
  const formatDate = (date: Date) => date.toISOString().split("T")[0]
  const formatAmount = (amount: number) => amount.toFixed(2)

  const itemsXml = data.items.map((item, index) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${data.currency}">${formatAmount(item.total)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(item.description)}</cbc:Description>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.vatRate}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${data.currency}">${formatAmount(item.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${formatDate(data.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${formatDate(data.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
  ${data.notes ? `<cbc:Note>${escapeXml(data.notes)}</cbc:Note>` : ""}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.supplier.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.supplier.address.street)} ${escapeXml(data.supplier.address.houseNumber)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.supplier.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(data.supplier.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.supplier.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.supplier.vatNumber ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.supplier.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
      ${data.supplier.kvkNumber ? `
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.supplier.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="NL:KVK">${escapeXml(data.supplier.kvkNumber)}</cbc:CompanyID>
      </cac:PartyLegalEntity>` : ""}
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.customer.address.street)} ${escapeXml(data.customer.address.houseNumber)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.customer.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(data.customer.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.customer.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.customer.vatNumber ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.customer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${data.supplier.iban ? `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(data.supplier.iban)}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>` : ""}

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currency}">${formatAmount(data.vatAmount)}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currency}">${formatAmount(data.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currency}">${formatAmount(data.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currency}">${formatAmount(data.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currency}">${formatAmount(data.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${itemsXml}
</Invoice>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert Invoice to UBL
// ─────────────────────────────────────────────────────────────────────────────

export function invoiceToUbl(invoice: Invoice, supplierInfo: {
  name: string
  address: InvoiceAddress
  vatNumber?: string
  kvkNumber?: string
  iban?: string
}): string {
  return generateUblInvoice({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    supplier: supplierInfo,
    customer: {
      name: invoice.customerName,
      address: invoice.customerAddress!,
      vatNumber: invoice.customerVatNumber || undefined,
      kvkNumber: invoice.customerKvkNumber || undefined,
    },
    items: invoice.items,
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    total: Number(invoice.total),
    currency: invoice.currency,
    notes: invoice.notes || undefined,
  })
}
