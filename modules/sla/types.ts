import type { DeliveryStrategy, SlaConfig, SlaScope } from '@prisma/client'

/**
 * SLA types — P4-06.
 *
 * Type aliases cho SlaConfig CRUD. Service layer không validate (route parse);
 * chỉ làm business logic.
 */

export type { DeliveryStrategy, SlaScope }

export type SlaChannel = 'email' | 'telegram' | 'zalo' | 'sms' | 'voice'

export interface SlaConfigView {
  id: string
  scopeType: SlaScope
  scopeId: string | null
  productId: string | null
  productName?: string | null
  deliveryStrategy: DeliveryStrategy
  threshold1Minutes: number
  threshold1Channels: SlaChannel[]
  threshold2Minutes: number
  threshold2Channels: SlaChannel[]
  threshold3Minutes: number
  threshold3Channels: SlaChannel[]
  autoCancelAtMinutes: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSlaConfigInput {
  scopeType: SlaScope
  scopeId?: string | null
  productId?: string | null
  deliveryStrategy: DeliveryStrategy
  threshold1Minutes: number
  threshold1Channels: SlaChannel[]
  threshold2Minutes: number
  threshold2Channels: SlaChannel[]
  threshold3Minutes: number
  threshold3Channels: SlaChannel[]
  autoCancelAtMinutes?: number | null
  isActive?: boolean
}

export interface UpdateSlaConfigInput {
  deliveryStrategy?: DeliveryStrategy
  threshold1Minutes?: number
  threshold1Channels?: SlaChannel[]
  threshold2Minutes?: number
  threshold2Channels?: SlaChannel[]
  threshold3Minutes?: number
  threshold3Channels?: SlaChannel[]
  autoCancelAtMinutes?: number | null
  isActive?: boolean
}

export type { SlaConfig }
