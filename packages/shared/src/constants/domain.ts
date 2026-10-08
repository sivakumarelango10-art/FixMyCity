/**
 * Core domain vocabulary shared by the API, the web app and the seed script.
 * String values mirror the Prisma enums one-to-one.
 */

export const ROLES = ['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = ['DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'];
export const ADMIN_ROLES: readonly Role[] = ['ADMIN', 'SUPER_ADMIN'];

export const ROLE_LABELS: Record<Role, string> = {
  CITIZEN: 'Citizen',
  DEPARTMENT_OFFICER: 'Department officer',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super admin',
};

export function isAdminRole(role: Role | undefined | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** Where each role lands after signing in. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'DEPARTMENT_OFFICER':
      return '/department';
    default:
      return '/dashboard';
  }
}

/* ------------------------------------------------------------------ */
/* Departments                                                         */
/* ------------------------------------------------------------------ */

export const DEPARTMENT_CODES = ['ROADS', 'WATER', 'SANITATION', 'LIGHTING', 'DRAINAGE', 'GENERAL'] as const;
export type DepartmentCode = (typeof DEPARTMENT_CODES)[number];

export const DEPARTMENT_DEFAULTS: Record<DepartmentCode, { name: string; description: string }> = {
  ROADS: {
    name: 'Road Maintenance Department',
    description: 'Potholes, damaged roads, footpaths, road markings and traffic infrastructure.',
  },
  WATER: {
    name: 'Water Supply Department',
    description: 'Pipeline bursts, leakages, supply interruptions and water quality issues.',
  },
  SANITATION: {
    name: 'Sanitation Department',
    description: 'Garbage collection, public toilets, street cleaning and waste segregation.',
  },
  LIGHTING: {
    name: 'Street Lighting Department',
    description: 'Streetlight failures, flickering lamps, exposed wiring and dark stretches.',
  },
  DRAINAGE: {
    name: 'Drainage Department',
    description: 'Blocked drains, overflowing sewers, stormwater flooding and open manholes.',
  },
  GENERAL: {
    name: 'General Municipal Services',
    description: 'Public property, parks, signage and issues that span several departments.',
  },
};

/* ------------------------------------------------------------------ */
/* Complaint categories                                                */
/* ------------------------------------------------------------------ */

