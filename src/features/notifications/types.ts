/**
 * Shared types for the notifications feature.
 */

/** Request body for `POST /mobile/notifications/register-push`. */
export interface RegisterPushRequest {
  userAddress: string;
  expoPushToken: string;
  platform?: string;
}

/** Response from `POST /mobile/notifications/register-push`. */
export interface RegisterPushResponse {
  registered: boolean;
}

/**
 * A flattened, persistable record of a notification the app has received in the
 * foreground (or via a tap response). We deliberately store only the small,
 * serialisable subset we render in the feed — not the whole Expo `Notification`
 * object (whose `trigger`/native payload isn't reliably JSON-round-trippable).
 */
export interface FeedNotification {
  /** Stable id — the Expo notification request identifier, or a generated one. */
  id: string;
  title: string | null;
  body: string | null;
  /** Epoch milliseconds the notification was received. */
  receivedAt: number;
  /** Arbitrary data payload attached to the notification, if any. */
  data?: Record<string, unknown>;
}
