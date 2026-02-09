// ═══════════════════════════════════════════════════════════════════════════════
// Validators - Branded Types (FAZ 6 Security)
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Base ID Schema
// ─────────────────────────────────────────────────────────────────────────────

const baseIdSchema = z.string().min(1).max(128)

// ─────────────────────────────────────────────────────────────────────────────
// Shared Entity IDs (Cross-App Safe)
// ─────────────────────────────────────────────────────────────────────────────

export const UserId = baseIdSchema.brand<"UserId">()
export type UserId = z.infer<typeof UserId>

export const TenantId = baseIdSchema.brand<"TenantId">()
export type TenantId = z.infer<typeof TenantId>

export const SessionId = baseIdSchema.brand<"SessionId">()
export type SessionId = z.infer<typeof SessionId>

export const FileId = baseIdSchema.brand<"FileId">()
export type FileId = z.infer<typeof FileId>

export const NotificationId = baseIdSchema.brand<"NotificationId">()
export type NotificationId = z.infer<typeof NotificationId>

export const AuditLogId = baseIdSchema.brand<"AuditLogId">()
export type AuditLogId = z.infer<typeof AuditLogId>

// ─────────────────────────────────────────────────────────────────────────────
// Ecommerce Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const EcommerceProductId = baseIdSchema.brand<"EcommerceProductId">()
export type EcommerceProductId = z.infer<typeof EcommerceProductId>

export const EcommerceOrderId = baseIdSchema.brand<"EcommerceOrderId">()
export type EcommerceOrderId = z.infer<typeof EcommerceOrderId>

export const EcommerceCartId = baseIdSchema.brand<"EcommerceCartId">()
export type EcommerceCartId = z.infer<typeof EcommerceCartId>

export const EcommerceCategoryId = baseIdSchema.brand<"EcommerceCategoryId">()
export type EcommerceCategoryId = z.infer<typeof EcommerceCategoryId>

export const EcommerceReviewId = baseIdSchema.brand<"EcommerceReviewId">()
export type EcommerceReviewId = z.infer<typeof EcommerceReviewId>

// ─────────────────────────────────────────────────────────────────────────────
// CRM Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const CrmContactId = baseIdSchema.brand<"CrmContactId">()
export type CrmContactId = z.infer<typeof CrmContactId>

export const CrmDealId = baseIdSchema.brand<"CrmDealId">()
export type CrmDealId = z.infer<typeof CrmDealId>

export const CrmActivityId = baseIdSchema.brand<"CrmActivityId">()
export type CrmActivityId = z.infer<typeof CrmActivityId>

export const CrmPipelineId = baseIdSchema.brand<"CrmPipelineId">()
export type CrmPipelineId = z.infer<typeof CrmPipelineId>

export const CrmStageId = baseIdSchema.brand<"CrmStageId">()
export type CrmStageId = z.infer<typeof CrmStageId>

// ─────────────────────────────────────────────────────────────────────────────
// Salon Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const SalonAppointmentId = baseIdSchema.brand<"SalonAppointmentId">()
export type SalonAppointmentId = z.infer<typeof SalonAppointmentId>

export const SalonServiceId = baseIdSchema.brand<"SalonServiceId">()
export type SalonServiceId = z.infer<typeof SalonServiceId>

export const SalonProviderId = baseIdSchema.brand<"SalonProviderId">()
export type SalonProviderId = z.infer<typeof SalonProviderId>

export const SalonTimeSlotId = baseIdSchema.brand<"SalonTimeSlotId">()
export type SalonTimeSlotId = z.infer<typeof SalonTimeSlotId>

// ─────────────────────────────────────────────────────────────────────────────
// Booking Entity IDs (Generic Appointments)
// ─────────────────────────────────────────────────────────────────────────────

export const BookingAppointmentId = baseIdSchema.brand<"BookingAppointmentId">()
export type BookingAppointmentId = z.infer<typeof BookingAppointmentId>

export const BookingServiceId = baseIdSchema.brand<"BookingServiceId">()
export type BookingServiceId = z.infer<typeof BookingServiceId>

export const BookingProviderId = baseIdSchema.brand<"BookingProviderId">()
export type BookingProviderId = z.infer<typeof BookingProviderId>

// ─────────────────────────────────────────────────────────────────────────────
// HR Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const HrEmployeeId = baseIdSchema.brand<"HrEmployeeId">()
export type HrEmployeeId = z.infer<typeof HrEmployeeId>

export const HrDepartmentId = baseIdSchema.brand<"HrDepartmentId">()
export type HrDepartmentId = z.infer<typeof HrDepartmentId>

export const HrPositionId = baseIdSchema.brand<"HrPositionId">()
export type HrPositionId = z.infer<typeof HrPositionId>

export const HrLeaveRequestId = baseIdSchema.brand<"HrLeaveRequestId">()
export type HrLeaveRequestId = z.infer<typeof HrLeaveRequestId>

// ─────────────────────────────────────────────────────────────────────────────
// ERP Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const ErpAccountId = baseIdSchema.brand<"ErpAccountId">()
export type ErpAccountId = z.infer<typeof ErpAccountId>

export const ErpInvoiceId = baseIdSchema.brand<"ErpInvoiceId">()
export type ErpInvoiceId = z.infer<typeof ErpInvoiceId>

export const ErpTransactionId = baseIdSchema.brand<"ErpTransactionId">()
export type ErpTransactionId = z.infer<typeof ErpTransactionId>

// ─────────────────────────────────────────────────────────────────────────────
// WMS Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const WmsInventoryId = baseIdSchema.brand<"WmsInventoryId">()
export type WmsInventoryId = z.infer<typeof WmsInventoryId>

