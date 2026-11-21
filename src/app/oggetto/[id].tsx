import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemForm } from '../../components/ItemForm';
import { EmptyState, Loading, ScreenScroll } from '../../components/ui';
import { deleteItem, updateItem } from '../../db/queries';
import { useDb, useItem } from '../../db/useInventory';
import { deletePhoto } from '../../lib/photos';
import { colors, spacing } from '../../theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: item, loading } = useItem(itemId);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Loading />
      </View>
    );
  }

  if (!item) {
    return (
      <ScreenScroll>
        <EmptyState title="Oggetto non trovato" hint="Potrebbe essere stato eliminato." />
      </ScreenScroll>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Eliminare l’oggetto?', `${item.name} verrà rimosso dall’inventario.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(db, itemId);
          deletePhoto(item.photo_uri);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ItemForm
        submitLabel="Salva modifiche"
        initial={{
          name: item.name,
          quantity: item.quantity,
          notes: item.notes ?? '',
          photoUri: item.photo_uri,
          locationId: item.location_id,
        }}
        onSubmit={async (values) => {
          if (item.photo_uri && item.photo_uri !== values.photoUri) {
            deletePhoto(item.photo_uri);
          }
          await updateItem(db, itemId, values);
          router.back();
        }}
        onDelete={confirmDelete}
      />
      {item.location_name ? (
        <Text style={[styles.hint, { paddingBottom: spacing.lg + insets.bottom }]}>
          Attualmente in: {item.location_name}
        </Text>
      ) : (
        <Text style={[styles.hint, { paddingBottom: spacing.lg + insets.bottom }]}>
          Senza posto
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  hint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
  },
});
