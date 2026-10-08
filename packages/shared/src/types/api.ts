import type {
  AnnouncementCategory,
  AnnouncementStatus,
  BillStatus,
  ClassificationSource,
  ComplaintCategory,
  DepartmentCode,
  NoteVisibility,
  NotificationType,
  Priority,
  Role,
  UtilityServiceType,
} from '../constants/domain';
import type { ComplaintStatus } from '../constants/status';

/* ------------------------------------------------------------------ */
/* Envelope                                                            */
/* ------------------------------------------------------------------ */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level validation messages, keyed by field path. */
    fields?: Record<string, string>;
  };
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export interface DepartmentSummary {
  id: string;
  code: string;
  name: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  ward: string | null;
  avatarUrl: string | null;
  departments: DepartmentSummary[];
  createdAt: string;
}

export interface ActorSummary {
  id: string;
  name: string;
  role: Role;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  departments: DepartmentSummary[];
  complaintCount: number;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

/* ------------------------------------------------------------------ */
/* Departments                                                         */
/* ------------------------------------------------------------------ */

export interface DepartmentDto extends DepartmentSummary {
  description: string;
  contactEmail: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    open: number;
    inProgress: number;
    resolved: number;
    officers: number;
  };
  officers: { id: string; name: string; email: string }[];
}

/* ------------------------------------------------------------------ */
/* Complaints                                                          */
/* ------------------------------------------------------------------ */

export interface AttachmentDto {
  id: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  kind: 'EVIDENCE' | 'RESOLUTION';
  uploadedAt: string;
}

export interface ComplaintListItem {
  id: string;
  trackingId: string;
  title: string;
  category: ComplaintCategory;
  priority: Priority;
  status: ComplaintStatus;
  address: string;
  latitude: number;
  longitude: number;
  department: DepartmentSummary | null;
  thumbnailUrl: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  citizen?: { id: string; name: string };
}

export type TimelineEventType = 'STATUS' | 'ASSIGNMENT' | 'NOTE' | 'FEEDBACK';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  createdAt: string;
  actor: ActorSummary | null;
  fromStatus?: ComplaintStatus | null;
  toStatus?: ComplaintStatus;
  department?: DepartmentSummary | null;
  previousDepartment?: DepartmentSummary | null;
  body?: string | null;
  visibility?: NoteVisibility;
  rating?: number;
}

export interface ClassificationDto {
  id: string;
  suggestedCategory: ComplaintCategory;
  suggestedDepartmentCode: DepartmentCode;
  suggestedDepartment: DepartmentSummary | null;
  suggestedPriority: Priority;
  explanation: string;
  source: ClassificationSource;
  model: string | null;
  signals: string[];
  reviewOutcome: 'PENDING' | 'ACCEPTED' | 'OVERRIDDEN';
  createdAt: string;
}

export interface ComplaintPermissions {
  allowedStatuses: ComplaintStatus[];
  canAssign: boolean;
  canAddPublicNote: boolean;
  canAddInternalNote: boolean;
  canReopen: boolean;
  canGiveFeedback: boolean;
  canViewCitizenContact: boolean;
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string;
  additionalNotes: string | null;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  attachments: AttachmentDto[];
  classification: ClassificationDto | null;
  timeline: TimelineEvent[];
  feedback: { rating: number; comment: string | null; createdAt: string } | null;
  citizenContact?: { name: string; email: string; phone: string | null } | null;
  permissions: ComplaintPermissions;
}

export interface CreatedComplaint {
  id: string;
  trackingId: string;
  status: ComplaintStatus;
  classification: ClassificationDto | null;
}

export interface PublicMapComplaint {
  id: string;
  trackingId: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
  isDemo: boolean;
  isMine: boolean;
}

export interface NearbyComplaint extends PublicMapComplaint {
  distanceMeters: number;
  similarity: number;
}

