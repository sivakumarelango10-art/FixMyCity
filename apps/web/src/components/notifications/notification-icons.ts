import { CheckCircle, ChatCircleText, CreditCard, Info, Megaphone, PaperPlaneTilt, Signpost, Wrench, type Icon } from '@phosphor-icons/react';
import type { NotificationType } from '@fixmycity/shared';

export const NOTIFICATION_ICONS: Record<NotificationType, Icon> = {
  COMPLAINT_RECEIVED: PaperPlaneTilt,
  COMPLAINT_ASSIGNED: Signpost,
  COMPLAINT_STATUS: Wrench,
  COMPLAINT_RESOLVED: CheckCircle,
  COMPLAINT_NOTE: ChatCircleText,
  ANNOUNCEMENT: Megaphone,
  PAYMENT: CreditCard,
  SYSTEM: Info,
};