export const COMPLAINT_CATEGORIES = [
  'POTHOLES',
  'ROAD_DAMAGE',
  'WATER_LEAKAGE',
  'GARBAGE_COLLECTION',
  'STREETLIGHT_FAILURE',
  'DRAINAGE',
  'PUBLIC_SANITATION',
  'TRAFFIC_INFRASTRUCTURE',
  'PUBLIC_PROPERTY_DAMAGE',
  'OTHER',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export interface CategoryMeta {
  label: string;
  /** Broader infrastructure group, shown next to the category. */
  group: string;
  departmentCode: DepartmentCode;
  hint: string;
}

export const CATEGORY_META: Record<ComplaintCategory, CategoryMeta> = {
  POTHOLES: {
    label: 'Potholes',
    group: 'Road Infrastructure',
    departmentCode: 'ROADS',
    hint: 'Holes or craters in the road surface',
  },
  ROAD_DAMAGE: {
    label: 'Road Damage',
    group: 'Road Infrastructure',
    departmentCode: 'ROADS',
    hint: 'Cracked roads, broken footpaths, caved-in edges',
  },
  WATER_LEAKAGE: {
    label: 'Water Leakage',
    group: 'Water Infrastructure',
    departmentCode: 'WATER',
    hint: 'Burst pipelines, leaking valves, supply loss',
  },
  GARBAGE_COLLECTION: {
    label: 'Garbage Collection',
    group: 'Sanitation',
    departmentCode: 'SANITATION',
    hint: 'Missed pickups, overflowing bins, dumping',
  },
  STREETLIGHT_FAILURE: {
    label: 'Streetlight Failure',
    group: 'Street Lighting',
    departmentCode: 'LIGHTING',
    hint: 'Lights out, flickering or damaged poles',
  },
  DRAINAGE: {
    label: 'Drainage Problems',
    group: 'Drainage & Stormwater',
    departmentCode: 'DRAINAGE',
    hint: 'Blocked drains, flooding, open manholes',
  },
  PUBLIC_SANITATION: {
    label: 'Public Sanitation',
    group: 'Sanitation',
    departmentCode: 'SANITATION',
    hint: 'Public toilets, unhygienic spots, dead animals',
  },
  TRAFFIC_INFRASTRUCTURE: {
    label: 'Traffic Infrastructure',
    group: 'Road Infrastructure',
    departmentCode: 'ROADS',
    hint: 'Signals, signboards, road markings, medians',
  },
  PUBLIC_PROPERTY_DAMAGE: {
    label: 'Public Property Damage',
    group: 'Public Property',
    departmentCode: 'GENERAL',
    hint: 'Benches, bus shelters, park fixtures, walls',
  },
  OTHER: {
    label: 'Other Civic Issues',
    group: 'General Services',
    departmentCode: 'GENERAL',
    hint: 'Anything that does not fit the list above',
  },
};

/* ------------------------------------------------------------------ */
/* Priority                                                            */
/* ------------------------------------------------------------------ */

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/* ------------------------------------------------------------------ */
/* Utilities & payments                                                */
/* ------------------------------------------------------------------ */

export const UTILITY_SERVICE_TYPES = ['ELECTRICITY', 'WATER', 'PROPERTY_TAX', 'WASTE_MANAGEMENT'] as const;
export type UtilityServiceType = (typeof UTILITY_SERVICE_TYPES)[number];

export const UTILITY_LABELS: Record<UtilityServiceType, { label: string; provider: string }> = {
  ELECTRICITY: { label: 'Electricity', provider: 'Demo City Power Supply (simulated)' },
  WATER: { label: 'Water', provider: 'Demo City Water Board (simulated)' },
  PROPERTY_TAX: { label: 'Property Tax', provider: 'Demo Municipal Revenue Office (simulated)' },
  WASTE_MANAGEMENT: { label: 'Waste Management', provider: 'Demo Solid Waste Services (simulated)' },
};

export const BILL_STATUSES = ['UNPAID', 'PAID'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const DEMO_PAYMENT_NOTICE = 'DEMO PAYMENT - NO REAL MONEY IS TRANSFERRED';

/* ------------------------------------------------------------------ */
/* Announcements & notifications                                       */
/* ------------------------------------------------------------------ */

export const ANNOUNCEMENT_CATEGORIES = [
  'GENERAL',
  'SERVICE_UPDATE',
  'MAINTENANCE',
  'EMERGENCY',
  'EVENT',
  'ADVISORY',
] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  GENERAL: 'General',
  SERVICE_UPDATE: 'Service update',
  MAINTENANCE: 'Maintenance',
  EMERGENCY: 'Emergency',
  EVENT: 'Event',
  ADVISORY: 'Advisory',
};

export const ANNOUNCEMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'COMPLAINT_RECEIVED',
  'COMPLAINT_ASSIGNED',
  'COMPLAINT_STATUS',
  'COMPLAINT_RESOLVED',
  'COMPLAINT_NOTE',
  'ANNOUNCEMENT',
  'PAYMENT',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTE_VISIBILITIES = ['PUBLIC', 'INTERNAL'] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

export const CLASSIFICATION_SOURCES = ['LLM', 'RULE_BASED'] as const;
export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

export const CLASSIFICATION_SOURCE_LABELS: Record<ClassificationSource, string> = {
  LLM: 'AI provider (LLM)',
  RULE_BASED: 'Local rule-based classifier',
};

/* ------------------------------------------------------------------ */
/* Upload limits                                                       */
/* ------------------------------------------------------------------ */

export const UPLOAD_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 3,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as readonly string[],
};

/** Days after resolution during which the citizen can reopen a complaint. */
export const REOPEN_WINDOW_DAYS = 30;
