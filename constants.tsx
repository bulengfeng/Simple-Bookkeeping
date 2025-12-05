import React from 'react';
import { 
  Utensils, 
  Bus, 
  ShoppingBag, 
  Home, 
  Gamepad2, 
  Stethoscope, 
  BookOpen, 
  MoreHorizontal,
  Banknote,
  Coins,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { CategoryDef } from './types';

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: '餐饮', icon: <Utensils size={24} />, color: 'bg-orange-100 text-orange-600' },
  { id: 'transport', label: '交通', icon: <Bus size={24} />, color: 'bg-blue-100 text-blue-600' },
  { id: 'shopping', label: '购物', icon: <ShoppingBag size={24} />, color: 'bg-pink-100 text-pink-600' },
  { id: 'housing', label: '居住', icon: <Home size={24} />, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'entertainment', label: '娱乐', icon: <Gamepad2 size={24} />, color: 'bg-purple-100 text-purple-600' },
  { id: 'medical', label: '医疗', icon: <Stethoscope size={24} />, color: 'bg-green-100 text-green-600' },
  { id: 'study', label: '学习', icon: <BookOpen size={24} />, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'other', label: '其他', icon: <MoreHorizontal size={24} />, color: 'bg-gray-100 text-gray-600' },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: 'salary', label: '工资', icon: <Banknote size={24} />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'bonus', label: '奖金', icon: <Coins size={24} />, color: 'bg-amber-100 text-amber-600' },
  { id: 'investment', label: '理财', icon: <TrendingUp size={24} />, color: 'bg-red-100 text-red-600' },
  { id: 'other_income', label: '其他', icon: <Wallet size={24} />, color: 'bg-cyan-100 text-cyan-600' },
];

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const getCategoryConfig = (id: string) => CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[7];