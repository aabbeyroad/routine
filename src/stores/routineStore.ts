import { create } from 'zustand';
import type { Routine, DailyRecord, Reflection, AppSettings, CheckLevel, TabType, TimeEntry } from '../types';
import { formatDate } from '../utils/date';
import { getUserData, saveUserData, type UserData } from '../lib/firestore';

interface RoutineStore {
  userId: string | null;
  isLoading: boolean;
  syncError: string | null;
  routines: Routine[];
  records: DailyRecord[];
  reflections: Reflection[];
  timeEntries: TimeEntry[];
  settings: AppSettings;
  keywords: string[];
  activeTab: TabType;
  selectedKeyword: string | null;

  setUserId: (userId: string | null) => void;
  loadUserData: (userId: string) => Promise<void>;
  clearSyncError: () => void;
  setActiveTab: (tab: TabType) => void;
  setSelectedKeyword: (keyword: string | null) => void;

  addRoutine: (routine: Omit<Routine, 'id' | 'order' | 'createdAt' | 'archived'>) => void;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  reorderRoutines: (routines: Routine[]) => void;

  setCheck: (date: string, routineId: string, level: CheckLevel) => void;
  getRecord: (date: string) => DailyRecord | undefined;

  addReflection: (reflection: Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReflection: (id: string, updates: Partial<Reflection>) => void;
  deleteReflection: (id: string) => void;
  getReflection: (date: string, type: 'daily' | 'weekly') => Reflection | undefined;

  toggleTracking: (routineId: string) => void;
  getActiveTracking: (routineId: string) => TimeEntry | undefined;
  getTimeEntriesForDate: (date: string) => TimeEntry[];
  deleteTimeEntry: (id: string) => void;

  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;

  getFilteredRoutines: () => Routine[];
  getDailyRate: (date: string, filteredOnly?: boolean) => number;
  getWeeklyRate: (startDate: string, endDate: string, filteredOnly?: boolean) => number;
  getWeeklyScore: (startDate: string, endDate: string, filteredOnly?: boolean) => number;
}

const generateId = (): string => crypto.randomUUID();

const defaultSettings: AppSettings = {
  discordWebhookUrl: '',
  darkMode: false,
  colorTheme: 'indigo',
  username: '',
};

let dataLoadedFor: string | null = null;
let pendingSaves = 0;

const syncToFirestore = async (userId: string | null, data: Partial<UserData>, setError: (err: string | null) => void) => {
  if (!userId) {
    setError('저장 실패: 로그인 상태가 아닙니다 (userId 없음)');
    return;
  }
  pendingSaves++;
  try {
    await saveUserData(userId, data);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Firestore 저장 실패:', error);
    setError('저장 실패: ' + errMsg);
  } finally {
    pendingSaves--;
  }
};

export const useRoutineStore = create<RoutineStore>()((set, get) => ({
  userId: null,
  isLoading: false,
  syncError: null,
  routines: [],
  records: [],
  reflections: [],
  timeEntries: [],
  keywords: [],
  activeTab: 'today',
  selectedKeyword: null,
  settings: defaultSettings,

  setUserId: (userId) => set({ userId }),
  clearSyncError: () => set({ syncError: null }),

  loadUserData: async (userId) => {
    if (dataLoadedFor === userId) return;
    if (pendingSaves > 0) return;

    set({ isLoading: true });
    try {
      const { data } = await getUserData(userId);
      dataLoadedFor = userId;
      set({
        userId,
        routines: data.routines || [],
        records: data.records || [],
        reflections: data.reflections || [],
        timeEntries: data.timeEntries || [],
        keywords: data.keywords || [],
        settings: data.settings || defaultSettings,
        isLoading: false,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Firestore 데이터 로드 실패:', error);
      set({
        userId,
        isLoading: false,
        syncError: '로드 실패: ' + errMsg,
      });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedKeyword: (keyword) => set({ selectedKeyword: keyword }),

  addRoutine: (routine) => {
    const { userId, routines } = get();
    const newRoutine: Routine = {
      ...routine,
      id: generateId(),
      order: routines.length,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    const newRoutines = [...routines, newRoutine];
    set({ routines: newRoutines });
    syncToFirestore(userId, { routines: newRoutines }, (err) => set({ syncError: err }));
  },

  updateRoutine: (id, updates) => {
    const { userId, routines } = get();
    const newRoutines = routines.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ routines: newRoutines });
    syncToFirestore(userId, { routines: newRoutines }, (err) => set({ syncError: err }));
  },

  deleteRoutine: (id) => {
    const { userId, routines } = get();
    const newRoutines = routines.filter((r) => r.id !== id);
    set({ routines: newRoutines });
    syncToFirestore(userId, { routines: newRoutines }, (err) => set({ syncError: err }));
  },

  reorderRoutines: (routines) => {
    const { userId } = get();
    set({ routines });
    syncToFirestore(userId, { routines }, (err) => set({ syncError: err }));
  },

  setCheck: (date, routineId, level) => {
    const { userId, records } = get();
    const existing = records.find((r) => r.date === date);
    let newRecords: DailyRecord[];

    if (existing) {
      newRecords = records.map((r) =>
        r.date === date ? { ...r, checks: { ...r.checks, [routineId]: level } } : r
      );
    } else {
      newRecords = [...records, { date, checks: { [routineId]: level } }];
    }

    set({ records: newRecords });
    syncToFirestore(userId, { records: newRecords }, (err) => set({ syncError: err }));
  },

  getRecord: (date) => get().records.find((r) => r.date === date),

  addReflection: (reflection) => {
    const { userId, reflections } = get();
    const now = new Date().toISOString();
    const newReflection: Reflection = {
      ...reflection,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const newReflections = [...reflections, newReflection];
    set({ reflections: newReflections });
    syncToFirestore(userId, { reflections: newReflections }, (err) => set({ syncError: err }));
  },

  updateReflection: (id, updates) => {
    const { userId, reflections } = get();
    const newReflections = reflections.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    );
    set({ reflections: newReflections });
    syncToFirestore(userId, { reflections: newReflections }, (err) => set({ syncError: err }));
  },

  deleteReflection: (id) => {
    const { userId, reflections } = get();
    const newReflections = reflections.filter((r) => r.id !== id);
    set({ reflections: newReflections });
    syncToFirestore(userId, { reflections: newReflections }, (err) => set({ syncError: err }));
  },

  getReflection: (date, type) =>
    get().reflections.find((r) => r.date === date && r.type === type),

  toggleTracking: (routineId) => {
    const { userId, timeEntries } = get();
    const active = timeEntries.find((e) => e.routineId === routineId && e.endTime === null);
    let newEntries: TimeEntry[];
    if (active) {
      newEntries = timeEntries.map((e) =>
        e.id === active.id ? { ...e, endTime: new Date().toISOString() } : e
      );
    } else {
      const now = new Date();
      const newEntry: TimeEntry = {
        id: generateId(),
        routineId,
        date: formatDate(now),
        startTime: now.toISOString(),
        endTime: null,
      };
      newEntries = [...timeEntries, newEntry];
    }
    set({ timeEntries: newEntries });
    syncToFirestore(userId, { timeEntries: newEntries }, (err) => set({ syncError: err }));
  },

  getActiveTracking: (routineId) =>
    get().timeEntries.find((e) => e.routineId === routineId && e.endTime === null),

  getTimeEntriesForDate: (date) =>
    get().timeEntries.filter((e) => e.date === date),

  deleteTimeEntry: (id) => {
    const { userId, timeEntries } = get();
    const newEntries = timeEntries.filter((e) => e.id !== id);
    set({ timeEntries: newEntries });
    syncToFirestore(userId, { timeEntries: newEntries }, (err) => set({ syncError: err }));
  },

  addKeyword: (keyword) => {
    const { userId, keywords } = get();
    if (keywords.includes(keyword)) return;
    const newKeywords = [...keywords, keyword];
    set({ keywords: newKeywords });
    syncToFirestore(userId, { keywords: newKeywords }, (err) => set({ syncError: err }));
  },

  removeKeyword: (keyword) => {
    const { userId, keywords, routines, selectedKeyword } = get();
    const newKeywords = keywords.filter((k) => k !== keyword);
    const newRoutines = routines.map((r) => ({
      ...r,
      keywords: r.keywords.filter((k) => k !== keyword),
    }));
    set({
      keywords: newKeywords,
      routines: newRoutines,
      selectedKeyword: selectedKeyword === keyword ? null : selectedKeyword,
    });
    syncToFirestore(userId, { keywords: newKeywords, routines: newRoutines }, (err) => set({ syncError: err }));
  },

  updateSettings: (newSettings) => {
    const { userId, settings } = get();
    const updated = { ...settings, ...newSettings };
    set({ settings: updated });
    syncToFirestore(userId, { settings: updated }, (err) => set({ syncError: err }));
  },

  getFilteredRoutines: () => {
    const { routines, selectedKeyword } = get();
    const active = routines.filter((r) => !r.archived);
    if (!selectedKeyword) return active;
    return active.filter((r) => r.keywords.includes(selectedKeyword));
  },

  getDailyRate: (date, filteredOnly = false) => {
    const { routines, records, selectedKeyword } = get();
    let active = routines.filter((r) => !r.archived);
    if (filteredOnly && selectedKeyword) {
      active = active.filter((r) => r.keywords.includes(selectedKeyword));
    }
    if (active.length === 0) return 0;
    const record = records.find((r) => r.date === date);
    if (!record) return 0;
    const completed = active.filter(
      (r) => record.checks[r.id] && record.checks[r.id] !== 'none'
    ).length;
    return Math.round((completed / active.length) * 100);
  },

  getWeeklyRate: (startDate, endDate, filteredOnly = false) => {
    const { routines, records, selectedKeyword } = get();
    let active = routines.filter((r) => !r.archived);
    if (filteredOnly && selectedKeyword) {
      active = active.filter((r) => r.keywords.includes(selectedKeyword));
    }
    if (active.length === 0) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalChecks = 0;
    let completedChecks = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      const record = records.find((r) => r.date === dateStr);
      totalChecks += active.length;
      if (record) {
        completedChecks += active.filter(
          (r) => record.checks[r.id] && record.checks[r.id] !== 'none'
        ).length;
      }
    }
    return totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
  },

  getWeeklyScore: (startDate, endDate, filteredOnly = false) => {
    const { routines, records, selectedKeyword } = get();
    let active = routines.filter((r) => !r.archived);
    if (filteredOnly && selectedKeyword) {
      active = active.filter((r) => r.keywords.includes(selectedKeyword));
    }
    if (active.length === 0) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let score = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      const record = records.find((r) => r.date === dateStr);
      if (record) {
        active.forEach((r) => {
          const level = record.checks[r.id];
          if (level === 'done') score += 1;
          else if (level === 'more') score += 2;
          else if (level === 'max') score += 3;
        });
      }
    }
    return score;
  },
}));
