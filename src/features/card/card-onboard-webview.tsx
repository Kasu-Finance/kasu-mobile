import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

/**
 * Substrings that, when they appear in the WebView URL, signal the hosted
 * Gnosis Pay onboarding flow has finished / handed back to us.
 *
 * TODO(gnosis-pay): the exact return/redirect URL of the hosted onboarding flow
 * is UNCONFIRMED. We match loosely on common completion markers + our deep-link
 * scheme; tighten `SUCCESS_MARKERS` once Gnosis Pay's redirect URL is known.
 */
const SUCCESS_MARKERS = [
  'success',
  'complete',
  'completed',
  'return',
  'callback',
  'kasumobile://',
];

function urlSignalsCompletion(url: string): boolean {
  const lower = url.toLowerCase();
  return SUCCESS_MARKERS.some((m) => lower.includes(m));
}

export interface CardOnboardWebViewProps {
  /** Hosted Gnosis Pay onboarding URL minted by `POST /mobile/card/onboard`. */
  url: string;
  /**
   * Fires once when the hosted flow reaches a completion URL. A URL match means
   * "the flow handed back", not "the card is active" — the caller must refetch
   * the authoritative status afterwards.
   */
  onComplete: () => void;
  /** Optional user-initiated cancel / back-out. */
  onCancel?: () => void;
}

/**
 * Wraps `react-native-webview` to host the Gnosis Pay card onboarding flow.
 * Used by the `/card` route as an in-app alternative to `expo-web-browser`.
 */
export function CardOnboardWebView({ url, onComplete, onCancel }: CardOnboardWebViewProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  // Guard so a multi-redirect completion only fires `onComplete` once.
  const completedRef = useRef(false);

  const target = url.trim();

  const handleNav = (nav: WebViewNavigation) => {
    if (completedRef.current) return;
    if (nav.url && urlSignalsCompletion(nav.url)) {
      completedRef.current = true;
      onComplete();
    }
  };

  if (!target) {
    return (
      <Card style={styles.fallback}>
        <ThemedText type="smallBold">Onboarding unavailable</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          No onboarding link was provided. Go back and try setting up the card
          again.
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
        // Gnosis Pay onboarding may need camera for document/liveness capture.
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
