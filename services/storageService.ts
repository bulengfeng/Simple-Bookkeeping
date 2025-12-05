import { Expense } from '../types';

const STORAGE_KEY = 'simple_bookkeeping_data_v1';

export const getExpenses = (): Expense[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Migration: Add 'type' = 'expense' to old records that don't have it
    return parsed.map((item: any) => ({
      ...item,
      type: item.type || 'expense'
    }));
  } catch (e) {
    console.error("Failed to load expenses", e);
    return [];
  }
};

export const saveExpenses = (expenses: Expense[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error("Failed to save expenses", e);
  }
};