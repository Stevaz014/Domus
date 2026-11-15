import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  EmptyState,
  Fab,
  Loading,
  Row,
  ScreenScroll,
  SectionTitle,
} from '../components/ui';
import { createLocation } from '../db/queries';
import { useChildLocations, useDb } from '../db/useInventory';
import { colors, radius, spacing } from '../theme';

export default function Home() {
  const db = useDb();
  const router = useRouter();
  const { data: roots, loading, reload } = useChildLocations(null);
  const [creating, setCreating] = useState(false);

  const addRootLocation = async (name: string) => {
    await createLocation(db, name, null);
    setCreating(false);
    reload();
  };

  return (
    <View style={styles.wrap}>
      <ScreenScroll>
        <Card>
          <Row
            title="Cerca un oggetto"
            subtitle="Per nome, note o luogo"
            onPress={() => router.push('/search')}
            testID="home-search"
          />
        </Card>

        <View style={styles.section}>
          <SectionTitle>Luoghi</SectionTitle>
          <Card>
            {loading ? (
              <Loading />
            ) : roots && roots.length > 0 ? (
              roots.map((location) => (
                <Row
                  key={location.id}
                  title={location.name}
                  subtitle={summarize(location.item_count, location.child_count)}
                  onPress={() => router.push(`/luogo/${location.id}`)}
                  testID={`location-${location.id}`}
                />
              ))
            ) : (
              <EmptyState
                title="Nessun luogo ancora"
                hint="Crea il primo posto della casa, ad esempio «Cucina»."
              />
            )}
          </Card>
        </View>

        <View style={styles.actions}>
          <Button
            label="Aggiungi un luogo"
            variant="secondary"
            onPress={() => setCreating(true)}
            testID="add-location"
          />
          <Button
            label="Aggiungi un oggetto"
            onPress={() => router.push('/oggetto/nuovo')}
            testID="add-item"
          />
        </View>

        <Text style={styles.footer}>
          Suggerimento: dentro un luogo puoi crearne altri (Cucina ▸ Credenza ▸ Cassetto 1).
        </Text>
      </ScreenScroll>

      <Fab label="+ Oggetto" onPress={() => router.push('/oggetto/nuovo')} />

      {creating ? (
        <NamePrompt
          visible
          title="Nuovo luogo"
          placeholder="Es. Cucina"
          onCancel={() => setCreating(false)}
          onSubmit={addRootLocation}
        />
      ) : null}
    </View>
  );
}

export function NamePrompt({
  visible,
  title,
  placeholder,
  initialValue = '',
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome mancante', 'Scrivi un nome prima di salvare.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setName('');
    } catch (error) {
      Alert.alert('Errore', error instanceof Error ? error.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            autoFocus
            testID="name-input"
          />
          <View style={styles.dialogActions}>
            <View style={styles.dialogAction}>
              <Button label="Annulla" variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.dialogAction}>
              <Button
                label={busy ? 'Salvo…' : 'Salva'}
                onPress={submit}
                disabled={busy}
                testID="name-save"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function summarize(items: number, children: number): string {
  const parts: string[] = [];
  if (children > 0) parts.push(children === 1 ? '1 sotto-luogo' : `${children} sotto-luoghi`);
  if (items > 0) parts.push(items === 1 ? '1 oggetto' : `${items} oggetti`);
  return parts.length > 0 ? parts.join(' · ') : 'vuoto';
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  section: { gap: spacing.sm },
  actions: { gap: spacing.md },
  footer: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dialogAction: { flex: 1 },
});
