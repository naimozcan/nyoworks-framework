// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Templates - Common Business Templates for Netherlands
// ═══════════════════════════════════════════════════════════════════════════════

import type { TemplateComponent, TemplateParameter } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Template Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function textParam(text: string): TemplateParameter {
  return { type: "text", text }
}

export function currencyParam(amount: number, code: string = "EUR"): TemplateParameter {
  return {
    type: "currency",
    currency: {
      fallback_value: `${code} ${(amount / 1000).toFixed(2)}`,
      code,
      amount_1000: amount,
    },
  }
}

export function dateTimeParam(date: Date): TemplateParameter {
  return {
    type: "date_time",
    date_time: {
      fallback_value: date.toLocaleDateString("nl-NL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  }
}

export function imageParam(url: string): TemplateParameter {
  return { type: "image", image: { link: url } }
}

export function documentParam(url: string): TemplateParameter {
  return { type: "document", document: { link: url } }
}

export function bodyComponent(parameters: TemplateParameter[]): TemplateComponent {
  return { type: "body", parameters }
}

export function headerComponent(parameters: TemplateParameter[]): TemplateComponent {
  return { type: "header", parameters }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built Templates for Common Use Cases
// ─────────────────────────────────────────────────────────────────────────────

export const commonTemplates = {
  orderConfirmation: (orderNumber: string, total: number) => ({
    name: "order_confirmation",
    language: "nl",
    components: [
      bodyComponent([
        textParam(orderNumber),
        currencyParam(total * 1000),
      ]),
    ],
  }),

  appointmentReminder: (serviceName: string, dateTime: Date, location: string) => ({
    name: "appointment_reminder",
    language: "nl",
    components: [
      bodyComponent([
        textParam(serviceName),
        dateTimeParam(dateTime),
        textParam(location),
      ]),
    ],
  }),

  deliveryUpdate: (trackingNumber: string, carrier: string, estimatedDate: Date) => ({
    name: "delivery_update",
    language: "nl",
    components: [
      bodyComponent([
        textParam(trackingNumber),
        textParam(carrier),
        dateTimeParam(estimatedDate),
      ]),
    ],
  }),

  invoiceReady: (invoiceNumber: string, amount: number, dueDate: Date) => ({
    name: "invoice_ready",
    language: "nl",
    components: [
      bodyComponent([
        textParam(invoiceNumber),
        currencyParam(amount * 1000),
        dateTimeParam(dueDate),
      ]),
    ],
  }),

  paymentReceived: (amount: number, invoiceNumber: string) => ({
    name: "payment_received",
    language: "nl",
    components: [
      bodyComponent([
        currencyParam(amount * 1000),
        textParam(invoiceNumber),
      ]),
    ],
  }),

  welcomeMessage: (customerName: string, companyName: string) => ({
    name: "welcome_message",
    language: "nl",
    components: [
      bodyComponent([
        textParam(customerName),
        textParam(companyName),
      ]),
    ],
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP Template for Authentication
// ─────────────────────────────────────────────────────────────────────────────

export function otpTemplate(code: string) {
  return {
    name: "verification_code",
    language: "nl",
    components: [
      bodyComponent([textParam(code)]),
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate OTP Code
// ─────────────────────────────────────────────────────────────────────────────

export function generateOtpCode(length: number = 6): string {
  const digits = "0123456789"
  let code = ""
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}
