// ═══════════════════════════════════════════════════════════════════════════════
// Google Gemini AI Client
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI, type GenerativeModel, type Content } from "@google/generative-ai"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface GeminiConfig {
  apiKey: string
  defaultModel?: string
}

let geminiConfig: GeminiConfig | null = null
let geminiClient: GoogleGenerativeAI | null = null

export function configureGemini(config: GeminiConfig) {
  geminiConfig = config
  geminiClient = new GoogleGenerativeAI(config.apiKey)
}

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error("Gemini not configured. Set GEMINI_API_KEY")
    }

    geminiConfig = { apiKey }
    geminiClient = new GoogleGenerativeAI(apiKey)
  }
  return geminiClient
}

function getModel(modelName?: string): GenerativeModel {
  const client = getClient()
  return client.getGenerativeModel({
    model: modelName || geminiConfig?.defaultModel || "gemini-1.5-flash",
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Functionality
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatOptions {
  systemPrompt?: string
  history?: { role: "user" | "model"; content: string }[]
  temperature?: number
  maxTokens?: number
}

export interface ChatResult {
  response: string
  tokenCount?: number
}

export async function chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
  const model = getModel()

  const history: Content[] = (options.history || []).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }))

  const chatSession = model.startChat({
    history,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
    ...(options.systemPrompt && {
      systemInstruction: options.systemPrompt,
    }),
  })

  const result = await chatSession.sendMessage(message)
  const response = result.response.text()

  return {
    response,
    tokenCount: result.response.usageMetadata?.totalTokenCount,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Generation
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
}

export async function generateContent(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const model = getModel()

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  })

  return result.response.text()
}

export async function generateProductDescription(
  productName: string,
  features: string[],
  tone: "professional" | "casual" | "friendly" = "professional",
  language: string = "nl"
): Promise<string> {
  const prompt = `Write a ${tone} product description in ${language === "nl" ? "Dutch" : language} for:
Product: ${productName}
Features: ${features.join(", ")}

Write a compelling description that highlights the benefits. Keep it concise (2-3 paragraphs).`

  return generateContent(prompt, { temperature: 0.8 })
}

export async function summarizeText(text: string, maxLength: number = 200, language: string = "nl"): Promise<string> {
  const prompt = `Summarize the following text in ${language === "nl" ? "Dutch" : language}.
Keep the summary under ${maxLength} characters.

Text: ${text}`

  return generateContent(prompt, { temperature: 0.3 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Processing (OCR)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedInvoiceData {
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  supplierName?: string
  supplierVat?: string
  customerName?: string
  totalAmount?: number
  vatAmount?: number
  currency?: string
  lineItems?: { description: string; quantity: number; unitPrice: number; total: number }[]
}

export async function extractInvoiceData(imageBase64: string): Promise<ExtractedInvoiceData> {
  const model = getModel("gemini-1.5-flash")

  const prompt = `Analyze this invoice image and extract the following information in JSON format:
- invoiceNumber
- invoiceDate (YYYY-MM-DD format)
- dueDate (YYYY-MM-DD format)
- supplierName
- supplierVat (BTW number)
- customerName
- totalAmount (number)
- vatAmount (number)
- currency
- lineItems (array of {description, quantity, unitPrice, total})

Return ONLY valid JSON, no markdown or explanations.`

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ],
    }],
  })

  const responseText = result.response.text()

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Return empty if parsing fails
  }

  return {}
}

export async function extractReceiptData(imageBase64: string): Promise<{
  storeName?: string
  date?: string
  total?: number
  items?: { name: string; price: number }[]
}> {
  const model = getModel("gemini-1.5-flash")

  const prompt = `Analyze this receipt image and extract:
- storeName
- date (YYYY-MM-DD)
- total (number)
- items (array of {name, price})

Return ONLY valid JSON.`

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ],
    }],
  })

  const responseText = result.response.text()

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Return empty if parsing fails
  }

  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Business-specific Prompts
// ─────────────────────────────────────────────────────────────────────────────

export const defaultSystemPrompts = {
  customerSupport: (companyName: string, language: string = "nl") => `
Je bent een behulpzame klantenservice medewerker van ${companyName}.
Je spreekt ${language === "nl" ? "Nederlands" : language}.
Je bent vriendelijk, professioneel en geduldig.
Je helpt klanten met vragen over producten, bestellingen en diensten.
Als je iets niet weet, zeg je dat eerlijk en bied je aan om door te verbinden.
`,

  salesAssistant: (companyName: string, products: string) => `
Je bent een verkoopassistent van ${companyName}.
Je helpt klanten bij het vinden van de juiste producten.
Beschikbare producten: ${products}
Je geeft eerlijk advies en probeert niet te pushen.
`,

  appointmentBooking: (businessName: string, services: string) => `
Je bent een digitale receptionist van ${businessName}.
Je helpt klanten met het maken van afspraken.
Beschikbare diensten: ${services}
Je vraagt naar de gewenste datum, tijd en dienst.
Je bevestigt altijd de afspraakdetails voordat je afrondt.
`,
}
