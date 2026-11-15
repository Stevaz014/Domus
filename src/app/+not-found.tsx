import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagina non trovata' }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Questa pagina non esiste.</Text>
        <Link href="/" style={styles.link}>
          Torna alla casa
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: { fontSize: 16, color: colors.text },
  link: { fontSize: 16, color: colors.accent, fontWeight: '600' },
});
