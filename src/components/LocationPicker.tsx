import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Row, SectionTitle } from './ui';
import { useLiveData } from '../db/useInventory';
import { listAllLocations } from '../db/queries';
import type { Location } from '../db/types';
import { colors, radius, spacing } from '../theme';

interface Node extends Location {
  depth: number;
}

/** Appiattisce l'albero in una lista ordinata, con il livello di annidamento. */
function flatten(locations: Location[]): Node[] {
  const byParent = new Map<number | null, Location[]>();
  for (const location of locations) {
    const bucket = byParent.get(location.parent_id) ?? [];
    bucket.push(location);
    byParent.set(location.parent_id, bucket);
  }

  const out: Node[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const location of byParent.get(parentId) ?? []) {
      out.push({ ...location, depth });
      walk(location.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (locationId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: locations } = useLiveData<Location[]>((database) => listAllLocations(database), []);

  const nodes = useMemo(() => flatten(locations ?? []), [locations]);
  const current = nodes.find((node) => node.id === value);

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        testID="location-picker"
      >
        <Text style={current ? styles.triggerValue : styles.triggerPlaceholder}>
          {current ? fullName(nodes, current) : 'Scegli un luogo'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <SectionTitle>Dove sta?</SectionTitle>
            <Button label="Chiudi" variant="secondary" onPress={() => setOpen(false)} />
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <View style={styles.noneWrap}>
              <Button
                label="Senza posto"
                variant={value === null ? 'primary' : 'secondary'}
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                testID="pick-none"
              />
            </View>

            {nodes.length === 0 ? (
              <EmptyState
                title="Nessun luogo creato"
                hint="Crea prima un luogo dalla schermata Casa."
              />
            ) : (
              <View style={styles.tree}>
                {nodes.map((node) => (
                  <Row
                    key={node.id}
                    title={node.name}
                    subtitle={fullName(nodes, node)}
                    onPress={() => {
                      onChange(node.id);
                      setOpen(false);
                    }}
                    right={node.id === value ? <Text style={styles.check}>✓</Text> : undefined}
                    testID={`pick-${node.id}`}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/** Percorso leggibile tipo "Cucina › Credenza › Cassetto 1". */
export function fullName(nodes: Node[], target: Node): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [];
  let cursor: Node | undefined = target;
  while (cursor) {
    parts.unshift(cursor.name);
    cursor = cursor.parent_id === null ? undefined : byId.get(cursor.parent_id);
  }
  return parts.join(' › ');
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    minHeight: 48,
  },
  triggerValue: { flex: 1, fontSize: 16, color: colors.text },
  triggerPlaceholder: { flex: 1, fontSize: 16, color: colors.muted },
  chevron: { fontSize: 20, color: colors.muted },
  sheet: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xl },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  noneWrap: {},
  tree: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  check: { fontSize: 18, color: colors.accent, fontWeight: '700' },
});