export const WmsLocationId = baseIdSchema.brand<"WmsLocationId">()
export type WmsLocationId = z.infer<typeof WmsLocationId>

export const WmsShipmentId = baseIdSchema.brand<"WmsShipmentId">()
export type WmsShipmentId = z.infer<typeof WmsShipmentId>

export const WmsStockMovementId = baseIdSchema.brand<"WmsStockMovementId">()
export type WmsStockMovementId = z.infer<typeof WmsStockMovementId>

// ─────────────────────────────────────────────────────────────────────────────
// CMS Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const CmsPostId = baseIdSchema.brand<"CmsPostId">()
export type CmsPostId = z.infer<typeof CmsPostId>

export const CmsPageId = baseIdSchema.brand<"CmsPageId">()
export type CmsPageId = z.infer<typeof CmsPageId>

export const CmsMediaId = baseIdSchema.brand<"CmsMediaId">()
export type CmsMediaId = z.infer<typeof CmsMediaId>

export const CmsCategoryId = baseIdSchema.brand<"CmsCategoryId">()
export type CmsCategoryId = z.infer<typeof CmsCategoryId>

// ─────────────────────────────────────────────────────────────────────────────
// TMS Entity IDs
// ─────────────────────────────────────────────────────────────────────────────

export const TmsVehicleId = baseIdSchema.brand<"TmsVehicleId">()
export type TmsVehicleId = z.infer<typeof TmsVehicleId>

export const TmsRouteId = baseIdSchema.brand<"TmsRouteId">()
export type TmsRouteId = z.infer<typeof TmsRouteId>

export const TmsDeliveryId = baseIdSchema.brand<"TmsDeliveryId">()
export type TmsDeliveryId = z.infer<typeof TmsDeliveryId>

export const TmsDriverId = baseIdSchema.brand<"TmsDriverId">()
export type TmsDriverId = z.infer<typeof TmsDriverId>

// ─────────────────────────────────────────────────────────────────────────────
// ID Creation Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createAppId<T extends z.ZodTypeAny>(
  value: string,
  schema: T
): z.infer<T> {
  return schema.parse(value)
}

// ─────────────────────────────────────────────────────────────────────────────
// App-Specific ID Registry
// ─────────────────────────────────────────────────────────────────────────────

const APP_ID_SCHEMAS = {
  ecommerce: {
    product: EcommerceProductId,
    order: EcommerceOrderId,
    cart: EcommerceCartId,
    category: EcommerceCategoryId,
    review: EcommerceReviewId,
  },
  crm: {
    contact: CrmContactId,
    deal: CrmDealId,
    activity: CrmActivityId,
    pipeline: CrmPipelineId,
    stage: CrmStageId,
  },
  salon: {
    appointment: SalonAppointmentId,
    service: SalonServiceId,
    provider: SalonProviderId,
    timeSlot: SalonTimeSlotId,
  },
  booking: {
    appointment: BookingAppointmentId,
    service: BookingServiceId,
    provider: BookingProviderId,
  },
  hr: {
    employee: HrEmployeeId,
    department: HrDepartmentId,
    position: HrPositionId,
    leaveRequest: HrLeaveRequestId,
  },
  erp: {
    account: ErpAccountId,
    invoice: ErpInvoiceId,
    transaction: ErpTransactionId,
  },
  wms: {
    inventory: WmsInventoryId,
    location: WmsLocationId,
    shipment: WmsShipmentId,
    stockMovement: WmsStockMovementId,
  },
  cms: {
    post: CmsPostId,
    page: CmsPageId,
    media: CmsMediaId,
    category: CmsCategoryId,
  },
  tms: {
    vehicle: TmsVehicleId,
    route: TmsRouteId,
    delivery: TmsDeliveryId,
    driver: TmsDriverId,
  },
} as const

type AppIdSchemas = typeof APP_ID_SCHEMAS

function getAppIdSchema<
  A extends keyof AppIdSchemas,
  E extends keyof AppIdSchemas[A]
>(appId: A, entityType: E): AppIdSchemas[A][E] {
  return APP_ID_SCHEMAS[appId][entityType]
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

function isEcommerceId(
  id: unknown
): id is EcommerceProductId | EcommerceOrderId | EcommerceCartId {
  return (
    EcommerceProductId.safeParse(id).success ||
    EcommerceOrderId.safeParse(id).success ||
    EcommerceCartId.safeParse(id).success
  )
}

function isCrmId(
  id: unknown
): id is CrmContactId | CrmDealId | CrmActivityId {
  return (
    CrmContactId.safeParse(id).success ||
    CrmDealId.safeParse(id).success ||
    CrmActivityId.safeParse(id).success
  )
}

function isSalonId(
  id: unknown
): id is SalonAppointmentId | SalonServiceId | SalonProviderId {
  return (
    SalonAppointmentId.safeParse(id).success ||
    SalonServiceId.safeParse(id).success ||
    SalonProviderId.safeParse(id).success
  )
}

function isSharedId(
  id: unknown
): id is UserId | TenantId | SessionId | FileId | NotificationId {
  return (
    UserId.safeParse(id).success ||
    TenantId.safeParse(id).success ||
    SessionId.safeParse(id).success ||
    FileId.safeParse(id).success ||
    NotificationId.safeParse(id).success
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  createAppId,
  getAppIdSchema,
  isEcommerceId,
  isCrmId,
  isSalonId,
  isSharedId,
  APP_ID_SCHEMAS,
}
