// app/(tabs)/profile.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppLanguage } from '../LanguageContext';
import type { AppGender, AppLanguage, MentorId } from '../mentorPhrases';
import { STORAGE_KEYS } from '../storage/storageKeys';

const MENTOR_LABELS: Record<
  MentorId,
  { uaName: string; enName: string; uaDesc: string; enDesc: string }
> = {
  lev: {
    uaName: 'Лев',
    enName: 'Lev',
    uaDesc: 'Спокійна системність, фокус на маленьких кроках і стратегії.',
    enDesc: 'Calm systems, focus on small steps and strategy.',
  },
  lana: {
    uaName: 'Лана',
    enName: 'Lana',
    uaDesc: 'Мʼяка підтримка, емпатія та турбота до себе без самобичування.',
    enDesc: 'Soft support, empathy and self-care without self-blame.',
  },
  bro: {
    uaName: 'Bro',
    enName: 'Bro',
    uaDesc: 'Прямо, по-дружньому, без пафосу. Мінімум теорії, максимум дії.',
    enDesc: 'Direct, friendly, no fluff. Less theory, more action.',
  },
  katana: {
    uaName: 'Катана',
    enName: 'Katana',
    uaDesc: 'Точність, структура, «обрізання» зайвого та фокус на головному.',
    enDesc: 'Precision, structure, cutting the noise and focus on what matters.',
  },
};

function getMentorDisplayName(mentor: MentorId, lang: AppLanguage): string {
  const pack = MENTOR_LABELS[mentor];
  return lang === 'ua' ? pack.uaName : pack.enName;
}

function isMentorId(v: unknown): v is MentorId {
  return v === 'lev' || v === 'lana' || v === 'bro' || v === 'katana';
}

