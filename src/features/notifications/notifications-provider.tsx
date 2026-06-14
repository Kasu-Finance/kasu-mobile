import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { FeedNotification } from './types';

const STORAGE_KEY = '@kasu/notifications-feed';
/** Cap the persisted feed so storage doesn't grow unbounded. */
const MAX_ITEMS = 100;

/**
 * Foreground presentation behaviour. With a wallet/DeFi app we want the user to
 * actually see incoming alerts while the app is open.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

interface NotificationsContextValue {
  /** Most-recent-first list of received notifications. */
  feed: FeedNotification[];
  /** Whether the persisted feed has finished hydrating from storage. */
  ready: boolean;
  /** Clear the in-memory and persisted feed. */
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Flatten an Expo `Notification` into our small, persistable feed record. */
function toFeedItem(notification: Notifications.Notification): FeedNotification {
  const { request } = notification;
  const content = request.content;
  return {
    id: request.identifier || `${notification.date}-${Math.random().toString(36).slice(2)}`,
    title: content.title ?? null,
    body: content.body ?? null,
    receivedAt: notification.date ? notification.date * 1000 : Date.now(),
    data:
      content.data && typeof content.data === 'object'
        ? (content.data as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Provides the in-app notifications feed. Sets the foreground notification
 * handler (module-scope, above), registers received + response listeners, and
 * persists the accumulated feed to AsyncStorage so it survives app restarts.
 *
 * Mount once near the app root (during integration), above any consumer of
 * `useNotificationsFeed`.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const [feed, setFeed] = useState<FeedNotification[]>([]);
  const [ready, setReady] = useState(false);

  // Hold the latest feed in a ref so listener callbacks (registered once) can
  // append without needing to re-subscribe on every state change.
  const feedRef = useRef<FeedNotification[]>([]);
  feedRef.current = feed;

  const persist = useCallback((items: FeedNotification[]) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      // Persistence is best-effort; ignore storage failures.
    });
  }, []);

  const addItem = useCallback(
    (item: FeedNotification) => {
      setFeed((prev) => {
        // De-dupe by id (a received notification may also produce a response).
        if (prev.some((existing) => existing.id === item.id)) return prev;
        const next = [item, ...prev].slice(0, MAX_ITEMS);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setFeed([]);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  // Hydrate the persisted feed on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as FeedNotification[];
          if (Array.isArray(parsed)) setFeed(parsed);
        }
      } catch {
        // Corrupt/absent storage — start with an empty feed.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to received + response events for the lifetime of the provider.
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        addItem(toFeedItem(notification));
      },
    );
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        addItem(toFeedItem(response.notification));
      },
    );
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [addItem]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ feed, ready, clear }),
    [feed, ready, clear],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Read the in-app notifications feed. Must be used under `NotificationsProvider`.
 */
export function useNotificationsFeed(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotificationsFeed must be used within a NotificationsProvider',
    );
  }
  return ctx;
}
