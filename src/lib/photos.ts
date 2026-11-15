import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const PHOTO_DIR_NAME = 'item-photos';

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Apre la galleria e copia la foto scelta nella cartella documenti dell'app.
 * La cache del picker può essere svuotata dal sistema: senza copia l'immagine sparirebbe.
 * Restituisce l'uri permanente, oppure null se l'utente annulla.
 */
export async function pickAndPersistPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Serve il permesso di accedere alle foto per allegarle a un oggetto.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const source = new File(result.assets[0].uri);
  const extension = source.extension || '.jpg';
  const destination = new File(photoDirectory(), `item-${Date.now()}${extension}`);
  await source.copy(destination);
  return destination.uri;
}

/** Rimuove una foto allegata, ignorando gli errori (es. file già assente). */
export function deletePhoto(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Un file già rimosso non è un problema.
  }
}
