import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Routine, DailyRecord, Reflection, AppSettings, TimeEntry } from '../types';

export interface UserData {
  routines: Routine[];
  records: DailyRecord[];
  reflections: Reflection[];
  timeEntries: TimeEntry[];
  keywords: string[];
  settings: AppSettings;
  updatedAt: string;
}

const defaultData: UserData = {
  routines: [],
  records: [],
  reflections: [],
  timeEntries: [],
  keywords: [],
  settings: { discordWebhookUrl: '', darkMode: false, colorTheme: 'indigo', username: '' },
  updatedAt: new Date().toISOString(),
};

const removeUndefined = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result as T;
  }
  return obj;
};

export const getUserData = async (userId: string): Promise<{ data: UserData; isNew: boolean }> => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { data: docSnap.data() as UserData, isNew: false };
  }
  return { data: defaultData, isNew: true };
};

const MAX_RETRIES = 3;

export const saveUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
  const docRef = doc(db, 'users', userId);
  let lastError: unknown;

  const cleanData = removeUndefined({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await setDoc(docRef, cleanData, { merge: true });
      return;
    } catch (error) {
      lastError = error;
      console.error(`Error saving user data (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
};
