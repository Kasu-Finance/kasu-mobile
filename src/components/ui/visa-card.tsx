import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { KasuMark } from './kasu-mark';

const bonsai = require('../../../assets/brand/bonsai.png');

/** Stub card secrets — demo build is read-only, so these are fixed. */
const EXPIRY = '12/28';
const CVC = '123';

/**
 * The Kasu brand VISA card. Pure presentation — no chain/wallet logic.
 *
 * Front: the Kasu mark + wordmark on brand-dark, brass detailing. Tap to flip
 * to the back, which is a full-bleed **gold bonsai** dimmed under a dark scrim
 * so the PAN / EXP / CVC stay legible. The flip is a reanimated `rotateY`: both
 * faces are absolutely positioned in the same box; the back is pre-rotated 180°
 * so it reads correctly once the container rotates.
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
  const theme = useTheme();
  const accented = variant === 'accent';
  const bg = accented ? theme.primary : theme.background;
  const fg = accented ? theme.onAccent : '#ffffff';
  const muted = accented ? 'rgba(36,26,12,0.7)' : 'rgba(255,255,255,0.7)';
  const markColor = accented ? theme.onAccent : theme.primary;
  const border = accented ? 'transparent' : 'rgba(210,158,97,0.35)';

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
        <Animated.View
          style={[styles.card, styles.face, { backgroundColor: bg, borderColor: border }, frontStyle]}>
          <View style={styles.topRow}>
            <View style={styles.lockup}>
              <KasuMark size={22} color={markColor} />
              <Text style={[styles.brand, { color: fg }]}>Kasu</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: accented ? 'rgba(36,26,12,0.3)' : theme.primary }]} />
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

        {/* Back face — full-bleed gold bonsai under a dark scrim */}
        <Animated.View
          style={[
            styles.card,
            styles.face,
            styles.back,
            { backgroundColor: theme.background, borderColor: border },
            backStyle,
          ]}>
          <Image source={bonsai} style={styles.bonsai} contentFit="cover" contentPosition="top" />
          <View style={styles.scrim} />
          <View style={styles.scrimBottom} />

          <View style={styles.backInner}>
            <View style={styles.stripe} />
            <Text style={[styles.fullPan, { color: '#ffffff' }]}>4242 4242 4242 {last4}</Text>
            <View style={styles.bottomRow}>
              <View>
                <Text style={[styles.backLabel, { color: 'rgba(255,255,255,0.7)' }]}>EXP</Text>
                <Text style={[styles.backValue, { color: '#ffffff' }]}>{EXPIRY}</Text>
              </View>
              <View>
                <Text style={[styles.backLabel, { color: 'rgba(255,255,255,0.7)' }]}>CVC</Text>
                <Text style={[styles.backValue, { color: '#ffffff' }]}>{CVC}</Text>
              </View>
              <Text style={[styles.visa, { color: '#ffffff' }]}>VISA</Text>
            </View>
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    padding: 20,
    justifyContent: 'space-between',
  },
  back: {
    padding: 0,
  },
  // Front
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontFamily: Fonts.serifBold,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    opacity: 0.9,
  },
  balanceBlock: { gap: 2 },
  balanceLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    fontFamily: Fonts.sansBold,
    fontSize: 30,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pan: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    letterSpacing: 1.5,
  },
  visa: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  // Back
  bonsai: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,17,11,0.45)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  stripe: {
    height: 36,
    marginHorizontal: -20,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fullPan: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    letterSpacing: 2,
  },
  backLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backValue: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    letterSpacing: 1,
  },
});
