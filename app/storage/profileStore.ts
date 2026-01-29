// app/storage/profileStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppGender, MentorId } from '../mentorPhrases';
import { STORAGE_KEYS } from './storageKeys';

export type ProfileState = {
  name: string;
  mentor: MentorId;
  gender: AppGender;
};

const DEFAULT_PROFILE: ProfileState = {
  name: '',
  mentor: 'lev',
  gender: 'neutral',
};

function sanitizeMentor(v: unknown): MentorId {
  return v === 'lev' || v === 'lana' || v === 'bro' || v === 'katana'
    ? v
    : 'lev';
}

function sanitizeGender(v: unknown): AppGender {
  return v === 'male' || v === 'female' || v === 'neutral' ? v : 'neutral';
}

export async function loadProfile(): Promise<ProfileState> {
  try {
    const [nameRaw, mentorRaw, genderRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.name),
      AsyncStorage.getItem(STORAGE_KEYS.mentor),
      AsyncStorage.getItem(STORAGE_KEYS.gender),
    ]);

    return {
      name: (nameRaw ?? '').trim(),
      mentor: sanitizeMentor(mentorRaw),
      gender: sanitizeGender(genderRaw),
    };
  } catch (e) {
    console.log('loadProfile error', e);
    return DEFAULT_PROFILE;
  }
}

export async function saveName(name: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.name, name.trim());
}

export async function saveMentor(mentor: MentorId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.mentor, mentor);
}

export async function saveGender(gender: AppGender): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.gender, gender);
}
