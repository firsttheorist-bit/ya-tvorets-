import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type AppLanguage = 'ua' | 'en';

const STORAGE_ONBOARDED = '@ya_tvorets_onboarded';
const STORAGE_LANG = '@ya_tvorets_lang';
const STORAGE_NAME = '@ya_tvorets_name';

export default function OnboardingScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);

  const [language, setLanguage] = useState<AppLanguage>('ua');
  const [name, setName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [flag, storedLang, storedName] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ONBOARDED),
          AsyncStorage.getItem(STORAGE_LANG),
          AsyncStorage.getItem(STORAGE_NAME),
        ]);

        if (storedLang === 'ua' || storedLang === 'en') {
          setLanguage(storedLang);
        }

        if (storedName) {
          setName(storedName);
        }

        if (flag === '1') {
          setAlreadyOnboarded(true);
        }
      } catch (e) {
        console.log('Error loading onboarding state', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  if (alreadyOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  const t = {
    title: language === 'ua' ? 'Я = Творець' : 'I = Creator',
    subtitle:
      language === 'ua'
        ? 'Кожного дня ти трохи перебудовуєш себе зсередини. Тут ми робимо це усвідомлено й мʼяко.'
        : 'Every day you rebuild yourself from the inside. Here we do it consciously and gently.',
    nameLabel: language === 'ua' ? "Як до тебе звертатися?" : "How should I call you?",
    namePlaceholder: language === 'ua' ? 'Імʼя або нікнейм' : 'Name or nickname',
    start: language === 'ua' ? 'Почати' : 'Start',
    langUa: 'Українська',
    langEn: 'English',
    langCaption:
      language === 'ua'
        ? 'Мову можна змінити пізніше у профілі.'
        : 'You can change the language later in Profile.',
  };

  const handleStart = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_LANG, language);
      if (name.trim().length > 0) {
        await AsyncStorage.setItem(STORAGE_NAME, name.trim());
      }
      await AsyncStorage.setItem(STORAGE_ONBOARDED, '1');
    } catch (e) {
      console.log('Error saving onboarding data', e);
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.appTitle}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{t.nameLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.namePlaceholder}
            placeholderTextColor="#B0A38F"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {language === 'ua' ? 'Мова інтерфейсу' : 'Interface language'}
          </Text>
          <View style={styles.langRow}>
            <Pressable
              onPress={() => setLanguage('ua')}
              style={[
                styles.langButton,
                language === 'ua' && styles.langButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.langButtonText,
                  language === 'ua' && styles.langButtonTextActive,
                ]}
              >
                {t.langUa}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('en')}
              style={[
                styles.langButton,
                language === 'en' && styles.langButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.langButtonText,
                  language === 'en' && styles.langButtonTextActive,
                ]}
              >
                {t.langEn}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.langCaption}>{t.langCaption}</Text>
        </View>

        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.startButtonText}>{t.start}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#7C7365',
  },
  card: {
    backgroundColor: '#FFFEFA',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1D6C5',
    width: '100%',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2B2620',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#857A6A',
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#4E4537',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F2E7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    fontSize: 14,
    color: '#2B2620',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F2E7',
  },
  langButtonActive: {
    backgroundColor: '#2B2620',
    borderColor: '#2B2620',
  },
  langButtonText: {
    fontSize: 13,
    color: '#6C6255',
    fontWeight: '500',
  },
  langButtonTextActive: {
    color: '#FFF7E8',
  },
  langCaption: {
    marginTop: 6,
    fontSize: 11,
    color: '#9B8F7C',
  },
  startButton: {
    marginTop: 8,
    backgroundColor: '#C9A14A',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2620',
  },
});
