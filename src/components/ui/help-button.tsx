import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

export interface HelpItem {
  heading: string;
  body: string;
}

/**
 * A round "?" button that opens a bottom sheet of plain-language explanations —
 * so screens can stay clean (no long paragraphs inline). Pass `items`
 * ({heading, body} list) for the common case, or `children` for custom content
 * (e.g. a data table). Sits in the top-right of a screen header.
 */
export function HelpButton({
  title,
  items,
  children,
}: {
  title: string;
  items?: HelpItem[];
  children?: ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Help"
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.glyph, { color: theme.text }]}>?</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <View style={[styles.panel, { backgroundColor: theme.background }]}>
              <View style={styles.grabber} />
              <View style={styles.header}>
                <ThemedText type="subtitle" numberOfLines={1} style={styles.headerTitle}>
                  {title}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setOpen(false)}
                  style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.closeGlyph, { color: theme.text }]}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {children}
                {items?.map((item) => (
                  <View key={item.heading} style={styles.item}>
                    <ThemedText type="smallBold">{item.heading}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.body}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 20, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  safe: { width: '100%' },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: { flex: 1 },
  close: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 16, fontWeight: '600' },
  body: { flexGrow: 0 },
  bodyContent: { gap: 18, paddingVertical: 8 },
  item: { gap: 4 },
});