function isAppGender(v: unknown): v is AppGender {
  return v === 'male' || v === 'female' || v === 'neutral';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { language, setLanguage, loading: langLoading } = useAppLanguage();
  const lang = language as AppLanguage;

  const [userName, setUserName] = useState('');
  const [mentor, setMentor] = useState<MentorId>('lev');
  const [gender, setGender] = useState<AppGender>('neutral');

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedName, storedMentor, storedGender] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.name),
          AsyncStorage.getItem(STORAGE_KEYS.mentor),
          AsyncStorage.getItem(STORAGE_KEYS.gender),
        ]);

        if (typeof storedName === 'string') setUserName(storedName);

        if (isMentorId(storedMentor)) setMentor(storedMentor);

        // поддержка старого значения "none" -> "neutral"
        if (storedGender === 'none') {
          setGender('neutral');
        } else if (isAppGender(storedGender)) {
          setGender(storedGender);
        }
      } catch (e) {
        console.log('Error loading profile data', e);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSaveName = async () => {
    try {
      setSavingName(true);
      const trimmed = userName.trim();
      await AsyncStorage.setItem(STORAGE_KEYS.name, trimmed);

      Alert.alert(
        lang === 'ua' ? 'Збережено' : 'Saved',
        lang === 'ua' ? 'Імʼя успішно оновлено.' : 'Name has been updated.'
      );
    } catch (e) {
      console.log('Error saving name', e);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangeLanguage = (newLang: AppLanguage) => {
    try {
      setLanguage(newLang);
    } catch (e) {
      console.log('Error changing language', e);
    }
  };

  const handleChangeMentor = async (id: MentorId) => {
    try {
      setMentor(id);
      await AsyncStorage.setItem(STORAGE_KEYS.mentor, id);
    } catch (e) {
      console.log('Error saving mentor', e);
    }
  };

  const handleChangeGender = async (value: AppGender) => {
    try {
      setGender(value);
      await AsyncStorage.setItem(STORAGE_KEYS.gender, value);
    } catch (e) {
      console.log('Error saving gender', e);
    }
  };

  if (loading || langLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {lang === 'ua' ? 'Завантаження профілю...' : 'Loading profile...'}
        </Text>
      </View>
    );
  }

  const displayMentorName = getMentorDisplayName(mentor, lang);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{lang === 'ua' ? 'Профіль' : 'Profile'}</Text>
      <Text style={styles.subtitle}>
        {lang === 'ua'
          ? 'Тут можна налаштувати, як наставник буде до тебе звертатися й як виглядатимуть щоденні кроки.'
          : 'Here you can tune how the mentor talks to you and how your daily steps look.'}
      </Text>

      {/* Имя */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Імʼя' : 'Name'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Це імʼя бачиш тільки ти. Наставник буде використовувати його в зверненнях.'
            : 'Only you see this name. The mentor will use it when speaking to you.'}
        </Text>

        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder={lang === 'ua' ? 'Введи своє імʼя' : 'Enter your name'}
          placeholderTextColor="#B0A493"
          style={styles.input}
        />

        <Pressable
          onPress={() => void handleSaveName()}
          disabled={savingName}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.9 },
            savingName && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savingName ? (lang === 'ua' ? 'Збереження...' : 'Saving...') : lang === 'ua' ? 'Зберегти імʼя' : 'Save name'}
          </Text>
        </Pressable>
      </View>

      {/* Гендер */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Звернення' : 'How mentor addresses you'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Це потрібно, щоб наставник міг коректно звертатися до тебе (чоловіче / жіноче / нейтральне).'
            : 'This is used so the mentor can address you correctly (male / female / neutral).'}
        </Text>

        <View style={styles.genderRow}>
          <Pressable
            onPress={() => void handleChangeGender('neutral')}
            style={[styles.genderChip, gender === 'neutral' && styles.genderChipActive]}
          >
            <Text style={[styles.genderChipText, gender === 'neutral' && styles.genderChipTextActive]}>
              {lang === 'ua' ? 'Без уточнення' : 'No preference'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleChangeGender('male')}
            style={[styles.genderChip, gender === 'male' && styles.genderChipActive]}
          >
            <Text style={[styles.genderChipText, gender === 'male' && styles.genderChipTextActive]}>
              {lang === 'ua' ? 'Чоловіче' : 'Male'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleChangeGender('female')}
            style={[styles.genderChip, gender === 'female' && styles.genderChipActive]}
          >
            <Text style={[styles.genderChipText, gender === 'female' && styles.genderChipTextActive]}>
              {lang === 'ua' ? 'Жіноче' : 'Female'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Язык */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Мова застосунку' : 'App language'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Можеш перемикати українську / англійську. Це впливає на інтерфейс і фрази наставників.'
            : 'You can switch between Ukrainian and English. This affects the UI and mentor phrases.'}
        </Text>

        <View style={styles.languageRow}>
          <Pressable
            onPress={() => handleChangeLanguage('ua')}
            style={[styles.languageChip, lang === 'ua' && styles.languageChipActive]}
          >
            <Text style={[styles.languageChipText, lang === 'ua' && styles.languageChipTextActive]}>Українська</Text>
          </Pressable>

          <Pressable
            onPress={() => handleChangeLanguage('en')}
            style={[styles.languageChip, lang === 'en' && styles.languageChipActive]}
          >
            <Text style={[styles.languageChipText, lang === 'en' && styles.languageChipTextActive]}>English</Text>
          </Pressable>
        </View>
      </View>

      {/* Наставник */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Наставник' : 'Mentor'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Обери голос, який тобі ближче зараз. Це впливає на тон усіх фраз у застосунку.'
            : 'Choose the voice that feels closest to you now. This affects the tone of phrases across the app.'}
        </Text>

        <View style={styles.mentorGrid}>
          {(Object.keys(MENTOR_LABELS) as MentorId[]).map((id) => {
            const pack = MENTOR_LABELS[id];
            const isActive = mentor === id;

            return (
              <Pressable
                key={id}
                onPress={() => void handleChangeMentor(id)}
                style={[styles.mentorCard, isActive && styles.mentorCardActive]}
              >
                <Text style={styles.mentorName}>{lang === 'ua' ? pack.uaName : pack.enName}</Text>
                <Text style={styles.mentorDesc}>{lang === 'ua' ? pack.uaDesc : pack.enDesc}</Text>
                {isActive ? (
                  <Text style={styles.mentorBadge}>{lang === 'ua' ? 'Обраний наставник' : 'Selected mentor'}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Небольшая строка для уверенности, что состояние актуально */}
        <Text style={[styles.mutedText, { marginTop: 8 }]}>
          {lang === 'ua' ? 'Зараз обрано: ' : 'Current: '}
          {displayMentorName}
        </Text>
      </View>

      {/* Traits test */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Тест рис' : 'Traits test'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Можеш пройти розширений тест, щоб краще налаштувати зони росту та сильні сторони. Це вплине на екран “Сьогодні” та челенджі.'
            : 'You can take an extended test to better tune your strengths and growth zones. It will affect “Today” and challenges.'}
        </Text>

        <Pressable
          onPress={() => router.push('/traits-test')}
          style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryButtonText}>
            {lang === 'ua' ? 'Пройти розширений тест рис' : 'Take extended traits test'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F0E8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },

  loadingContainer: { flex: 1, backgroundColor: '#F3F0E8', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#7C7365' },

  title: { fontSize: 24, fontWeight: '700', color: '#2B2620', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#857A6A', marginBottom: 16 },

  card: {
    backgroundColor: '#FFFEFA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#2B2620', marginBottom: 6 },
  mutedText: { fontSize: 12, color: '#9B8F7C', marginBottom: 8 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2B2620',
    backgroundColor: '#FFFEFA',
    marginBottom: 8,
  },

  primaryButton: {
    marginTop: 4,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2B2620',
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 14, color: '#FFF7E8', fontWeight: '600' },

  languageRow: { flexDirection: 'row', marginTop: 4, gap: 8, flexWrap: 'wrap' },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F2E7',
  },
  languageChipActive: { backgroundColor: '#2B2620', borderColor: '#2B2620' },
  languageChipText: { fontSize: 13, color: '#6C6255', fontWeight: '500' },
  languageChipTextActive: { color: '#FFF7E8', fontWeight: '600' },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F7F2E7',
  },
  genderChipActive: { backgroundColor: '#2B2620', borderColor: '#2B2620' },
  genderChipText: { fontSize: 12, color: '#6C6255' },
  genderChipTextActive: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  mentorGrid: { marginTop: 8, gap: 8 },
  mentorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    backgroundColor: '#FFFDF4',
    padding: 10,
  },
  mentorCardActive: { borderColor: '#C9A14A', backgroundColor: '#F8F2DE' },
  mentorName: { fontSize: 14, fontWeight: '600', color: '#2B2620', marginBottom: 4 },
  mentorDesc: { fontSize: 12, color: '#4E4537', marginBottom: 4 },
  mentorBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#5D4A23',
    backgroundColor: '#E8D29F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
