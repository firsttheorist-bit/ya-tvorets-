// app/storage/traitsStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TraitKey } from '../mentorPhrases';
import { STORAGE_KEYS } from './storageKeys';

export type TraitsResult = {
  strengths: TraitKey[];
  growthZones: TraitKey[];
};

function isTrait(v: unknown): v is TraitKey {
  return (
    v === 'focus' ||
    v === 'calm' ||
    v === 'confidence' ||
    v === 'discipline' ||
    v === 'creativity' ||
    v === 'empathy'
  );
}

function sanitizeTraits(obj: any): TraitsResult | null {
  if (!obj || typeof obj !== 'object') return null;

  const strengthsRaw = Array.isArray(obj.strengths) ? obj.strengths : [];
  const growthRaw = Array.isArray(obj.growthZones) ? obj.growthZones : [];

  const strengths = strengthsRaw.filter(isTrait);
  const growthZones = growthRaw.filter(isTrait);

  if (strengths.length === 0 && growthZones.length === 0) return null;
  return { strengths, growthZones };
}

export async function loadTraits(): Promise<TraitsResult | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.traits);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeTraits(parsed);
  } catch (e) {
    console.log('loadTraits error', e);
    return null;
  }
}

export async function saveTraits(result: TraitsResult): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.traits, JSON.stringify(result));
}
