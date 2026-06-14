/**
 * Notifications feature public surface. Integration mounts these:
 *   import {
 *     NotificationsProvider,
 *     NotificationsScreen,
 *     useRegisterPush,
 *   } from '@/features/notifications';
 */
export { useRegisterPush } from './use-register-push';
export type { RegisterPushState } from './use-register-push';
export {
  NotificationsProvider,
  useNotificationsFeed,
} from './notifications-provider';
export { default as NotificationsScreen } from './notifications-screen';
export type {
  FeedNotification,
  RegisterPushRequest,
  RegisterPushResponse,
} from './types';
