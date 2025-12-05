import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense } from '../types';
import { getCategoryConfig } from '../constants';

interface StatisticsProps {
  expenses: Expense[];
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

const COLORS = ['#F97316', '#3B82F6', '#EC4899', '#EAB308', '#A855F7', '#22C55E', '#6366F1', '#6B7280'];

const Statistics: React.FC<StatisticsProps> = ({ expenses }) => {
  const [range, setRange] = useState<TimeRange>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateDate = (direction: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (range === 'day') newDate.setDate(newDate.getDate() + direction);
    if (range === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
    if (range === 'month') newDate.setMonth(newDate.getMonth() + direction);
    if (range === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    setCurrentDate(newDate);
  };

  const { filteredExpenses, label } = useMemo(() => {
    const target = new Date(currentDate);
    let start: Date, end: Date;
    let labelText = '';

    // Normalize target to avoid time issues
    target.setHours(0, 0, 0, 0);

    switch (range) {
      case 'day':
        start = new Date(target);
        end = new Date(target);
        end.setHours(23, 59, 59, 999);
        labelText = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;
        break;
      case 'week':
        // Calculate Monday of the current week
        const day = target.getDay() || 7; // Sunday is 0, make it 7 for Monday-based week
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

    const filtered = expenses.filter(e => e.date >= start.getTime() && e.date <= end.getTime());
    return { filteredExpenses: filtered, label: labelText };
  }, [expenses, range, currentDate]);

  const { chartData, total } = useMemo(() => {
    const map = new Map<string, number>();
    
    filteredExpenses.forEach(e => {
      const current = map.get(e.category) || 0;
      map.set(e.category, current + e.amount);
    });

    const result = Array.from(map.entries()).map(([key, value]) => {
      const config = getCategoryConfig(key);
      return {
        name: config.label,
        value: value,
        originalId: key
      };
    }).sort((a, b) => b.value - a.value);

    const sum = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return { chartData: result, total: sum };
  }, [filteredExpenses]);

  return (
    <div className="w-full h-full flex flex-col space-y-4">
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

      {/* Total Display */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center mx-1">
        <p className="text-gray-500 text-xs mb-1">总支出</p>
        <h2 className="text-3xl font-bold text-gray-900">¥ {total.toFixed(2)}</h2>
      </div>

      {/* Chart Content */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 min-h-[200px]">
          <p className="text-sm">该时段暂无支出记录</p>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 mx-1 mb-4">
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
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

          <div className="mt-2 space-y-3">
            {chartData.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
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
        </div>
      )}
    </div>
  );
};

export default Statistics;