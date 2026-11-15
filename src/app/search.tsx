import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, EmptyState, Loading, Row, ScreenScroll, SectionTitle } from '../components/ui';
import { searchItems } from '../db/queries';
import { useDb } from '../db/useInventory';
import type { ItemWithLocation } from '../db/types';
import { colors, radius, spacing } from '../theme';

export default function SearchScreen() {
  const db = useDb();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemWithLocation[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      const resetTimer = setTimeout(() => setSearching(false), 0);
      return () => clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchItems(db, term)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch((error) => console.error('Ricerca non riuscita', error))
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, query]);

  const term = query.trim();

  return (
    <ScreenScroll>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Es. forbici, detersivi, lenzuola…"
        placeholderTextColor={colors.muted}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        testID="search-input"
      />

      {searching ? <Loading /> : null}

      {!searching && term.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>
            {results.length === 1 ? '1 risultato' : `${results.length} risultati`}
          </SectionTitle>
          <Card>
            {results.length > 0 ? (
              results.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle={item.location_name ? `In: ${item.location_name}` : 'Senza posto'}
                  right={<Text style={styles.qty}>×{item.quantity}</Text>}
                  onPress={() => router.push(`/oggetto/${item.id}`)}
                  testID={`result-${item.id}`}
                />
              ))
            ) : (
              <EmptyState
                title="Nessun oggetto trovato"
                hint="Prova con un'altra parola, oppure aggiungi l'oggetto."
              />
            )}
          </Card>
        </View>
      ) : null}

      {!searching && term.length === 0 ? (
        <EmptyState
          title="Cerca tra le cose di casa"
          hint="Puoi cercare per nome dell'oggetto, per note o per nome del luogo."
        />
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
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
  qty: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '600',
  },
});
