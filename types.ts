import React from 'react';

export type TransactionType = 'expense' | 'income';

export type CategoryType = 
  // Expense Categories
  | 'food' 
  | 'transport' 
  | 'shopping' 
  | 'housing' 
  | 'entertainment' 
  | 'medical' 
  | 'study' 
  | 'other'
  // Income Categories
  | 'salary'
  | 'bonus'
  | 'investment'
  | 'other_income';

export interface Expense {
  id: string;
  amount: number;
  type: TransactionType;
  category: CategoryType;
  note: string;
  date: number; // timestamp
}

export interface CategoryDef {
  id: CategoryType;
  label: string;
  icon: React.ReactNode;
  color: string;
}