import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type PropsWithChildren, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Liquid glass (iOS 26+) for the sheet panel; solid surface elsewhere. */
const GLASS = isLiquidGlassAvailable();

/** How far below the screen the panel starts before sliding up (px). */
const SHEET_TRAVEL = 800;

/**
 * A bottom-sheet style `Modal` shell: dimmed backdrop, a rounded panel pinned to
 * the bottom, a title + circular X close button. Shared by the Add money /
 * Withdraw / Send sheets so they stay visually consistent.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  const theme = useTheme();

  // Backdrop appears instantly; only the PANEL slides up. Reanimated layout
  // animations (`entering`) don't fire inside a RN Modal, so animate translateY
  // explicitly (this is the same approach the VisaCard flip uses).
  const translateY = useSharedValue(SHEET_TRAVEL);
  useEffect(() => {
    translateY.value = visible
      ? withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
      : SHEET_TRAVEL;
  }, [visible, translateY]);
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityRole="button" />
        <SafeAreaView edges={['bottom']} style={styles.safe}>
          <Animated.View
            style={[
              styles.panel,
              GLASS ? null : { backgroundColor: theme.background },
              panelStyle,
            ]}>
            {GLASS && (
              <GlassView
                style={styles.glassFill}
                glassEffectStyle="regular"
                tintColor="rgba(31,31,36,0.45)"
              />
            )}
            <View style={styles.grabber} />
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.title}>
                {title}
              </ThemedText>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.closeGlyph, { color: theme.text }]}>✕</Text>
              </Pressable>
            </View>
            {children}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** A disabled / read-only labelled value row (e.g. IBAN, BIC). */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        editable={false}
        selectTextOnFocus={false}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  backdropFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  safe: { width: '100%' },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
    overflow: 'hidden',
  },
  glassFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, lineHeight: 30 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 16, fontWeight: '600' },
  field: { gap: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
