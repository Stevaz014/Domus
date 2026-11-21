import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { NamePrompt } from '../../components/NamePrompt';
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Loading,
  Row,
  ScreenScroll,
  SectionTitle,
} from '../../components/ui';
import { createLocation, deleteLocation, renameLocation } from '../../db/queries';
import {
  useChildLocations,
  useDb,
  useItemsInLocation,
  useLocationPath,
} from '../../db/useInventory';
import { colors, spacing } from '../../theme';

export default function LocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const locationId = Number(id);
  const db = useDb();
  const router = useRouter();

  const { data: path, reload: reloadPath } = useLocationPath(locationId);
  const { data: children, loading: loadingChildren, reload: reloadChildren } =
    useChildLocations(locationId);
  const { data: items, loading: loadingItems, reload: reloadItems } =
    useItemsInLocation(locationId, false);

  const [addingChild, setAddingChild] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const location = path?.[path.length - 1] ?? null;
  const breadcrumb = path?.map((entry) => entry.name).join(' › ') ?? '';

  const reloadAll = () => {
    reloadPath();
    reloadChildren();
    reloadItems();
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminare il luogo?',
      'Verranno eliminati anche i sotto-luoghi. Gli oggetti non si perdono: restano salvati senza posto.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await deleteLocation(db, locationId);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: location?.name ?? 'Luogo' }} />

      <ScreenScroll>
        {breadcrumb ? <Text style={styles.breadcrumb}>{breadcrumb}</Text> : null}

        <View style={styles.section}>
          <SectionTitle>Sotto-luoghi</SectionTitle>
          <Card>
            {loadingChildren ? (
              <Loading />
            ) : children && children.length > 0 ? (
              children.map((child) => (
                <Row
                  key={child.id}
                  title={child.name}
                  subtitle={describe(child.item_count, child.child_count)}
                  onPress={() => router.push(`/luogo/${child.id}`)}
                  testID={`location-${child.id}`}
                />
              ))
            ) : (
              <EmptyState title="Nessun sotto-luogo" hint="Puoi aggiungerne uno qui sotto." />
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>Oggetti qui</SectionTitle>
          <Card>
            {loadingItems ? (
              <Loading />
            ) : items && items.length > 0 ? (
              items.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle={item.notes ?? undefined}
                  onPress={() => router.push(`/oggetto/${item.id}`)}
                  right={<Text style={styles.qty}>×{item.quantity}</Text>}
                  testID={`item-${item.id}`}
                />
              ))
            ) : (
              <EmptyState
                title="Nessun oggetto in questo luogo"
                hint="Usa «Aggiungi qui» per registrare qualcosa che sta in questo posto."
              />
            )}
          </Card>
        </View>

        <View style={styles.actions}>
          <Button
            label="Aggiungi un sotto-luogo"
            variant="secondary"
            onPress={() => setAddingChild(true)}
            testID="add-sublocation"
          />
          <Button
            label="Aggiungi un oggetto qui"
            onPress={() =>
              router.push({ pathname: '/oggetto/nuovo', params: { locationId: String(locationId) } })
            }
            testID="add-item-here"
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Rinomina luogo"
            variant="secondary"
            onPress={() => setRenaming(true)}
            testID="rename-location"
          />
          <Button label="Elimina luogo" variant="danger" onPress={confirmDelete} />
        </View>
      </ScreenScroll>

      <Fab
        label="+ Qui"
        onPress={() =>
          router.push({ pathname: '/oggetto/nuovo', params: { locationId: String(locationId) } })
        }
      />

      {addingChild ? (
        <NamePrompt
          visible
          title="Nuovo sotto-luogo"
          placeholder="Es. Cassetto 1"
          onCancel={() => setAddingChild(false)}
          onSubmit={async (name) => {
            await createLocation(db, name, locationId);
            setAddingChild(false);
            reloadAll();
          }}
        />
      ) : null}

      {renaming && location ? (
        <NamePrompt
          visible
          title="Rinomina luogo"
          placeholder="Nome del luogo"
          initialValue={location.name}
          onCancel={() => setRenaming(false)}
          onSubmit={async (name) => {
            await renameLocation(db, locationId, name);
            setRenaming(false);
            reloadAll();
          }}
        />
      ) : null}
    </View>
  );
}

function describe(items: number, children: number): string {
  const parts: string[] = [];
  if (children > 0) parts.push(children === 1 ? '1 sotto-luogo' : `${children} sotto-luoghi`);
  if (items > 0) parts.push(items === 1 ? '1 oggetto' : `${items} oggetti`);
  return parts.length > 0 ? parts.join(' · ') : 'vuoto';
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  breadcrumb: {
    fontSize: 13,
    color: colors.muted,
    paddingHorizontal: spacing.xs,
  },
  section: { gap: spacing.sm },
  actions: { gap: spacing.md },
  qty: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '600',
  },
});
