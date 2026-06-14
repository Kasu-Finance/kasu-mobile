import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ACCENT } from './theme-extras';

const fg = '#ffffff';
const muted = 'rgba(255,255,255,0.7)';

/** Stub card secrets — demo build is read-only, so these are fixed. */
const EXPIRY = '12/28';
const CVC = '123';

/**
 * A neobank-style VISA card visual. Pure presentation — no chain/wallet logic.
 *
 * Tap to flip front ↔ back, like a real card revealing its CVC. The flip is a
 * reanimated `rotateY` rotation: the front and back faces are absolutely
 * positioned in the same box; the back is pre-rotated 180° so it reads
 * correctly once the container rotates. We animate a shared `progress` value
 * 0→1 (mapped to 0°→180°) and toggle each face's `backfaceVisibility` via the
 * derived rotation so only the face pointing at the viewer is visible.
 *
 * The caller passes the formatted `balance` string (the card's balance is the
 * wallet's USDC balance, wired in on Home). `last4` masks the PAN; everything
 * else is fixed branding ("KASU" / "VISA").
 */
export function VisaCard({
  balance,
  last4 = '4242',
  variant = 'dark',
}: {
  balance: string;
  last4?: string;
  variant?: 'dark' | 'accent';
}) {
  const bg = variant === 'accent' ? ACCENT : '#15110b';
  const [flipped, setFlipped] = useState(false);

  // 0 = front, 1 = back. Drive both faces' rotateY off the same value.
  const progress = useSharedValue(0);
  const rotation = useDerivedValue(() => interpolate(progress.value, [0, 1], [0, 180]));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    opacity: rotation.value <= 90 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    opacity: rotation.value > 90 ? 1 : 0,
  }));

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 450 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={flipped ? 'Show card front' : 'Show card details'}
      onPress={toggle}>
      <View style={styles.wrap}>
        {/* Front face */}
        <Animated.View style={[styles.card, styles.face, { backgroundColor: bg }, frontStyle]}>
          <View style={styles.topRow}>
            <Text style={[styles.brand, { color: fg }]}>KASU</Text>
            <View style={styles.chip} />
          </View>

          <View style={styles.balanceBlock}>
            <Text style={[styles.balanceLabel, { color: muted }]}>Balance</Text>
            <Text style={[styles.balance, { color: fg }]}>{balance}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.pan, { color: muted }]}>•••• •••• •••• {last4}</Text>
            <Text style={[styles.visa, { color: fg }]}>VISA</Text>
          </View>
        </Animated.View>

        {/* Back face (absolutely positioned over the front) */}
        <Animated.View
          style={[styles.card, styles.face, styles.back, { backgroundColor: bg }, backStyle]}>
          <View style={styles.stripe} />

          <Text style={[styles.fullPan, { color: fg }]}>4242 4242 4242 {last4}</Text>

          <View style={styles.bottomRow}>
            <View>
              <Text style={[styles.backLabel, { color: muted }]}>EXP</Text>
              <Text style={[styles.backValue, { color: fg }]}>{EXPIRY}</Text>
            </View>
            <View>
              <Text style={[styles.backLabel, { color: muted }]}>CVC</Text>
              <Text style={[styles.backValue, { color: fg }]}>{CVC}</Text>
            </View>
            <Text style={[styles.visa, { color: fg }]}>VISA</Text>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 1.6,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    justifyContent: 'space-between',
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  back: {
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  balanceBlock: { gap: 2 },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    fontSize: 30,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pan: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  visa: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  // Back-of-card elements
  stripe: {
    height: 36,
    marginHorizontal: -20,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fullPan: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
