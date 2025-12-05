import React from 'react';

export type CategoryType = 
  | 'food' 
  | 'transport' 
  | 'shopping' 
  | 'housing' 
  | 'entertainment' 
  | 'medical' 
  | 'study' 
  | 'other';

export interface Expense {
  id: string;
  amount: number;
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