
import React, { useState, useMemo } from 'react';
import { Order, Expense, OrderStatus, Table } from '../../types';
import { formatVND } from '../../utils/format';

interface AdminReportProps {
  orders: Order[];
  expenses: Expense[];
  tables: Table[];
  onSetOrders: (orders: Order[]) => void;
  onSetExpenses: (expenses: Expense[]) => void;
  onSetTables: (tables: Table[]) => void;
}

const AdminReport: React.FC<AdminReportProps> = ({ orders, expenses, tables }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0=T2, 6=CN
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate.toISOString().split('T')[0]);
    setShowCalendar(false);
  };

  // Hàm hỗ trợ lấy ngày tiếng Việt
  const formatDateVN = (dateStr: string) => {
    const d = new Date(dateStr);
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  };

  const { filteredOrders, filteredExpenses, stats, periodLabel } = useMemo(() => {
    const target = new Date(selectedDate);
    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

    let startTime = startOfDay;
    let endTime = startOfDay + 86400000;
    let label = `Ngày ${target.getDate()}/${target.getMonth() + 1}`;

    if (period === 'week') {
      startTime = endTime - (7 * 86400000);
      const startD = new Date(startTime);
      label = `Từ ${startD.getDate()}/${startD.getMonth() + 1} đến ${target.getDate()}/${target.getMonth() + 1}`;
    } else if (period === 'month') {
      startTime = new Date(target.getFullYear(), target.getMonth(), 1).getTime();
      endTime = new Date(target.getFullYear(), target.getMonth() + 1, 1).getTime();
      label = `Tháng ${target.getMonth() + 1}/${target.getFullYear()}`;
    }

    const fOrders = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return o.status === OrderStatus.PAID && t >= startTime && t < endTime;
    });

    const fExpenses = expenses.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= startTime && t < endTime;
    });

    const rev = fOrders.reduce((a, b) => a + b.totalAmount, 0);
    const exp = fExpenses.reduce((a, b) => a + b.amount, 0);

    return {
      filteredOrders: fOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      filteredExpenses: fExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      stats: { rev, exp, profit: rev - exp },
      periodLabel: label
    };
  }, [orders, expenses, selectedDate, period]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* BỘ LỌC THỜI GIAN - TỰ XÂY DỰNG ĐỂ KHÔNG BỊ TIẾNG NHẬT */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
          <div className="flex flex-col gap-1 w-full sm:w-auto relative">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Mốc thời gian gốc</label>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="bg-gray-50 border-2 border-transparent hover:border-[#C2A383]/50 rounded-2xl px-6 py-4 font-black text-sm text-[#4B3621] outline-none transition-all flex items-center gap-3 shadow-inner"
              >
                <i className="fas fa-calendar-alt text-[#C2A383]"></i>
                {new Date(selectedDate).toLocaleDateString('vi-VN')}
              </button>

              {showCalendar && (
                <div className="absolute top-full left-0 mt-4 z-[300] bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 w-[320px] animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={handlePrevMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383] hover:bg-[#C2A383] hover:text-white transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
                    <span className="text-[11px] font-black text-[#4B3621] uppercase tracking-widest">Tháng {viewDate.getMonth() + 1} / {viewDate.getFullYear()}</span>
                    <button type="button" onClick={handleNextMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383] hover:bg-[#C2A383] hover:text-white transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                      <div key={d} className="text-center text-[7px] font-black text-gray-300 uppercase py-2 tracking-tighter">{d}</div>
                    ))}
                    {Array.from({ length: firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
                      const day = i + 1;
                      const isSelected = new Date(selectedDate).getDate() === day && new Date(selectedDate).getMonth() === viewDate.getMonth() && new Date(selectedDate).getFullYear() === viewDate.getFullYear();
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleSelectDay(day)}
                          className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all flex items-center justify-center ${isSelected ? 'bg-[#4B3621] text-white shadow-lg' : 'hover:bg-[#C2A383]/10 text-[#4B3621]'
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setShowCalendar(false)} className="w-full py-3 bg-gray-50 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-400 transition-all">Đóng</button>
                </div>
              )}

              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setViewDate(new Date(today));
                }}
                className="bg-[#C2A383]/10 text-[#C2A383] px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-[#C2A383] hover:text-white transition-all shadow-sm"
              >
                HÔM NAY
              </button>
            </div>
          </div>

          <div className="h-12 w-px bg-gray-100 hidden sm:block mx-2"></div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Phạm vi báo cáo</label>
            <div className="bg-gray-50 p-1.5 rounded-[22px] flex gap-1 shadow-inner">
              {[
                { id: 'day', label: 'Xem 1 Ngày' },
                { id: 'week', label: 'Xem 7 Ngày' },
                { id: 'month', label: 'Xem 1 Tháng' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase transition-all ${period === p.id ? 'bg-[#4B3621] text-white shadow-lg' : 'text-gray-400 hover:text-[#4B3621]'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Đang hiển thị dữ liệu</p>
            <h4 className="text-lg font-black text-[#C2A383] uppercase tracking-tighter italic">{periodLabel}</h4>
            <p className="text-[9px] font-bold text-gray-400 mt-1">{filteredOrders.length} đơn • {filteredExpenses.length} chi phí</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#C2A383] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            LÀM MỚI
          </button>
        </div>
      </div>

      {/* THẺ CHỈ SỐ LỚN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[56px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><i className="fas fa-arrow-down"></i></span>
              TỔNG THU
            </p>
            <h3 className="text-4xl lg:text-5xl font-black text-emerald-600 tracking-tighter">{formatVND(stats.rev)}đ</h3>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[56px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner"><i className="fas fa-arrow-up"></i></span>
              TỔNG CHI
            </p>
            <h3 className="text-4xl lg:text-5xl font-black text-red-500 tracking-tighter">{formatVND(stats.exp)}đ</h3>
          </div>
        </div>

        <div className="bg-[#4B3621] p-10 rounded-[56px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#C2A383] shadow-inner"><i className="fas fa-vault"></i></span>
              LỢI NHUẬN
            </p>
            <h3 className={`text-4xl lg:text-5xl font-black tracking-tighter ${stats.profit >= 0 ? 'text-[#C2A383]' : 'text-red-400'}`}>
              {formatVND(stats.profit)}đ
            </h3>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CHI TIẾT SẮP XẾP THEO THỜI GIAN */}
      <div className="bg-white rounded-[56px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center bg-[#FAF9F6]">
          <h4 className="font-black text-[#4B3621] uppercase text-lg tracking-tighter">Nhật ký thu chi chi tiết</h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Sắp xếp theo thời gian mới nhất</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-12 py-6">Thời gian</th>
                <th className="px-6 py-6">Phân loại</th>
                <th className="px-6 py-6">Nội dung giao dịch</th>
                <th className="px-12 py-6 text-right">Giá trị (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ...filteredOrders.map(o => ({ ...o, type: 'IN' as const, time: o.createdAt })),
                ...filteredExpenses.map(e => ({ ...e, type: 'OUT' as const, time: e.date }))
              ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((item: any, idx) => (
                <tr key={idx} className="group hover:bg-gray-50 transition-all">
                  <td className="px-12 py-7">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[#4B3621]">{new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-1">{new Date(item.time).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border ${item.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {item.type === 'IN' ? 'Thu nhập' : 'Chi phí'}
                    </span>
                  </td>
                  <td className="px-6 py-7">
                    <span className="text-[15px] font-black text-[#4B3621]">
                      {item.type === 'IN' ? (
                        item.tableId === 'MANG_VE'
                          ? 'Khách lẻ mang về'
                          : `${tables.find(t => t.id === item.tableId)?.name || `Bàn ${item.tableId}`}`
                      ) : item.description}
                    </span>
                  </td>
                  <td className={`px-12 py-7 text-right font-black text-xl tracking-tighter ${item.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.type === 'IN' ? '+' : '-'}{formatVND(item.totalAmount || item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(filteredOrders.length === 0 && filteredExpenses.length === 0) && (
            <div className="py-32 text-center bg-gray-50/20">
              <p className="text-gray-300 font-black uppercase tracking-[0.3em] text-sm">Chưa có dữ liệu giao dịch trong phạm vi này</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReport;
