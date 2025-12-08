import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, List, PieChart, Trash2, Calendar, ChevronRight, ChevronLeft, Check, Download, Upload } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Expense, CategoryType, TransactionType } from './types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryConfig } from './constants';
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
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
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

  // List View Date State
  const [listCurrentDate, setListCurrentDate] = useState(new Date());

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

  // Handle Type Toggle
  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    // Reset category to the first one of the new type
    if (type === 'expense') {
        setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    } else {
        setSelectedCategory(INCOME_CATEGORIES[0].id);
    }
  };

  const handleAddExpense = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    // Parse selected date
    const [year, month, day] = dateStr.split('-').map(Number);
    const expenseDate = new Date();
    expenseDate.setFullYear(year);
    expenseDate.setMonth(month - 1);
    expenseDate.setDate(day);
    
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      type: transactionType,
      category: selectedCategory,
      note: note.trim(),
      date: expenseDate.getTime(),
    };

    setExpenses(prev => [newExpense, ...prev].sort((a, b) => b.date - a.date));
    
    // Reset form
    setAmount('');
    setNote('');
    // Keep date as is for consecutive entries
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除这条记录吗?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const navigateListMonth = (direction: number) => {
    const newDate = new Date(listCurrentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setListCurrentDate(newDate);
  };

  // Export Data
  const handleExport = async () => {
    const fileName = `simple-bookkeeping-backup-${getTodayStr()}.json`;
    const dataStr = JSON.stringify(expenses, null, 2);

    if (Capacitor.isNativePlatform()) {
      // Native App Logic (Android/iOS)
      try {
        // 1. Write file to cache directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // 2. Share the file
        await Share.share({
          title: '备份数据',
          text: '这是我的极简记账备份数据',
          url: result.uri,
          dialogTitle: '导出备份文件',
        });
      } catch (e) {
        console.error('Export failed', e);
        alert('导出失败: ' + (e as any).message);
      }
    } else {
      // Web Logic
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Import Data
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = e.target?.result;
            if (typeof result !== 'string') return;
            
            const importedData = JSON.parse(result);
            if (!Array.isArray(importedData)) {
                alert('文件格式错误：必须是数组格式');
                return;
            }

            // Simple validation
            if (importedData.length > 0 && (!importedData[0].id || !importedData[0].amount)) {
                 alert('文件格式错误：无法识别的记账数据');
                 return;
            }

            // Merge Logic: Deduplicate by ID
            const currentIds = new Set(expenses.map(e => e.id));
            let addedCount = 0;
            const newExpenses = [...expenses];
            
            importedData.forEach((item: any) => {
                if (!currentIds.has(item.id)) {
                    // Ensure normalized fields
                    const normalizedItem: Expense = {
                        ...item,
                        type: item.type || 'expense'
                    };
                    newExpenses.push(normalizedItem);
                    currentIds.add(item.id);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                setExpenses(newExpenses.sort((a, b) => b.date - a.date));
                alert(`成功导入 ${addedCount} 条记录`);
            } else {
                alert('没有发现新记录 (ID重复)');
            }

        } catch (error) {
            console.error(error);
            alert('导入失败：JSON解析错误');
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const renderAddTab = () => {
    const currentCategories = transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white rounded-b-3xl shadow-sm z-10 pb-6">
            {/* Type Toggle */}
            <div className="flex justify-center pt-4 mb-4">
                <div className="bg-gray-100 p-1 rounded-xl flex space-x-1">
                    <button
                        onClick={() => handleTypeChange('expense')}
                        className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            transactionType === 'expense' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        支出
                    </button>
                    <button
                        onClick={() => handleTypeChange('income')}
                        className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            transactionType === 'income' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        收入
                    </button>
                </div>
            </div>

            <div className="px-6">
                <label className="block text-sm font-medium text-gray-500 mb-2">
                    {transactionType === 'expense' ? '支出金额' : '收入金额'}
                </label>
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
          <h3 className="text-sm font-medium text-gray-500 mb-4 px-1">选择分类</h3>
          <div className="grid grid-cols-4 gap-4">
            {currentCategories.map((cat) => (
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
  };

  const renderListTab = () => {
    // Filter expenses by selected month
    const year = listCurrentDate.getFullYear();
    const month = listCurrentDate.getMonth();

    const filteredExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    const monthExpense = filteredExpenses
        .filter(e => e.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);
    
    const monthIncome = filteredExpenses
        .filter(e => e.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const monthBalance = monthIncome - monthExpense;

    // Group expenses by date
    const grouped = filteredExpenses.reduce((groups, expense) => {
      const dateKey = new Date(expense.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
      return groups;
    }, {} as Record<string, Expense[]>);

    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Month Selector Header */}
        <div className="bg-white px-4 py-4 shadow-sm z-10 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigateListMonth(-1)}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-sm text-gray-400 font-medium">
                            {year}年
                        </span>
                        <span className="text-lg font-bold text-gray-900 leading-none">
                            {month + 1}月
                        </span>
                    </div>
                    <button 
                        onClick={() => navigateListMonth(1)}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 mb-0.5">本月收入</span>
                    <span className="text-sm font-bold text-gray-900">
                        ¥ {monthIncome.toFixed(2)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 mb-0.5">本月支出</span>
                    <span className="text-sm font-bold text-gray-900">
                        ¥ {monthExpense.toFixed(2)}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 mb-0.5">结余</span>
                    <span className={`text-lg font-bold ${monthBalance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                        ¥ {monthBalance.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pb-40 px-4 pt-4 no-scrollbar">
            {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar size={24} className="opacity-40" />
                </div>
                <p>本月暂无账单</p>
            </div>
            ) : (
            Object.entries(grouped).map(([date, items]: [string, Expense[]]) => (
                <div key={date} className="mb-6">
                <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-sm font-semibold text-gray-500">{date}</span>
                    <div className="flex space-x-3 text-xs text-gray-400">
                         {items.some(i => i.type === 'income') && <span>收: {items.filter(i => i.type === 'income').reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>}
                         {items.some(i => i.type === 'expense') && <span>支: {items.filter(i => i.type === 'expense').reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>}
                    </div>
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
                            <span className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                                {item.type === 'income' ? '+' : '-'} {item.amount.toFixed(2)}
                            </span>
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
      </div>
    );
  };

  const renderStatsTab = () => (
    <div className="h-full overflow-y-auto pb-40 px-4 pt-4 no-scrollbar">
      <h2 className="text-xl font-bold text-gray-900 mb-6">消费统计</h2>
      <Statistics expenses={expenses} />
      
      {/* Data Management Section */}
      <div className="mt-8 mb-4">
        <h3 className="text-sm font-bold text-gray-500 mb-3 px-1">数据管理</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex space-x-3">
                <button 
                    onClick={handleExport}
                    className="flex-1 flex flex-col items-center justify-center py-4 bg-indigo-50 rounded-xl text-indigo-700 active:scale-95 transition-transform"
                >
                    <Download size={24} className="mb-2" />
                    <span className="text-xs font-bold">导出数据</span>
                </button>
                <div className="flex-1 relative">
                    <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button 
                        className="w-full h-full flex flex-col items-center justify-center py-4 bg-emerald-50 rounded-xl text-emerald-700 active:scale-95 transition-transform"
                    >
                        <Upload size={24} className="mb-2" />
                        <span className="text-xs font-bold">导入数据</span>
                    </button>
                </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center">
                支持导入 .json 格式的备份文件，重复记录将被自动跳过
            </p>
        </div>
      </div>
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