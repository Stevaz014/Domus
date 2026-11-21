import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '../components/ui';
import { migrateDbIfNeeded, DATABASE_NAME } from '../db/schema';
import type { DB } from '../db/types';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={(database) => migrateDbIfNeeded(database as unknown as DB)}
      >
        <StatusBar style="dark" />
        <Suspense fallback={<Loading />}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.accent,
              headerTitleStyle: { color: colors.text },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Casa' }} />
            <Stack.Screen name="search" options={{ title: 'Cerca' }} />
            <Stack.Screen name="luogo/[id]" options={{ title: 'Luogo' }} />
            <Stack.Screen name="oggetto/nuovo" options={{ title: 'Nuovo oggetto' }} />
            <Stack.Screen name="oggetto/[id]" options={{ title: 'Oggetto' }} />
          </Stack>
        </Suspense>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
