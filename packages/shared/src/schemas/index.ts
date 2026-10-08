import { z } from 'zod';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
  COMPLAINT_CATEGORIES,
  DEPARTMENT_CODES,
  NOTE_VISIBILITIES,
  PRIORITIES,
  UTILITY_SERVICE_TYPES,
} from '../constants/domain';
import { COMPLAINT_STATUSES } from '../constants/status';

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .pipe(z.email('Enter a valid email address.'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.');

export const uuidSchema = z.uuid('Invalid identifier.');

/* ------------------------------------------------------------------ */
/* Auth & profile                                                      */
/* ------------------------------------------------------------------ */

export const registerSchema = z.object({
  name: trimmed(2, 80, 'Name'),
  email: emailSchema,
  password: passwordSchema,
  phone: z.union([phoneSchema, z.literal('')]).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'This reset link is invalid.').max(200),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  name: trimmed(2, 80, 'Name'),
  phone: z.union([phoneSchema, z.literal('')]).optional(),
  ward: z.union([trimmed(2, 80, 'Locality'), z.literal('')]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/* ------------------------------------------------------------------ */
/* Complaints                                                          */
/* ------------------------------------------------------------------ */

export const complaintCategorySchema = z.enum(COMPLAINT_CATEGORIES, 'Choose a category.');
export const complaintStatusSchema = z.enum(COMPLAINT_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);

/** Shape used by the report form on the client (numbers already parsed). */
export const complaintFormSchema = z.object({
  title: trimmed(8, 120, 'Title'),
  description: trimmed(20, 2000, 'Description'),
  category: complaintCategorySchema,
  latitude: z.number('Pick a location on the map.').min(-90).max(90),
  longitude: z.number('Pick a location on the map.').min(-180).max(180),
  address: trimmed(5, 200, 'Address or landmark'),
  additionalNotes: z.string().trim().max(1000, 'Notes must be at most 1000 characters.').optional(),
});
export type ComplaintFormInput = z.infer<typeof complaintFormSchema>;

/**
 * Multipart fields arrive as strings. Blank values must stay "missing":
 * a bare z.coerce.number() would turn "" into 0 and silently place the
 * complaint at latitude/longitude 0.
 */
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const coordinate = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number('Pick a location on the map.').min(min, 'Pick a location on the map.').max(max, 'Pick a location on the map.'));

/** Same fields as they arrive in a multipart body (all strings). */
export const createComplaintBodySchema = complaintFormSchema.extend({
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});
export type CreateComplaintBody = z.infer<typeof createComplaintBodySchema>;

const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(10);
const optionalDate = z.iso.date().optional();

export const complaintListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  search: z.string().trim().max(120).optional(),
  status: complaintStatusSchema.optional(),
  category: complaintCategorySchema.optional(),
  priority: prioritySchema.optional(),
  departmentId: z.union([uuidSchema, z.literal('unassigned')]).optional(),
  from: optionalDate,
  to: optionalDate,
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'trackingNumber', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;

export const assignComplaintSchema = z.object({
  departmentId: uuidSchema,
  priority: prioritySchema.optional(),
  category: complaintCategorySchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;

export const updateStatusSchema = z.object({
  status: complaintStatusSchema,
  reason: z.string().trim().max(1000).optional(),
  resolutionSummary: z.string().trim().max(2000).optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const addNoteSchema = z.object({
  body: trimmed(2, 2000, 'Note'),
  visibility: z.enum(NOTE_VISIBILITIES).default('PUBLIC'),
});
export type AddNoteInput = z.infer<typeof addNoteSchema>;

export const feedbackSchema = z.object({
  rating: z.number().int().min(1, 'Choose a rating.').max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const reopenSchema = z.object({
  reason: trimmed(10, 1000, 'Reason'),
});
export type ReopenInput = z.infer<typeof reopenSchema>;

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  category: complaintCategorySchema.optional(),
  radiusMeters: z.coerce.number().int().min(50).max(2000).default(400),
  text: z.string().trim().max(2000).optional(),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

export const publicMapQuerySchema = z.object({
  status: complaintStatusSchema.optional(),
  category: complaintCategorySchema.optional(),
  from: optionalDate,
  to: optionalDate,
});
export type PublicMapQuery = z.infer<typeof publicMapQuerySchema>;

/* ------------------------------------------------------------------ */
/* AI classification                                                   */
/* ------------------------------------------------------------------ */

export const classifyComplaintSchema = z.object({
  title: z.string().trim().max(120).default(''),
  description: trimmed(10, 2000, 'Description'),
  category: complaintCategorySchema.optional(),
});
export type ClassifyComplaintInput = z.infer<typeof classifyComplaintSchema>;

/* ------------------------------------------------------------------ */
/* Departments & users                                                 */
/* ------------------------------------------------------------------ */

export const createDepartmentSchema = z.object({
  name: trimmed(3, 80, 'Name'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,23}$/, 'Code must be 2 to 24 letters, numbers or underscores.'),
  description: trimmed(5, 400, 'Description'),
  contactEmail: z.union([emailSchema, z.literal('')]).optional(),
  active: z.boolean().default(true),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentCodeSchema = z.enum(DEPARTMENT_CODES);

export const createStaffSchema = z.object({
  name: trimmed(2, 80, 'Name'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['DEPARTMENT_OFFICER', 'ADMIN']),
  departmentId: uuidSchema.optional(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateUserSchema = z.object({
  role: z.enum(['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  departmentIds: z.array(uuidSchema).max(6).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  search: z.string().trim().max(120).optional(),
  role: z.enum(['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN']).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

const optionalIsoDateTime = z.union([z.iso.datetime({ offset: true }), z.literal(''), z.null()]).optional();

export const announcementBaseSchema = z.object({
  title: trimmed(5, 140, 'Title'),
  summary: z.string().trim().max(280, 'Summary must be at most 280 characters.').optional(),
  content: trimmed(20, 5000, 'Content'),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  status: z.enum(ANNOUNCEMENT_STATUSES).default('DRAFT'),
  publishedAt: optionalIsoDateTime,
  expiresAt: optionalIsoDateTime,
  pinned: z.boolean().default(false),
});

const checkAnnouncementDates = (
  value: { publishedAt?: string | null; expiresAt?: string | null },
  ctx: z.RefinementCtx,
) => {
  if (value.publishedAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.publishedAt)) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be after the publication date.' });
  }
};

export const createAnnouncementSchema = announcementBaseSchema.superRefine(checkAnnouncementDates);
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = announcementBaseSchema.partial().superRefine(checkAnnouncementDates);
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const announcementListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional(),
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  /** Only notices published on or after this date (YYYY-MM-DD). */
  from: optionalDate,
});
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>;

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export const utilityServiceTypeSchema = z.enum(UTILITY_SERVICE_TYPES);

export const billListQuerySchema = z.object({
  status: z.enum(['UNPAID', 'PAID']).optional(),
  serviceType: utilityServiceTypeSchema.optional(),
});
export type BillListQuery = z.infer<typeof billListQuerySchema>;

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16, 'Idempotency-Key header is required.')
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, 'Idempotency-Key has invalid characters.');

/* ------------------------------------------------------------------ */
/* Notifications & audit                                               */
/* ------------------------------------------------------------------ */

export const notificationListQuerySchema = z.object({
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const auditListQuerySchema = z.object({
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  entityType: z.string().trim().max(40).optional(),
  action: z.string().trim().max(60).optional(),
  search: z.string().trim().max(120).optional(),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
