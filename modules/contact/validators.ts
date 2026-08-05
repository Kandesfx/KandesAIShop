import { z } from 'zod'

export const createContactSchema = z.object({
  name: z.string().min(2, 'Tên ≥ 2 ký tự').max(100),
  email: z.string().email('Email không hợp lệ'),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{8,20}$/, 'Số điện thoại không hợp lệ')
    .optional(),
  subject: z.string().min(3, 'Tiêu đề ≥ 3 ký tự').max(200),
  message: z.string().min(10, 'Nội dung ≥ 10 ký tự').max(5000),
  category: z.string().max(50).optional(),
})

export type CreateContactSchema = z.infer<typeof createContactSchema>
