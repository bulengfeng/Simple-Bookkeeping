import React from 'react';
import { 
  Utensils, 
  Bus, 
  ShoppingBag, 
  Home, 
  Gamepad2, 
  Stethoscope, 
  BookOpen, 
  MoreHorizontal 
} from 'lucide-react';
import { CategoryDef } from './types';

export const CATEGORIES: CategoryDef[] = [
  { id: 'food', label: '餐饮', icon: <Utensils size={24} />, color: 'bg-orange-100 text-orange-600' },
  { id: 'transport', label: '交通', icon: <Bus size={24} />, color: 'bg-blue-100 text-blue-600' },
  { id: 'shopping', label: '购物', icon: <ShoppingBag size={24} />, color: 'bg-pink-100 text-pink-600' },
  { id: 'housing', label: '居住', icon: <Home size={24} />, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'entertainment', label: '娱乐', icon: <Gamepad2 size={24} />, color: 'bg-purple-100 text-purple-600' },
  { id: 'medical', label: '医疗', icon: <Stethoscope size={24} />, color: 'bg-green-100 text-green-600' },
  { id: 'study', label: '学习', icon: <BookOpen size={24} />, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'other', label: '其他', icon: <MoreHorizontal size={24} />, color: 'bg-gray-100 text-gray-600' },
];

export const getCategoryConfig = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[7];
