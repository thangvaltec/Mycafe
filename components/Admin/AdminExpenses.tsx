
import React, { useState } from 'react';
import { Expense } from '../../types';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminExpensesProps {
  expenses: Expense[];
  onAddExpense: (e: Partial<Expense>) => void;
  onUpdateExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const AdminExpenses: React.FC<AdminExpensesProps> = ({ expenses, onAddExpense, onUpdateExpense, onDeleteExpense }) => {
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = () => {
    const amount = parseVND(amountStr);
    if (!desc || amount <= 0) return;

    if (editingId) {
      // Update
      const existing = expenses.find(e => e.id === editingId);
      if (existing) {
        onUpdateExpense({
          ...existing,
          description: desc,
          amount: amount
        });
      }
      setEditingId(null);
    } else {
      // Add
      onAddExpense({
        description: desc,
        amount: amount,
        date: new Date().toISOString()
      });
    }
    setDesc('');
    setAmountStr('');
  };

  const handleEdit = (ex: Expense) => {
    setEditingId(ex.id);
    setDesc(ex.description);
    setAmountStr(ex.amount.toString());
    // Scroll to form on mobile if needed? With flex-col-reverse form is at top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDesc('');
    setAmountStr('');
  };

  return (
    <div className="h-full flex flex-col-reverse xl:flex-row gap-6 xl:gap-8 animate-fade-in pb-20">

      {/* Cột Trái: Lịch sử (Trên mobile sẽ nằm dưới) */}
      <div className="flex-1 flex flex-col bg-white rounded-[32px] md:rounded-[48px] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-[#FAF9F6]">
          <h3 className="text-lg md:text-xl font-black text-[#4B3621] uppercase tracking-tighter">Lịch sử chi tiêu</h3>
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
            <span className="text-xs md:text-sm font-black text-red-500">-{formatVND(expenses.reduce((a, b) => a + b.amount, 0))}đ</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto admin-scroll p-4 md:p-6 space-y-3">
          {expenses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
              <i className="fas fa-receipt text-4xl text-gray-200 mb-2"></i>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Chưa có khoản chi nào</p>
            </div>
          ) : expenses.map(ex => (
            <div key={ex.id}
              className={`flex justify-between items-center p-4 md:p-5 rounded-[24px] border transition-all group shadow-sm relative ${editingId === ex.id ? 'bg-[#4B3621] text-white border-[#4B3621]' : 'bg-white hover:bg-[#FAF7F2] border-gray-100'}`}>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-colors border ${editingId === ex.id ? 'bg-white/10 text-[#C2A383] border-white/5' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                  <i className={`fas ${editingId === ex.id ? 'fa-pen' : 'fa-file-invoice-dollar'}`}></i>
                </div>
                <div>
                  <p className={`font-bold text-sm md:text-base leading-tight ${editingId === ex.id ? 'text-white' : 'text-[#4B3621]'}`}>{ex.description}</p>
                  <p className={`text-[9px] md:text-[10px] font-black uppercase mt-1 tracking-wider ${editingId === ex.id ? 'text-white/40' : 'text-gray-400'}`}>{new Date(ex.date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                <span className={`font-black text-sm md:text-lg ${editingId === ex.id ? 'text-[#C2A383]' : 'text-red-500'}`}>-{formatVND(ex.amount)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(ex)}
                    className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase flex items-center gap-1 transition-colors ${editingId === ex.id ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                  >
                    <i className="fas fa-pen"></i> Sửa
                  </button>
                  <button
                    onClick={() => onDeleteExpense(ex.id)}
                    className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase flex items-center gap-1 transition-colors ${editingId === ex.id ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500'}`}
                  >
                    <i className="fas fa-trash"></i> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cột Phải: Form Thêm (Trên mobile sẽ nằm trên) */}
      <div className="w-full xl:w-[400px] shrink-0">
        <div className={`bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-8 shadow-xl border sticky relative overflow-hidden transition-colors ${editingId ? 'border-[#4B3621] ring-4 ring-[#4B3621]/10' : 'border-[#D4A373]/20'} xl:top-6 top-0`}>
          {/* Decorative BG */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A373]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative z-10">
            <h4 className="text-xl font-black text-[#4B3621] mb-6 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className={`w-2 h-8 rounded-full transition-colors ${editingId ? 'bg-[#4B3621]' : 'bg-[#C2A383]'}`}></span>
                {editingId ? 'Sửa khoản chi' : 'Ghi khoản chi'}
              </span>
              {editingId && (
                <button onClick={handleCancelEdit} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-1.5 rounded-lg uppercase font-black transition-colors">Hủy</button>
              )}
            </h4>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Nội dung chi</label>
                <input
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="VD: Mua đá, Trả tiền điện..."
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] px-6 py-4 font-bold text-[#4B3621] outline-none focus:bg-white focus:border-[#C2A383] focus:shadow-lg transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Số tiền (VNĐ)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountStr}
                    onChange={e => setAmountStr(handleMoneyInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] px-6 py-4 font-black text-3xl text-red-500 outline-none focus:bg-white focus:border-red-200 focus:shadow-lg transition-all"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">VNĐ</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!desc || !amountStr}
                className={`w-full text-white py-5 rounded-[28px] font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 ${editingId ? 'bg-[#4B3621] hover:bg-black' : 'bg-[#4B3621] hover:bg-[#5D4037]'}`}
              >
                {editingId ? <><i className="fas fa-save"></i> LƯU THAY ĐỔI</> : <><i className="fas fa-plus-circle"></i> XÁC NHẬN</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExpenses;
