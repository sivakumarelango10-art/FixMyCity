/** Socket.IO event names. Payloads carry identifiers only; clients refetch details over the authorized REST API. */
export const SOCKET_EVENTS = {
  COMPLAINT_CREATED: 'complaint.created',
  COMPLAINT_ASSIGNED: 'complaint.assigned',
  COMPLAINT_STATUS_CHANGED: 'complaint.status_changed',
  COMPLAINT_RESOLVED: 'complaint.resolved',
  COMPLAINT_UPDATED: 'complaint.updated',
  NOTIFICATION_CREATED: 'notification.created',
  ANNOUNCEMENT_PUBLISHED: 'announcement.published',
  BILL_PAID: 'bill.paid',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface ComplaintEventPayload {
  complaintId: string;
  trackingId: string;
  status: string;
  departmentId: string | null;
  at: string;
}

export interface NotificationEventPayload {
  notificationId: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
}

export interface AnnouncementEventPayload {
  announcementId: string;
  title: string;
  category: string;
}
