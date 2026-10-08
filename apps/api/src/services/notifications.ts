import type { Notification, NotificationType } from '@prisma/client';
import type { Tx } from '../lib/prisma.js';
import { emitNotification } from '../sockets/index.js';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

/** Persists notifications inside the caller's transaction. Call publishNotifications after commit. */
export async function createNotifications(tx: Tx, items: NotificationInput[]): Promise<Notification[]> {
  const unique = new Map<string, NotificationInput>();
  for (const item of items) unique.set(`${item.userId}:${item.type}:${item.title}`, item);
  const created: Notification[] = [];
  for (const item of unique.values()) {
    created.push(
      await tx.notification.create({
        data: { userId: item.userId, type: item.type, title: item.title, message: item.message, link: item.link ?? null },
      }),
    );
  }
  return created;
}

/** Pushes already-persisted notifications to their owners' sockets. */
export function publishNotifications(notifications: Notification[]) {
  for (const n of notifications) {
    emitNotification(n.userId, { notificationId: n.id, title: n.title, message: n.message, link: n.link, type: n.type });
  }
}
