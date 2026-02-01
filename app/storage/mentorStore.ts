// app/storage/mentorStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import type { MentorId } from '../mentorPhrases';

// Получить сохраненного ментора
export async function getSavedMentor(): Promise<MentorId> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.mentor);
    if (stored === 'lev' || stored === 'lana' || stored === 'bro' || stored === 'katana') {
      return stored;
    }
    return 'lev'; // Значение по умолчанию
  } catch (error) {
    console.log('Error getting saved mentor:', error);
    return 'lev';
  }
}

// Сохранить ментора
export async function saveMentor(mentorId: MentorId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.mentor, mentorId);
  } catch (error) {
    console.log('Error saving mentor:', error);
    throw error;
  }
}

// Получить текущего ментора (для использования в компонентах)
export async function getCurrentMentor(): Promise<MentorId> {
  return await getSavedMentor();
}

// Очистить сохраненного ментора
export async function clearMentor(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.mentor);
  } catch (error) {
    console.log('Error clearing mentor:', error);
  }
}
