// ═══════════════════════════════════════════════════════════════════════════════
// Devices Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { DevicesRepository } from "../repositories/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RegisterDeviceInput {
  deviceToken: string
  platform: string
  deviceName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class DevicesService {
  private readonly repository: DevicesRepository

  constructor(db: DrizzleDatabase) {
    this.repository = new DevicesRepository(db)
  }

  async register(userId: string, input: RegisterDeviceInput) {
    return this.repository.registerOrUpdate(
      userId,
      input.deviceToken,
      input.platform,
      input.deviceName
    )
  }

  async unregister(userId: string, deviceToken: string) {
    const success = await this.repository.deactivate(deviceToken, userId)
    return { success }
  }

  async list(userId: string) {
    return this.repository.findByUserId(userId, true)
  }
}
