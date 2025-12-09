import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { Expense } from '../types';
import { getCategoryConfig } from '../constants';

interface StatisticsProps {
  expenses: Expense[];
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type TimeRange = 'day' | 'week' | 'month' | 'year';
type ViewMode = 'expense' | 'income' | 'overview';

const COLORS = ['#F97316', '#3B82F6', '#EC4899', '#EAB308', '#A855F7', '#22C55E', '#6366F1', '#6B7280'];

const Statistics: React.FC<StatisticsProps> = ({ expenses, onExport, onImport }) => {
  const [range, setRange] = useState<TimeRange>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  
  // Ref for the scrolling chart container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const navigateDate = (direction: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (range === 'day') newDate.setDate(newDate.getDate() + direction);
    if (range === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
    if (range === 'month') newDate.setMonth(newDate.getMonth() + direction);
    if (range === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    setCurrentDate(newDate);
  };

  // 1. Filter expenses by Date Range only
  const { dateFilteredExpenses, label, rangeStart, rangeEnd } = useMemo(() => {
    const target = new Date(currentDate);
    let start: Date, end: Date;
    let labelText = '';

    // Normalize target
    target.setHours(0, 0, 0, 0);

    switch (range) {
      case 'day':
        start = new Date(target);
        end = new Date(target);
        end.setHours(23, 59, 59, 999);
        labelText = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;
        break;
      case 'week':
        const day = target.getDay() || 7;
        start = new Date(target);
        start.setDate(target.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        const startStr = `${start.getMonth() + 1}月${start.getDate()}日`;
        const endStr = `${end.getMonth() + 1}月${end.getDate()}日`;
        labelText = `${startStr} - ${endStr}`;
        break;
      case 'month':
        start = new Date(target.getFullYear(), target.getMonth(), 1);
        end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);
        labelText = `${target.getFullYear()}年${target.getMonth() + 1}月`;
        break;
      case 'year':
        start = new Date(target.getFullYear(), 0, 1);
        end = new Date(target.getFullYear(), 11, 31, 23, 59, 59, 999);
        labelText = `${target.getFullYear()}年`;
        break;
    }

    const filtered = expenses.filter(e => 
      e.date >= start.getTime() && 
      e.date <= end.getTime()
    );
    return { dateFilteredExpenses: filtered, label: labelText, rangeStart: start, rangeEnd: end };
  }, [expenses, range, currentDate]);

  // 2. Aggregate Data based on View Mode (Totals & Pie Data)
  const { totalIncome, totalExpense, balance, pieChartData } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const categoryMap = new Map<string, number>();

    dateFilteredExpenses.forEach(e => {
      if (e.type === 'income') inc += e.amount;
      else if (e.type === 'expense') exp += e.amount;

      // Prepare Pie Data if needed
      if (viewMode === 'expense' && e.type === 'expense') {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
      } else if (viewMode === 'income' && e.type === 'income') {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
      }
    });

    let data: any[] = [];
    
    if (viewMode !== 'overview') {
      data = Array.from(categoryMap.entries()).map(([key, value]) => {
        const config = getCategoryConfig(key);
        return {
          name: config.label,
          value: value,
          originalId: key
        };
      }).sort((a, b) => b.value - a.value);
    }

    return { totalIncome: inc, totalExpense: exp, balance: inc - exp, pieChartData: data };
  }, [dateFilteredExpenses, viewMode]);

  // 3. Aggregate Trend Data for Bar Chart
  const trendData = useMemo(() => {
    const data: { name: string; income: number; expense: number; sortIndex: number }[] = [];
    
    if (range === 'day') {
      // Day: Just show Total Income vs Total Expense for today
      data.push({
        name: '今日',
        income: totalIncome,
        expense: totalExpense,
        sortIndex: 0
      });
    } else if (range === 'week') {
      // Week: 7 Days
      const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      for(let i=0; i<7; i++) {
         data.push({
           name: weekDays[i],
           income: 0,
           expense: 0,
           sortIndex: i
         });
      }
      
      dateFilteredExpenses.forEach(e => {
        const d = new Date(e.date);
        let dayIndex = d.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6;
        
        if (e.type === 'income') data[dayIndex].income += e.amount;
        else data[dayIndex].expense += e.amount;
      });

    } else if (range === 'month') {
      // Month: Show every day of the month
      const year = rangeStart.getFullYear();
      const month = rangeStart.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Determine the limit day: if it's current month, stop at today
      const now = new Date();
      let limitDay = daysInMonth;
      if (year === now.getFullYear() && month === now.getMonth()) {
        limitDay = now.getDate();
      }

      for(let i=1; i<=limitDay; i++) {
        data.push({ name: `${month + 1}/${i}`, income: 0, expense: 0, sortIndex: i });
      }

      dateFilteredExpenses.forEach(e => {
        const d = new Date(e.date);
        const day = d.getDate();
        // Only add if day is within our limit (handle case where future expenses exist in DB but we are limiting chart)
        if (day <= limitDay) {
            // data index is day - 1
            if (e.type === 'income') data[day - 1].income += e.amount;
            else data[day - 1].expense += e.amount;
        }
      });

    } else if (range === 'year') {
      // Year: 12 Months
      for(let i=1; i<=12; i++) {
        data.push({ name: `${i}月`, income: 0, expense: 0, sortIndex: i });
      }

      dateFilteredExpenses.forEach(e => {
        const d = new Date(e.date);
        const monthIndex = d.getMonth(); // 0-11
        if (e.type === 'income') data[monthIndex].income += e.amount;
        else data[monthIndex].expense += e.amount;
      });
    }

    return data;
  }, [dateFilteredExpenses, range, rangeStart, totalIncome, totalExpense]);

