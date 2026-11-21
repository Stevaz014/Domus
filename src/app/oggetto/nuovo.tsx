import { useLocalSearchParams, useRouter } from 'expo-router';

import { ItemForm } from '../../components/ItemForm';
import { createItem } from '../../db/queries';
import { useDb } from '../../db/useInventory';

export default function NewItemScreen() {
  const db = useDb();
  const router = useRouter();
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();

  const presetLocationId =
    locationId !== undefined && locationId !== '' && !Number.isNaN(Number(locationId))
      ? Number(locationId)
      : null;

  return (
    <ItemForm
      submitLabel="Salva oggetto"
      autoFocusName
      initial={{ locationId: presetLocationId }}
      onSubmit={async (values) => {
        await createItem(db, values);
        router.back();
      }}
    />
  );
}
