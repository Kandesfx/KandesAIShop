export { couponService } from './service'
export type {
  Coupon,
  CouponType,
  CreateCouponInput,
  UpdateCouponInput,
  CouponValidationResult,
} from './types'
export {
  couponTypeSchema,
  createCouponSchema,
  updateCouponSchema,
  applyCouponSchema,
} from './validators'
export type {
  CreateCouponInput as CreateCouponInputSchema,
  UpdateCouponInput as UpdateCouponInputSchema,
  ApplyCouponInput,
} from './validators'
