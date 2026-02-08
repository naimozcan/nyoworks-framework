// ═══════════════════════════════════════════════════════════════════════════════
// Preferences Service
// ═══════════════════════════════════════════════════════════════════════════════

import { PreferencesRepository } from "../repositories/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UpdatePreferencesInput {
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  inAppEnabled?: boolean
  marketingEmails?: boolean
  productUpdates?: boolean
  securityAlerts?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class PreferencesService {
  private readonly repository: PreferencesRepository

  constructor(db: unknown) {
    this.repository = new PreferencesRepository(db)
  }

  async get(userId: string) {
    const preferences = await this.repository.findByUserId(userId)

    if (!preferences) {
      return this.repository.create({ userId })
    }

    return preferences
  }

  async update(userId: string, input: UpdatePreferencesInput) {
    return this.repository.upsert(userId, input)
  }
}
