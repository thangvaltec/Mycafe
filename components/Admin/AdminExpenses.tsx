
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to open form (Edit or Add)
  const openForm = () => {
    // Scroll to top of the scrollable container or window to show the form
    const container = document.querySelector('.admin-scroll');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEdit = (ex: Expense) => {
    setEditingId(ex.id);
    setDesc(ex.description);
    setAmountStr(ex.amount.toString());
    openForm();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDesc('');
    setAmountStr('');
  };

  const handleSubmit = async () => {
    const amount = parseVND(amountStr);
    if (!desc || amount <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        const existing = expenses.find(e => e.id === editingId);
        if (existing) {
          // Cast to any to await existing async handler from App.tsx
          await (onUpdateExpense as any)({
            ...existing,
            description: desc,
            amount: amount
          });
        }
        setEditingId(null);
      } else {
        // Add
        await (onAddExpense as any)({
          description: desc,
          amount: amount,
          date: new Date().toISOString()
        });
      }
      setDesc('');
      setAmountStr('');
      // Close modal on success - removed as strictly inline now
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Có lỗi xảy ra khi lưu chi phí");
    } finally {
      setIsSubmitting(false);
    }
  };

  // The Form JSX - extracted for reuse/cleanliness
  const renderForm = () => (
    <div className="space-y-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#4B3621] uppercase tracking-tighter flex items-center gap-2">
          {editingId ? <i className="fas fa-edit text-blue-500"></i> : <i className="fas fa-plus-circle text-[#C2A383]"></i>}
          {editingId ? 'Sửa chi phí' : 'Thêm mới'}
        </h3>
        {/* Cancel Edit Button for Desktop/Mobile */}
        {editingId && (
          <button onClick={() => { setEditingId(null); setDesc(''); setAmountStr(''); }} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-black uppercase hover:bg-gray-200 transition-colors">Hủy sửa</button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2 group">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-[#C2A383] transition-colors">Nội dung</label>
          <div className="relative">
            <i className="fas fa-comment-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#C2A383] transition-colors"></i>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="VD: Nhập đá, Mua ly..."
              className="w-full bg-[#FAF9F6] border border-transparent rounded-2xl py-4 pl-12 pr-4 font-bold text-[#4B3621] outline-none focus:bg-white focus:border-[#C2A383] focus:shadow-lg transition-all placeholder-gray-300"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-red-500 transition-colors">Số tiền</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs group-focus-within:text-red-500 transition-colors">VNĐ</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={e => setAmountStr(handleMoneyInput(e.target.value))}
              placeholder="0"
              className="w-full bg-[#FAF9F6] border border-transparent rounded-2xl py-4 pl-14 pr-4 font-black text-2xl text-red-500 outline-none focus:bg-white focus:border-red-200 focus:shadow-lg transition-all placeholder-gray-200"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!desc || !parseVND(amountStr) || isSubmitting}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4
                    ${editingId
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              : 'bg-[#4B3621] text-white hover:bg-[#3E2C1B] shadow-[#4B3621]/30 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed'}`}
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner animate-spin"></i> Đang lưu...</>
          ) : (
            <>{editingId ? 'Cập nhật' : 'Xác nhận chi'} <i className="fas fa-arrow-right"></i></>
          )}
        </button>
      </div>
    </div>
  );

  // Compact Mobile Form
  const renderMobileForm = () => (
    <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
      {/* Description Input */}
      <div className="relative">
        <i className="fas fa-comment-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Nhập nội dung chi..."
          className="w-full bg-[#FAF9F6] border border-transparent rounded-xl py-3 pl-10 pr-4 font-bold text-[#4B3621] text-sm outline-none focus:bg-white focus:border-[#C2A383] focus:shadow-sm transition-all placeholder-gray-300"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3">
        {/* Amount Input */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">đ</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountStr}
            onChange={e => setAmountStr(handleMoneyInput(e.target.value))}
            placeholder="0"
            className="w-full bg-[#FAF9F6] border border-transparent rounded-xl py-3 pl-8 pr-4 font-black text-lg text-red-500 outline-none focus:bg-white focus:border-red-200 focus:shadow-sm transition-all placeholder-gray-200"
            disabled={isSubmitting}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={!desc || !parseVND(amountStr) || isSubmitting}
          className={`px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-2
                    ${editingId
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              : 'bg-[#4B3621] text-white hover:bg-[#3E2C1B] shadow-[#4B3621]/30 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed'}`}
        >
          {isSubmitting ? (
            <i className="fas fa-spinner animate-spin"></i>
          ) : (
            <><i className={`fas ${editingId ? 'fa-save' : 'fa-plus'}`}></i> {editingId ? 'Lưu' : 'Thêm'}</>
          )}
        </button>

        {editingId && (
          <button
            onClick={handleCancelEdit}
            className="w-12 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in pb-2 md:pb-0 relative">

      {/* Header Summary Card */}
      <div className="bg-white p-4 md:p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 relative overflow-hidden group shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <i className="fas fa-coins text-8xl text-red-500 -rotate-12"></i>
        </div>

        <div className="flex items-center gap-4 md:gap-6 w-full">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-red-50 text-red-500 flex items-center justify-center text-xl md:text-2xl shadow-sm transform group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-file-invoice-dollar"></i>
          </div>
          <div className="flex-1">
            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tổng chi phí</p>
            <h2 className="text-2xl md:text-4xl font-black text-[#4B3621] tracking-tighter counter-value">
              -{formatVND(expenses.reduce((a, b) => a + b.amount, 0))}
            </h2>
          </div>
        </div>
      </div>

      {/* Mobile Form - ALWAYS VISIBLE - Compact */}
      <div className="md:hidden shrink-0">
        {renderMobileForm()}
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0">

        {/* Left: Expense History List */}
        <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-[#FAF9F6]/50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-[#4B3621]"></div>
              <h3 className="text-lg font-black text-[#4B3621] uppercase tracking-tighter">Lịch sử chi tiêu</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">{expenses.length} Giao dịch</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
            {expenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
                  <i className="fas fa-file-invoice text-4xl text-gray-300"></i>
                </div>
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Chưa có dữ liệu</p>
              </div>
            ) : (
              expenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((ex) => (
                  <div key={ex.id} id={`expense-${ex.id}`} className={`group relative bg-white p-3 rounded-[20px] border border-gray-100 hover:border-[#C2A383] hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 ${editingId === ex.id ? 'ring-2 ring-[#C2A383] bg-orange-50/10' : ''}`}>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#4B3621] text-sm leading-tight truncate group-hover:text-[#C2A383] transition-colors">{ex.description}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <i className="fas fa-clock text-[9px] text-gray-300"></i>
                        <span className="text-[9px] font-bold text-gray-400 truncate">
                          {new Date(ex.date).toLocaleDateString('vi-VN')} - {new Date(ex.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-black text-red-500 tracking-tight whitespace-nowrap">-{formatVND(ex.amount)}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEdit(ex)}
                          className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Sửa"
                        >
                          <i className="fas fa-pen text-[10px]"></i>
                        </button>
                        <button
                          onClick={() => onDeleteExpense(ex.id)}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Xóa"
                        >
                          <i className="fas fa-trash text-[10px]"></i>
                        </button>
                      </div>
                    </div>

                  </div>
                ))
            )}
          </div>
        </div>

        {/* Desktop: Static Form Column (Hidden on Mobile) */}
        <div className="hidden md:block w-[380px] shrink-0">
          <div className={`bg-white p-8 rounded-[32px] border shadow-xl sticky top-6 transition-all duration-300 ${editingId ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}>
            {renderForm()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminExpenses;