export interface PublicStats {
  total: number;
  resolved: number;
  open: number;
  departments: number;
  byCategory: { category: ComplaintCategory; count: number }[];
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export interface ClassificationResult {
  suggestedCategory: ComplaintCategory;
  suggestedDepartmentCode: DepartmentCode;
  suggestedDepartmentName: string;
  suggestedPriority: Priority;
  explanation: string;
  source: ClassificationSource;
  model: string | null;
  signals: string[];
  /** Set when the LLM provider failed and the rule-based fallback answered. */
  fallbackReason?: string;
}

/* ------------------------------------------------------------------ */
/* Dashboards & analytics                                              */
/* ------------------------------------------------------------------ */

export type StatusCounts = Record<ComplaintStatus, number>;

export interface CitizenDashboard {
  counts: StatusCounts & { total: number };
  pendingBills: { count: number; totalAmount: string; overdue: number };
  upcomingBills: BillDto[];
  recentComplaints: ComplaintListItem[];
  recentActivity: (TimelineEvent & { complaint: { id: string; trackingId: string; title: string } })[];
  unreadNotifications: number;
  latestAnnouncements: AnnouncementDto[];
}

export interface AdminAnalytics {
  rangeDays: number;
  totals: StatusCounts & { total: number; open: number };
  averageResolutionHours: number | null;
  resolvedSampleSize: number;
  activeDepartments: number;
  byCategory: { category: ComplaintCategory; count: number }[];
  byStatus: { status: ComplaintStatus; count: number }[];
  byPriority: { priority: Priority; count: number }[];
  trend: { date: string; submitted: number; resolved: number }[];
  departmentWorkload: {
    departmentId: string;
    name: string;
    code: string;
    assigned: number;
    inProgress: number;
    resolved: number;
  }[];
  resolutionTrend: { week: string; averageHours: number; count: number }[];
  repeatHotspots: { address: string; category: ComplaintCategory; count: number }[];
  recentActivity: AuditLogDto[];
}

export interface DepartmentOverview {
  departments: DepartmentSummary[];
  counts: { assigned: number; inProgress: number; reopened: number; resolvedThisMonth: number; total: number };
  urgent: ComplaintListItem[];
  recent: ComplaintListItem[];
  averageResolutionHours: number | null;
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export interface PaymentDto {
  id: string;
  billId: string;
  referenceNumber: string;
  amount: string;
  status: 'SUCCEEDED' | 'FAILED';
  serviceType: UtilityServiceType;
  billingPeriod: string;
  demoAccountNumber: string;
  createdAt: string;
  isDemo: true;
}

export interface BillDto {
  id: string;
  serviceType: UtilityServiceType;
  serviceLabel: string;
  provider: string;
  demoAccountNumber: string;
  amount: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: BillStatus;
  isOverdue: boolean;
  unitsConsumed: string | null;
  unitLabel: string | null;
  paidAt: string | null;
  payment: PaymentDto | null;
  isDemo: true;
}

export interface DemoPaymentResult {
  payment: PaymentDto;
  bill: BillDto;
  /** True when this response replays an earlier request with the same idempotency key. */
  replayed: boolean;
}

export interface AdminUtilityOverview {
  totals: { bills: number; unpaid: number; paid: number; overdue: number; collected: string; outstanding: string };
  byService: { serviceType: UtilityServiceType; paid: number; unpaid: number; collected: string }[];
  recentPayments: (PaymentDto & { citizen: { id: string; name: string } })[];
}

/* ------------------------------------------------------------------ */
/* Announcements, notifications, audit                                 */
/* ------------------------------------------------------------------ */

export interface AnnouncementDto {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  pinned: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string } | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActorSummary | null;
}

export interface SystemStatus {
  ai: { provider: 'anthropic' | 'none'; model: string | null; configured: boolean };
  storage: { driver: 'local' | 's3'; durable: boolean };
  email: { configured: boolean };
  realtime: { connectedClients: number };
  environment: string;
  reopenWindowDays: number;
  database: { ok: boolean };
}
