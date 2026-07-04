import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

/**
 * Hosted Compilot/Nexera KYC URL. Read directly from `process.env` (not via
 * `@/lib/env`, which is a foundation file we don't touch) — Metro statically
 * inlines `EXPO_PUBLIC_*` references at build time, so this must be a literal
 * member access, never a dynamic lookup.
 */
const COMPILOT_KYC_URL = process.env.EXPO_PUBLIC_COMPILOT_KYC_URL ?? '';

/**
 * Substrings that, when they appear in the WebView's URL, signal the hosted
 * flow finished. Compilot's exact return/redirect URL is unconfirmed — see the
 * TODO below — so we match loosely on the common completion markers used by
 * Persona/Wayex-style hosted flows and our own deep-link scheme.
 */
const SUCCESS_MARKERS = ['success', 'complete', 'completed', 'return', 'callback', 'kasumobile://'];

function urlSignalsCompletion(url: string): boolean {
  const lower = url.toLowerCase();
  return SUCCESS_MARKERS.some((m) => lower.includes(m));
}

export interface KycWebViewProps {
  /**
   * Fires once when the hosted flow reaches a completion URL. The caller is
   * responsible for refetching the authoritative status afterwards — a URL
   * match means "the widget closed", not "the user is verified".
   */
  onComplete: () => void;
  /** Optional: user-initiated cancel / back-out of the flow. */
  onCancel?: () => void;
  /**
   * Override the URL (e.g. a per-session link minted by the backend). Falls
   * back to `EXPO_PUBLIC_COMPILOT_KYC_URL` when omitted.
   */
  url?: string;
}

/**
 * Wraps `react-native-webview` to host the Compilot KYC flow. Completion is
 * detected via `onNavigationStateChange` (URL contains a success/return marker)
 * and surfaced through `onComplete`.
 *
 * TODO(compilot): Compilot's mobile / WebView flow is UNCONFIRMED. The web app
 * uses `@compilot/react-sdk`'s iframe widget which needs an in-page wallet
 * signature (`openWidget()` → `eth_sign`) — that handshake may not work inside
 * a bare WebView with a Privy embedded wallet. Two things to verify with
 * Compilot before shipping:
 *   1. Whether a hosted/redirect URL exists that completes verification without
 *      the embedded-SDK signature handshake (the fallback this component
 *      assumes, like Persona/Wayex hosted links).
 *   2. The exact success/return URL so `SUCCESS_MARKERS` can be tightened.
 * If a signature is required, we'll need a JS bridge (`injectedJavaScript` +
 * `onMessage`) to relay the sign request to the Privy wallet, or move KYC to an
 * external browser via `expo-web-browser`.
 */
export function KycWebView({ onComplete, onCancel, url }: KycWebViewProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  // Guard so a multi-redirect completion only fires `onComplete` once.
  const completedRef = useRef(false);

  const target = (url ?? COMPILOT_KYC_URL).trim();

  const handleNav = (nav: WebViewNavigation) => {
    if (completedRef.current) return;
    if (nav.url && urlSignalsCompletion(nav.url)) {
      completedRef.current = true;
      onComplete();
    }
  };

  // No hosted verification link available in this build — show a friendly
  // holding state rather than a developer message. (Identity verification for
  // saving/earning is being finished — see the plan's KYC track.)
  if (!target) {
    return (
      <Card style={styles.fallback}>
        <ThemedText type="smallBold">Almost there</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Identity verification for saving and earning is coming shortly. You
          can explore everything else in the meantime.
        </ThemedText>
        {onCancel ? <Button title="Back" variant="ghost" onPress={onCancel} /> : null}
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: target }}
        onNavigationStateChange={handleNav}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState
        // Compilot needs camera/mic for liveness + document capture.
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        style={{ backgroundColor: theme.background }}
      />
      {loading ? (
        <View style={[styles.loading, { backgroundColor: theme.background }]} pointerEvents="none">
          <ActivityIndicator color={theme.text} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: { gap: 12 },
});
