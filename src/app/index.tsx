import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { NamePrompt } from '../components/NamePrompt';
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
import { useChildLocations, useDb, useItemsInLocation } from '../db/useInventory';
import { colors, spacing } from '../theme';

export default function Home() {
  const db = useDb();
  const router = useRouter();
  const { data: roots, loading, reload } = useChildLocations(null);
  const { data: orphanItems } = useItemsInLocation(null, false);
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

        {orphanItems && orphanItems.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle>Senza posto</SectionTitle>
            <Card>
              {orphanItems.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle={item.notes ?? undefined}
                  right={<Text style={styles.qty}>×{item.quantity}</Text>}
                  onPress={() => router.push(`/oggetto/${item.id}`)}
                  testID={`orphan-item-${item.id}`}
                />
              ))}
            </Card>
          </View>
        ) : null}

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
  qty: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '600',
  },
  footer: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
