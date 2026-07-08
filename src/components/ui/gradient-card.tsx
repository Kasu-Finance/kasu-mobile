import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/** Global counter → unique gradient ids (react-native-svg ids are global). */
let gradSeq = 0;

/**
 * A rounded card with a diagonal gradient fill, rendered via the already-linked
 * `react-native-svg` (no `expo-linear-gradient`, so no native rebuild). Used for
 * the Earn hero panels to give them a premium, consistent look. Content sits
 * above the gradient; `overflow: hidden` clips it to the rounded corners.
 */
export function GradientCard({
  children,
  from,
  to,
  border,
  style,
  contentStyle,
}: PropsWithChildren<{
  from: string;
  to: string;
  border?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}>) {
  // Lazy state → a stable unique gradient id per instance, computed once.
  const [id] = useState(() => `kgrad${gradSeq++}`);

  return (
    <View style={[styles.card, border ? { borderWidth: 1, borderColor: border } : null, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
});
