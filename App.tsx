import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, List, PieChart, Trash2, Calendar, ChevronRight, Check } from 'lucide-react';
import { Expense, CategoryType } from './types';
import { CATEGORIES, getCategoryConfig } from './constants';
import * as storage from './services/storageService';
import Statistics from './components/Statistics';

enum Tab {
  ADD = 'ADD',
  LIST = 'LIST',
  STATS = 'STATS'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ADD);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Form State
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('food');
  const [note, setNote] = useState<string>('');
  
  // Get today's date string in YYYY-MM-DD format local time
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateStr, setDateStr] = useState<string>(getTodayStr());

  // Initial Load
  useEffect(() => {
    const loaded = storage.getExpenses();
    // Sort by date descending
    setExpenses(loaded.sort((a, b) => b.date - a.date));
  }, []);

  // Save Effect
  useEffect(() => {
    storage.saveExpenses(expenses);
  }, [expenses]);

  const handleAddExpense = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    // Parse selected date
    const [year, month, day] = dateStr.split('-').map(Number);
    const expenseDate = new Date();
    expenseDate.setFullYear(year);
    expenseDate.setMonth(month - 1);
    expenseDate.setDate(day);
    // Keep current time for ordering if added today, otherwise could default to noon or current time
    // Using current time ensures if I add multiple for a past date they stay in entry order roughly
    
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category: selectedCategory,
      note: note.trim(),
      date: expenseDate.getTime(),
    };

    setExpenses(prev => [newExpense, ...prev].sort((a, b) => b.date - a.date));
    
    // Reset form
    setAmount('');
    setNote('');
    // Reset date to today for next entry or keep? Usually reset is better to avoid accidental wrong dates
    setDateStr(getTodayStr()); 
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除这条记录吗?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const renderAddTab = () => (
    <div className="flex flex-col h-full">
      <div className="bg-white p-6 rounded-b-3xl shadow-sm z-10">
        <label className="block text-sm font-medium text-gray-500 mb-2">支出金额</label>
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-900">¥</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 text-4xl font-bold text-gray-900 placeholder-gray-200 outline-none border-b-2 border-transparent focus:border-indigo-500 transition-colors bg-transparent"
            autoFocus
          />
        </div>
        
        <div className="mt-4 flex space-x-3">
            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-3 py-2">
                 <input 
                    type="text" 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="添加备注..."
                    className="bg-transparent w-full text-sm outline-none text-gray-700"
                 />
            </div>
            
            <div className="relative flex items-center bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                 <input 
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 <div className="flex items-center space-x-1 pointer-events-none text-indigo-600">
                    <Calendar size={16} />
                    <span className="text-sm font-medium whitespace-nowrap">
                        {dateStr === getTodayStr() ? '今天' : dateStr.slice(5).replace('-', '/')}
                    </span>
                 </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
        <h3 className="text-sm font-medium text-gray-500 mb-4 px-1">选择分类</h3>
        <div className="grid grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-full mb-1 ${selectedCategory === cat.id ? 'bg-white/20' : cat.color}`}>
                 {React.cloneElement(cat.icon as React.ReactElement<any>, { size: 20 })}
              </div>
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderListTab = () => {
    // Group expenses by date
    const grouped = expenses.reduce((groups, expense) => {
      const dateKey = new Date(expense.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      // Format as YYYY-MM-DD for simpler sorting/display keys, or use localized string directly
      
      // Let's use a nice display format for the key
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
      return groups;
    }, {} as Record<string, Expense[]>);

    return (
      <div className="h-full overflow-y-auto pb-24 px-4 pt-4 no-scrollbar">
        <h2 className="text-xl font-bold text-gray-900 mb-6">账单明细</h2>
        {expenses.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
             <Calendar size={48} className="mb-4 opacity-20" />
             <p>还没有记账记录哦</p>
           </div>
        ) : (
          Object.entries(grouped).map(([date, items]: [string, Expense[]]) => (
            <div key={date} className="mb-6">
              <div className="flex items-center justify-between mb-2 px-2">
                 <span className="text-sm font-semibold text-gray-500">{date}</span>
                 <span className="text-xs text-gray-400">支出: {items.reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {items.map((item, idx) => {
                  const catConfig = getCategoryConfig(item.category);
                  return (
                    <div key={item.id} className={`flex items-center p-4 ${idx !== items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className={`p-2 rounded-full mr-3 ${catConfig.color} bg-opacity-20`}>
                        {React.cloneElement(catConfig.icon as React.ReactElement<any>, { size: 18 })}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{catConfig.label}</span>
                          <span className="font-bold text-gray-900">- {item.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-400 truncate max-w-[150px]">{item.note || '无备注'}</span>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderStatsTab = () => (
    <div className="h-full overflow-y-auto pb-24 px-4 pt-4 no-scrollbar">
      <h2 className="text-xl font-bold text-gray-900 mb-6">消费统计</h2>
      <Statistics expenses={expenses} />
    </div>
  );

  const isFormValid = !!(amount && parseFloat(amount) > 0);
  const isAddingMode = activeTab === Tab.ADD;

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-gray-50 relative overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === Tab.ADD && renderAddTab()}
        {activeTab === Tab.LIST && renderListTab()}
        {activeTab === Tab.STATS && renderStatsTab()}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-2 pb-6 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button
          onClick={() => setActiveTab(Tab.LIST)}
          className={`flex flex-col items-center p-2 space-y-1 transition-colors ${
            activeTab === Tab.LIST ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <List size={24} strokeWidth={activeTab === Tab.LIST ? 2.5 : 2} />
          <span className="text-[10px] font-medium">明细</span>
        </button>

        <button
          onClick={() => {
            if (isAddingMode) {
              if (isFormValid) handleAddExpense();
            } else {
              setActiveTab(Tab.ADD);
            }
          }}
          className="flex flex-col items-center justify-center -mt-8"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
             isAddingMode 
             ? 'bg-indigo-600 text-white ring-4 ring-gray-50' 
             : 'bg-white text-indigo-600 border border-gray-100'
          }`}>
             {isAddingMode && isFormValid ? (
               <Check size={32} strokeWidth={3} />
             ) : (
               <PlusCircle size={32} fill={isAddingMode ? "currentColor" : "none"} />
             )}
          </div>
          <span className={`text-[10px] font-medium mt-1 ${isAddingMode ? 'text-indigo-600' : 'text-gray-400'}`}>
            {isAddingMode && isFormValid ? '完成' : '记账'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab(Tab.STATS)}
          className={`flex flex-col items-center p-2 space-y-1 transition-colors ${
            activeTab === Tab.STATS ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <PieChart size={24} strokeWidth={activeTab === Tab.STATS ? 2.5 : 2} />
          <span className="text-[10px] font-medium">统计</span>
        </button>
      </div>
    </div>
  );
}