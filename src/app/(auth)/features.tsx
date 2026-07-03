import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

/**
 * Onboarding beat 2 — the feature carousel (Plasma One-style sales pitch,
 * Kasu numbers and slogans). Three slides, paged, with dots; "Continue"
 * advances and lands on login after the last slide.
 */
const SLIDES = [
  {
    sf: 'chart.line.uptrend.xyaxis' as const,
    title: 'Earn like a lender',
    body:
      'Your USDC works in Kasu’s private-credit strategies — real yield ' +
      'from real businesses, not token emissions.',
  },
  {
    sf: 'creditcard' as const,
    title: 'Spend your yield',
    body:
      'Every Thursday, the yield you’ve earned tops up your VISA card. ' +
      'Coffee, courtesy of your portfolio.',
  },
  {
    sf: 'lock.shield' as const,
    title: 'Your money, your keys',
    body:
      'A self-custodial wallet under the hood — no seed phrases, instant ' +
      'transfers, and on/off-ramps built in.',
  },
];

export default function FeaturesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const width = Dimensions.get('window').width;
  const last = page === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      haptics.select();
      setPage(next);
    }
  };

  const onContinue = () => {
    if (last) {
      router.push('/(auth)/login');
    } else {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={styles.pager}>
          {SLIDES.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <View
                style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name={slide.sf} size={44} tintColor={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={styles.slideTitle}>
                {slide.title}
              </ThemedText>
              <ThemedText
                type="default"
                themeColor="textSecondary"
                style={styles.slideBody}>
                {slide.body}
              </ThemedText>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                {
                  backgroundColor: i === page ? theme.primary : theme.backgroundSelected,
                  width: i === page ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button title={last ? 'Create your account' : 'Continue'} onPress={onContinue} />
          {!last ? (
            <Button
              title="Skip"
              variant="ghost"
              onPress={() => router.push('/(auth)/login')}
            />
          ) : (
            <Button
              title="I already have an account"
              variant="ghost"
              onPress={() => router.push('/(auth)/login')}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 12 },
  // Bleed past Screen's 20px body padding so paging aligns to window width.
  pager: { flex: 1, marginHorizontal: -20 },
  slide: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 28,
    gap: 18,
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slideTitle: { textAlign: 'left' },
  slideBody: { textAlign: 'left' },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  dot: { height: 8, borderRadius: 4 },
  actions: { gap: 12 },
});
