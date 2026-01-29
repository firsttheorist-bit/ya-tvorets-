// app/_layout.tsx

import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LanguageProvider } from './LanguageContext';
import { migrateStorageIfNeeded } from './storage/migrate';

function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        await migrateStorageIfNeeded();
      } catch (e) {
        console.log('BootGate migrate error', e);
      } finally {
        if (mounted) setReady(true);
      }
    };

    void boot();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Завантаження…</Text>
        <Text style={styles.loadingText}>
          Підготовка даних прогресу та налаштувань.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <BootGate>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </BootGate>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2620',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 13,
    color: '#7C7365',
    textAlign: 'center',
    lineHeight: 18,
  },
});
