import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, ScreenScroll, SectionTitle } from './ui';
import { LocationPicker } from './LocationPicker';
import { deletePhoto, pickAndPersistPhoto } from '../lib/photos';
import { colors, radius, spacing } from '../theme';

export interface ItemFormValues {
  name: string;
  quantity: number;
  notes: string;
  photoUri: string | null;
  locationId: number | null;
}

export function ItemForm({
  initial,
  submitLabel,
  autoFocusName = false,
  onSubmit,
  onDelete,
}: {
  initial?: Partial<ItemFormValues>;
  submitLabel: string;
  autoFocusName?: boolean;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [locationId, setLocationId] = useState<number | null>(initial?.locationId ?? null);
  const [busy, setBusy] = useState(false);

  // Foto scelta in questa sessione e non ancora salvata: non tocca initial.photoUri
  // finché l'utente non conferma il salvataggio.
  const tempPhotoRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!submittedRef.current && tempPhotoRef.current) {
        deletePhoto(tempPhotoRef.current);
      }
    };
  }, []);

  const addPhoto = async () => {
    try {
      const uri = await pickAndPersistPhoto();
      if (uri) {
        if (tempPhotoRef.current && tempPhotoRef.current !== uri) {
          deletePhoto(tempPhotoRef.current);
        }
        tempPhotoRef.current = uri;
        setPhotoUri(uri);
      }
    } catch (error) {
      Alert.alert('Foto', error instanceof Error ? error.message : 'Selezione non riuscita.');
    }
  };

  const removePhoto = () => {
    if (tempPhotoRef.current && photoUri === tempPhotoRef.current) {
      deletePhoto(tempPhotoRef.current);
      tempPhotoRef.current = null;
    }
    setPhotoUri(null);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome mancante', 'Come si chiama questo oggetto?');
      return;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 1) {
      Alert.alert('Quantità non valida', 'La quantità deve essere un numero maggiore di zero.');
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        name: trimmed,
        quantity: parsedQuantity,
        notes: notes.trim(),
        photoUri,
        locationId,
      });
      submittedRef.current = true;
    } catch (error) {
      Alert.alert('Errore', error instanceof Error ? error.message : 'Salvataggio non riuscito.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenScroll>
        <View style={styles.field}>
          <SectionTitle>Nome</SectionTitle>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Es. Forbici"
            placeholderTextColor={colors.muted}
            autoFocus={autoFocusName}
            testID="item-name"
          />
        </View>

      <View style={styles.field}>
        <SectionTitle>Quantità</SectionTitle>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={colors.muted}
          testID="item-quantity"
        />
      </View>

      <View style={styles.field}>
        <SectionTitle>Dove sta</SectionTitle>
        <LocationPicker value={locationId} onChange={setLocationId} />
      </View>

      <View style={styles.field}>
        <SectionTitle>Note</SectionTitle>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Es. nel primo cassetto, sotto i tovaglioli"
          placeholderTextColor={colors.muted}
          multiline
          testID="item-notes"
        />
      </View>

      <View style={styles.field}>
        <SectionTitle>Foto</SectionTitle>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <View style={styles.photoActions}>
              <Button label="Cambia" variant="secondary" onPress={addPhoto} />
              <Button label="Rimuovi" variant="secondary" onPress={removePhoto} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.photoEmpty} onPress={addPhoto} testID="add-photo">
            <Text style={styles.photoEmptyLabel}>Aggiungi una foto</Text>
          </Pressable>
        )}
      </View>

      <Button
        label={busy ? 'Salvo…' : submitLabel}
        onPress={submit}
        disabled={busy}
        testID="item-submit"
      />

        {onDelete ? (
          <Button label="Elimina oggetto" variant="danger" onPress={onDelete} testID="item-delete" />
        ) : null}
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.sm },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  photoWrap: { gap: spacing.md },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  photoActions: { flexDirection: 'row', gap: spacing.md },
  photoEmpty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  photoEmptyLabel: { fontSize: 15, color: colors.accent, fontWeight: '600' },
});
