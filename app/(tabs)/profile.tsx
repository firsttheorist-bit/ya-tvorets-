// app/(tabs)/profile.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppLanguage } from '../LanguageContext';
import type { AppGender, AppLanguage, MentorId } from '../mentorPhrases';
import { STORAGE_KEYS } from '../storage/storageKeys';
import { mentorThemes, useMentorTheme } from '../design/mentorThemes';
import { getSavedMentor, saveMentor } from '../storage/mentorStore';

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

  // Получаем тему текущего ментора для стилей
  const { colors: mentorColors, mentorCardStyle, mentorCardActiveStyle } = useMentorTheme(mentor);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedName, storedMentor, storedGender] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.name),
          getSavedMentor(), // Используем mentorStore вместо прямого AsyncStorage
          AsyncStorage.getItem(STORAGE_KEYS.gender),
        ]);

        if (typeof storedName === 'string') setUserName(storedName);
        setMentor(storedMentor);

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
      await saveMentor(id); // Используем mentorStore
      
      // Обновляем снапшот дня, если нужно (может потребоваться импорт функции)
      // await updateDaySnapshotWithMentor(id);
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{lang === 'ua' ? 'Профіль' : 'Profile'}</Text>
      <Text style={styles.subtitle}>
        {lang === 'ua'
          ? 'Тут можна налаштувати, як наставник буде до тебе звертатися й як виглядатимуть щоденні кроки.'
          : 'Here you can tune how the mentor talks to you and how your daily steps look.'}
      </Text>

      {/* Имя */}
      <View style={[styles.card, { backgroundColor: mentorColors.background2 }]}>
        <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
          {lang === 'ua' ? 'Імʼя' : 'Name'}
        </Text>
        <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
          {lang === 'ua'
            ? 'Це імʼя бачиш тільки ти. Наставник буде використовувати його в зверненнях.'
            : 'Only you see this name. The mentor will use it when speaking to you.'}
        </Text>

        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder={lang === 'ua' ? 'Введи своє імʼя' : 'Enter your name'}
          placeholderTextColor={mentorColors.text3}
          style={[styles.input, { 
            borderColor: mentorColors.secondary,
            color: mentorColors.text,
            backgroundColor: mentorColors.background3 
          }]}
        />

        <Pressable
          onPress={() => void handleSaveName()}
          disabled={savingName}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.9 },
            savingName && { opacity: 0.7 },
            { backgroundColor: mentorColors.primary }
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savingName ? (lang === 'ua' ? 'Збереження...' : 'Saving...') : lang === 'ua' ? 'Зберегти імʼя' : 'Save name'}
          </Text>
        </Pressable>
      </View>

      {/* Гендер */}
      <View style={[styles.card, { backgroundColor: mentorColors.background2 }]}>
        <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
          {lang === 'ua' ? 'Звернення' : 'How mentor addresses you'}
        </Text>
        <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
          {lang === 'ua'
            ? 'Це потрібно, щоб наставник міг коректно звертатися до тебе (чоловіче / жіноче / нейтральне).'
            : 'This is used so the mentor can address you correctly (male / female / neutral).'}
        </Text>

        <View style={styles.genderRow}>
          <Pressable
            onPress={() => void handleChangeGender('neutral')}
            style={[
              styles.genderChip, 
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 },
              gender === 'neutral' && [styles.genderChipActive, { backgroundColor: mentorColors.primary }]
            ]}
          >
            <Text style={[
              styles.genderChipText, 
              { color: mentorColors.text2 },
              gender === 'neutral' && [styles.genderChipTextActive, { color: '#FFF7E8' }]
            ]}>
              {lang === 'ua' ? 'Без уточнення' : 'No preference'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleChangeGender('male')}
            style={[
              styles.genderChip, 
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 },
              gender === 'male' && [styles.genderChipActive, { backgroundColor: mentorColors.primary }]
            ]}
          >
            <Text style={[
              styles.genderChipText, 
              { color: mentorColors.text2 },
              gender === 'male' && [styles.genderChipTextActive, { color: '#FFF7E8' }]
            ]}>
              {lang === 'ua' ? 'Чоловіче' : 'Male'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleChangeGender('female')}
            style={[
              styles.genderChip, 
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 },
              gender === 'female' && [styles.genderChipActive, { backgroundColor: mentorColors.primary }]
            ]}
          >
            <Text style={[
              styles.genderChipText, 
              { color: mentorColors.text2 },
              gender === 'female' && [styles.genderChipTextActive, { color: '#FFF7E8' }]
            ]}>
              {lang === 'ua' ? 'Жіноче' : 'Female'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Язык */}
      <View style={[styles.card, { backgroundColor: mentorColors.background2 }]}>
        <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
          {lang === 'ua' ? 'Мова застосунку' : 'App language'}
        </Text>
        <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
          {lang === 'ua'
            ? 'Можеш перемикати українську / англійську. Це впливає на інтерфейс і фрази наставників.'
            : 'You can switch between Ukrainian and English. This affects the UI and mentor phrases.'}
        </Text>

        <View style={styles.languageRow}>
          <Pressable
            onPress={() => handleChangeLanguage('ua')}
            style={[
              styles.languageChip, 
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 },
              lang === 'ua' && [styles.languageChipActive, { backgroundColor: mentorColors.primary }]
            ]}
          >
            <Text style={[
              styles.languageChipText, 
              { color: mentorColors.text2 },
              lang === 'ua' && [styles.languageChipTextActive, { color: '#FFF7E8' }]
            ]}>
              Українська
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleChangeLanguage('en')}
            style={[
              styles.languageChip, 
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 },
              lang === 'en' && [styles.languageChipActive, { backgroundColor: mentorColors.primary }]
            ]}
          >
            <Text style={[
              styles.languageChipText, 
              { color: mentorColors.text2 },
              lang === 'en' && [styles.languageChipTextActive, { color: '#FFF7E8' }]
            ]}>
              English
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Наставник */}
      <View style={[styles.card, { backgroundColor: mentorColors.background2 }]}>
        <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
          {lang === 'ua' ? 'Наставник' : 'Mentor'}
        </Text>
        <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
          {lang === 'ua'
            ? 'Обери голос, який тобі ближче зараз. Це впливає на тон усіх фраз у застосунку.'
            : 'Choose the voice that feels closest to you now. This affects the tone of phrases across the app.'}
        </Text>

        <View style={styles.mentorGrid}>
          {(Object.keys(mentorThemes) as MentorId[]).map((id) => {
            const theme = mentorThemes[id];
            const isActive = mentor === id;

            return (
              <Pressable
                key={id}
                onPress={() => void handleChangeMentor(id)}
                style={[
                  mentorCardStyle,
                  styles.mentorCard,
                  isActive && [mentorCardActiveStyle, styles.mentorCardActive]
                ]}
              >
                <View style={styles.mentorHeader}>
                  <Text style={styles.mentorIcon}>{theme.icon}</Text>
                  <View style={styles.mentorInfo}>
                    <Text style={[styles.mentorName, { color: theme.colors.text }]}>
                      {lang === 'ua' ? theme.name.ua : theme.name.en}
                    </Text>
                    <Text style={[styles.mentorDesc, { color: theme.colors.text2 }]}>
                      {lang === 'ua' ? theme.description.ua : theme.description.en}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.colorPreview}>
                  {Object.entries(theme.colors)
                    .filter(([key]) => ['primary', 'secondary', 'background', 'text'].includes(key))
                    .map(([key, color]) => (
                      <View key={key} style={[styles.colorDot, { backgroundColor: color }]} />
                    ))}
                </View>
                
                {isActive && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.selectedBadgeText}>
                      {lang === 'ua' ? 'Обрано' : 'Selected'}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Небольшая строка для уверенности, что состояние актуально */}
        <Text style={[styles.mutedText, { marginTop: 8, color: mentorColors.text3 }]}>
          {lang === 'ua' ? 'Зараз обрано: ' : 'Current: '}
          {lang === 'ua' ? mentorThemes[mentor].name.ua : mentorThemes[mentor].name.en}
        </Text>
      </View>

      {/* Traits test */}
      <View style={[styles.card, { backgroundColor: mentorColors.background2 }]}>
        <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
          {lang === 'ua' ? 'Тест рис' : 'Traits test'}
        </Text>
        <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
          {lang === 'ua'
            ? 'Можеш пройти розширений тест, щоб краще налаштувати зони росту та сильні сторони. Це вплине на екран "Сьогодні" та челенджі.'
            : 'You can take an extended test to better tune your strengths and growth zones. It will affect "Today" and challenges.'}
        </Text>

        <Pressable
          onPress={() => router.push('/traits-test')}
          style={({ pressed }) => [
            styles.primaryButton, 
            pressed && { opacity: 0.9 },
            { backgroundColor: mentorColors.primary }
          ]}
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },

  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  mutedText: { fontSize: 12, marginBottom: 8 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },

  primaryButton: {
    marginTop: 4,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 14, color: '#FFF7E8', fontWeight: '600' },

  languageRow: { flexDirection: 'row', marginTop: 4, gap: 8, flexWrap: 'wrap' },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageChipActive: { borderColor: 'transparent' },
  languageChipText: { fontSize: 13, fontWeight: '500' },
  languageChipTextActive: { color: '#FFF7E8', fontWeight: '600' },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  genderChipActive: { borderColor: 'transparent' },
  genderChipText: { fontSize: 12 },
  genderChipTextActive: { fontSize: 12, fontWeight: '600' },

  mentorGrid: { marginTop: 8, gap: 8 },
  mentorCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  mentorCardActive: { borderWidth: 2 },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mentorIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  mentorDesc: { 
    fontSize: 12, 
    lineHeight: 16 
  },
  colorPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  selectedBadgeText: {
    fontSize: 11,
    color: '#FFF7E8',
    fontWeight: '600',
  },
});
