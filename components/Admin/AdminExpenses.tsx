
import React, { useState } from 'react';
import { Expense } from '../../types';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminExpensesProps {
  expenses: Expense[];
  onAddExpense: (e: Partial<Expense>) => void;
}

const AdminExpenses: React.FC<AdminExpensesProps> = ({ expenses, onAddExpense }) => {
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState<string>('');

  const handleAdd = () => {
    const amount = parseVND(amountStr);
    if (!desc || amount <= 0) return;
    onAddExpense({
      description: desc,
      amount: amount,
      date: new Date().toISOString()
    });
    setDesc('');
    setAmountStr('');
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-10">
      <div className="flex-1 flex flex-col bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-[#FAF9F6]">
          <h3 className="text-xl font-black text-[#4B3621]">Lịch sử chi tiêu</h3>
          <span className="text-xl font-black text-red-500">-{formatVND(expenses.reduce((a, b) => a + b.amount, 0))}đ</span>
        </div>
        <div className="flex-1 overflow-y-auto admin-scroll p-6 space-y-3">
          {expenses.map(ex => (
            <div key={ex.id} className="flex justify-between items-center p-5 bg-[#FDFCF8] rounded-2xl border border-gray-50">
              <div>
                <p className="font-bold text-gray-800">{ex.description}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase mt-1">{new Date(ex.date).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="font-black text-red-600">-{formatVND(ex.amount)}đ</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full xl:w-96 bg-white rounded-[40px] p-8 shadow-2xl border border-gray-100 h-fit sticky top-0">
        <h4 className="text-xl font-black text-[#4B3621] mb-8">Thêm khoản chi mới</h4>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nội dung chi</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="VD: Nhập sữa đặc, tiền điện..." className="w-full bg-gray-50 border-none rounded-2xl p-5 font-bold outline-none focus:ring-2 focus:ring-[#C2A383]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Số tiền (VNĐ)</label>
            <input type="text" inputMode="numeric" value={amountStr} onChange={e => setAmountStr(handleMoneyInput(e.target.value))} placeholder="0" className="w-full bg-gray-50 border-none rounded-2xl p-5 font-black text-3xl text-red-600 outline-none focus:ring-2 focus:ring-red-100" />
          </div>
          <button onClick={handleAdd} className="w-full bg-[#4B3621] text-white py-6 rounded-[32px] font-black text-lg shadow-xl hover:scale-[1.02] transition-transform active:scale-95">XÁC NHẬN CHI</button>
        </div>
      </div>
    </div>
  );
};

export default AdminExpenses;