  // Auto-scroll to the end (today) when data updates, especially for 'month' view
  useEffect(() => {
    if (scrollContainerRef.current) {
        // Use a small timeout to ensure rendering is complete
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            }
        }, 0);
    }
  }, [trendData, range]);

  const currentTotal = viewMode === 'income' ? totalIncome : totalExpense;

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Range Selector */}
      <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 grid grid-cols-4 gap-1 mx-1">
        {(['day', 'week', 'month', 'year'] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => {
                setRange(r);
                setCurrentDate(new Date());
            }}
            className={`text-xs font-medium py-1.5 rounded-lg transition-all ${
              range === r 
                ? 'bg-indigo-50 text-indigo-600 font-bold' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {r === 'day' ? '日' : r === 'week' ? '周' : r === 'month' ? '月' : '年'}
          </button>
        ))}
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between px-4 py-3 bg-white mx-1 rounded-xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => navigateDate(-1)} 
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-gray-800 text-sm">{label}</span>
        <button 
          onClick={() => navigateDate(1)} 
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
            <button 
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'overview' ? 'bg-white shadow text-gray-900' : 'text-gray-400'
                }`}
            >
                总览
            </button>
            <button 
                onClick={() => setViewMode('expense')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'expense' ? 'bg-white shadow text-gray-900' : 'text-gray-400'
                }`}
            >
                支出
            </button>
            <button 
                onClick={() => setViewMode('income')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'income' ? 'bg-white shadow text-gray-900' : 'text-gray-400'
                }`}
            >
                收入
            </button>
        </div>
      </div>

      {/* Overview Mode Content */}
      {viewMode === 'overview' && (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2 mx-1">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs mb-1">总收入</p>
                    <p className="text-lg font-bold text-green-600">¥{totalIncome.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs mb-1">总支出</p>
                    <p className="text-lg font-bold text-gray-900">¥{totalExpense.toFixed(2)}</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-xl shadow-md col-span-2 text-white flex justify-between items-center">
                    <div>
                        <p className="text-indigo-200 text-xs mb-1">结余</p>
                        <p className="text-2xl font-bold">¥{balance.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-200 text-xs">净收益</p>
                    </div>
                </div>
            </div>

            {/* Data Management Section - ONLY IN OVERVIEW */}
            <div className="mx-1 mt-2 mb-2">
                <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">数据管理</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex space-x-3">
                        <button 
                            onClick={onExport}
                            className="flex-1 flex flex-col items-center justify-center py-4 bg-indigo-50 rounded-xl text-indigo-700 active:scale-95 transition-transform"
                        >
                            <Download size={24} className="mb-2" />
                            <span className="text-xs font-bold">导出数据</span>
                        </button>
                        <div className="flex-1 relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={onImport}
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
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        支持导入 .json 格式的备份文件，重复记录将被自动跳过
                    </p>
                </div>
            </div>

            {/* Income vs Expense Bar Chart */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mx-1 flex flex-col h-64">
                <h3 className="text-xs font-bold text-gray-400 mb-4">收支对比</h3>
                <div ref={scrollContainerRef} className="flex-1 overflow-x-auto no-scrollbar pb-2">
                    <div style={{ minWidth: range === 'month' ? `${trendData.length * 40}px` : '100%', height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                                    interval={0}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                                />
                                <RechartsTooltip 
                                    formatter={(value: number) => `¥${value.toFixed(0)}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Bar dataKey="income" name="收入" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="expense" name="支出" fill="#374151" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Expense/Income Mode Content */}
      {viewMode !== 'overview' && (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center mx-1">
                <p className="text-gray-500 text-xs mb-1">{viewMode === 'expense' ? '总支出' : '总收入'}</p>
                <h2 className={`text-3xl font-bold ${viewMode === 'expense' ? 'text-gray-900' : 'text-green-600'}`}>
                    ¥ {currentTotal.toFixed(2)}
                </h2>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 mx-1 flex flex-col min-h-[350px]">
                {/* Conditional Chart Rendering */}
                {currentTotal === 0 ? (
                     <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                        <p className="text-sm">该时段暂无数据</p>
                     </div>
                ) : (
                    <>
                        {/* PIE CHART VIEW */}
                        <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        formatter={(value: number) => `¥${value.toFixed(2)}`}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '12px', 
                                            border: 'none', 
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            padding: '8px 12px'
                                        }}
                                        itemStyle={{ color: '#374151', fontSize: '12px', fontWeight: 600 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 space-y-3 overflow-y-auto max-h-48 no-scrollbar">
                            {pieChartData.map((item, index) => {
                                const percentage = currentTotal > 0 ? ((item.value / currentTotal) * 100).toFixed(1) : '0.0';
                                return (
                                <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center space-x-2">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-gray-700 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex space-x-3 items-center">
                                    <span className="text-gray-400 w-10 text-right">{percentage}%</span>
                                    <span className="font-semibold text-gray-900 w-20 text-right">¥{item.value.toFixed(2)}</span>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </>
      )}
    </div>
  );
};

export default Statistics;