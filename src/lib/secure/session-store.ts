import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store for sensitive tokens. On mobile the Wayex
 * session token lives here and is sent as a header (replacing the web app's
 * httpOnly cookie). See F3.
 */
const WAYEX_SESSION_KEY = 'kasu.wayex.session';

export async function getWayexSession(): Promise<string | null> {
  return SecureStore.getItemAsync(WAYEX_SESSION_KEY);
}

export async function setWayexSession(token: string): Promise<void> {
  await SecureStore.setItemAsync(WAYEX_SESSION_KEY, token);
}

export async function clearWayexSession(): Promise<void> {
  await SecureStore.deleteItemAsync(WAYEX_SESSION_KEY);
}
