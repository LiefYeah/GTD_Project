import { create } from 'zustand';
import * as api from '../api/client';
import type { RecurringRule } from '../types';

interface RecurringState {
  rules: RecurringRule[];
  load: () => Promise<void>;
  createRule: (data: api.CreateRecurringRuleData) => Promise<RecurringRule>;
  patchRule: (id: string, data: api.UpdateRecurringRuleData) => Promise<RecurringRule>;
  deleteRule: (id: string) => Promise<void>;
  generateAndReload: (reloadBoard: () => Promise<void>) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>((set) => ({
  rules: [],

  load: async () => {
    const rules = await api.getRecurringRules();
    set({ rules });
  },

  createRule: async (data) => {
    const rule = await api.createRecurringRule(data);
    set((s) => ({ rules: [...s.rules, rule] }));
    return rule;
  },

  patchRule: async (id, data) => {
    const rule = await api.updateRecurringRule(id, data);
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? rule : r)) }));
    return rule;
  },

  deleteRule: async (id) => {
    await api.deleteRecurringRule(id);
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  generateAndReload: async (reloadBoard) => {
    await api.generateRecurringTasks();
    await Promise.all([reloadBoard(), api.getRecurringRules().then((rules) => set({ rules }))]);
  },
}));
