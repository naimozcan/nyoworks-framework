// ═══════════════════════════════════════════════════════════════════════════════
// AI Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// useChatbot Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface UseChatbotOptions {
  conversationId?: string
  onMessage?: (message: ChatMessage) => void
  onError?: (error: Error) => void
}

export function useChatbot(options: UseChatbotOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const conversationIdRef = useRef(options.conversationId)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      options.onMessage?.(userMessage)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to send message")
      setError(error)
      options.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const clearMessages = useCallback(() => {
    setMessages([])
    conversationIdRef.current = undefined
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversationId: conversationIdRef.current,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useContentGeneration Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseContentGenerationOptions {
  onGenerated?: (content: string) => void
  onError?: (error: Error) => void
}

export function useContentGeneration(options: UseContentGenerationOptions = {}) {
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generate = useCallback(async (_prompt: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      setGeneratedContent("Generated content placeholder")
      options.onGenerated?.("Generated content placeholder")
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to generate content")
      setError(error)
      options.onError?.(error)
    } finally {
      setIsGenerating(false)
    }
  }, [options])

  const clear = useCallback(() => {
    setGeneratedContent(null)
    setError(null)
  }, [])

  return {
    generatedContent,
    isGenerating,
    error,
    generate,
    clear,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDocumentOCR Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDocumentOCROptions<T> {
  onExtracted?: (data: T) => void
  onError?: (error: Error) => void
}

export function useDocumentOCR<T = Record<string, unknown>>(options: UseDocumentOCROptions<T> = {}) {
  const [extractedData, setExtractedData] = useState<T | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const processImage = useCallback(async (_imageBase64: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      const data = {} as T
      setExtractedData(data)
      options.onExtracted?.(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to process document")
      setError(error)
      options.onError?.(error)
    } finally {
      setIsProcessing(false)
    }
  }, [options])

  const processFile = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1] ?? ""
        await processImage(base64)
        resolve()
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }, [processImage])

  const clear = useCallback(() => {
    setExtractedData(null)
    setError(null)
  }, [])

  return {
    extractedData,
    isProcessing,
    error,
    processImage,
    processFile,
    clear,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useChatWidget Hook (for embedding)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatWidgetState {
  isOpen: boolean
  isMinimized: boolean
  unreadCount: number
}

export function useChatWidget() {
  const [state, setState] = useState<ChatWidgetState>({
    isOpen: false,
    isMinimized: false,
    unreadCount: 0,
  })

  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true, isMinimized: false, unreadCount: 0 }))
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }))
  }, [])

  const maximize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }))
  }, [])

  const incrementUnread = useCallback(() => {
    setState(prev => ({ ...prev, unreadCount: prev.unreadCount + 1 }))
  }, [])

  return {
    ...state,
    open,
    close,
    minimize,
    maximize,
    incrementUnread,
  }
}
