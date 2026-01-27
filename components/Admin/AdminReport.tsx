
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
  // Fix Date Timezone bug: Use local date construction
  const getLocalDateStr = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [startDate, setStartDate] = useState(getLocalDateStr());
  const [endDate, setEndDate] = useState(getLocalDateStr());
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
    // Fixed: Construct YYYY-MM-DD directly to avoid UTC shift
    const newDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(newDateStr);
    setShowCalendar(false);
  };

  // Hàm hỗ trợ lấy ngày tiếng Việt
  const formatDateVN = (dateStr: string) => {
    const d = new Date(dateStr);
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  };

  const { filteredOrders, filteredExpenses, stats, periodLabel } = useMemo(() => {
    let startTime: number;
    let endTime: number;
    let label = '';

    if (period === 'custom') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() + 86400000; // End of the day
      label = `Từ ${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()} đến ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    } else {
      const target = new Date(selectedDate);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

      startTime = startOfDay;
      endTime = startOfDay + 86400000;
      label = `Ngày ${target.getDate()}/${target.getMonth() + 1}`;

      if (period === 'week') {
        startTime = endTime - (7 * 86400000);
        const startD = new Date(startTime);
        label = `Từ ${startD.getDate()}/${startD.getMonth() + 1} đến ${target.getDate()}/${target.getMonth() + 1}`;
      } else if (period === 'month') {
        startTime = new Date(target.getFullYear(), target.getMonth(), 1).getTime();
        endTime = new Date(target.getFullYear(), target.getMonth() + 1, 1).getTime();
        label = `Tháng ${target.getMonth() + 1}/${target.getFullYear()}`;
      }
    }

    const fOrders = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return o.status === OrderStatus.PAID && t >= startTime && t < endTime;
    });

    const fExpenses = expenses.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= startTime && t < endTime;
    });

    const rev = fOrders.reduce((a, b) => a + (b.totalAmount - (b.discountAmount || 0)), 0);
    const exp = fExpenses.reduce((a, b) => a + b.amount, 0);

    return {
      filteredOrders: fOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      filteredExpenses: fExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      stats: { rev, exp, profit: rev - exp },
      periodLabel: label
    };
  }, [orders, expenses, selectedDate, period, startDate, endDate]);

  const downloadCSV = () => {
    // 1. Define Columns (Added 'Loại', Removed 'Mã Đơn')
    const headers = ['Ngày', 'Loại', 'Bàn/Khu vực', 'Chi tiết món', 'Hình thức TT', 'Thực thu (VNĐ)', 'Giảm giá (VNĐ)'];

    // 2. Format Data (Combine Orders and Expenses)
    const combinedData = [
      ...filteredOrders.map(o => ({ ...o, type: 'IN' as const, time: o.createdAt })),
      ...filteredExpenses.map(e => ({ ...e, type: 'OUT' as const, time: e.date }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const rows = combinedData.map((item: any) => {
      const d = new Date(item.time);
      const dateStr = d.toLocaleDateString('vi-VN');

      // Determine columns based on type
      const typeStr = item.type === 'IN' ? 'Thu' : 'Chi';

      let tableInfo = '';
      let descStr = '';
      let payment = '';
      let amount = 0;

      if (item.type === 'IN') {
        tableInfo = item.tableId === 'MANG_VE' ? 'Mang về' : (tables.find(t => t.id === item.tableId)?.name || item.tableId);
        descStr = item.items.map((i: any) => `${i.productName} (${i.quantity})`).join(', ');
        payment = item.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt';
        amount = item.totalAmount;
      } else {
        tableInfo = '-';
        descStr = item.description;
        payment = '-';
        amount = item.amount;
      }

      return [
        dateStr,
        typeStr,
        tableInfo,
        `"${descStr}"`, // Quote to handle commas
        payment,
        item.type === 'IN' ? (item.totalAmount - (item.discountAmount || 0)) : item.amount,
        item.type === 'IN' ? (item.discountAmount || 0) : ''
      ].join(',');
    });

    // 3. Create CSV Content (with BOM for Excel UTF-8)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const fileName = period === 'custom'
      ? `baocao-doanhthu-${startDate}-den-${endDate}.csv`
      : `baocao-doanhthu-${selectedDate}.csv`;

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!orders || !expenses) return <div>Đang tải dữ liệu báo cáo...</div>;

  return (
    <div className="h-full flex flex-col gap-4 p-2 md:p-0" style={{ minHeight: '500px' }}>

      {/* MOBILE TOP SECTION (Compact) */}
      <div className="md:hidden shrink-0 space-y-3">
        {/* Mobile Controls: Period & Date */}
        <div className="bg-white p-3 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between gap-2">
          {/* Period Toggle */}
          <div className="flex bg-gray-50 rounded-xl p-1 shrink-0 overflow-x-auto">
            {[
              { id: 'day', label: 'Ngày' },
              { id: 'week', label: 'Tuần' },
              { id: 'month', label: 'Tháng' },
              { id: 'custom', label: 'Tùy chọn' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap font-black uppercase transition-all ${period === p.id ? 'bg-white text-[#4B3621] shadow-sm' : 'text-gray-400'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date & Calendar Trigger */}
          {period !== 'custom' ? (
            <div className="relative flex-1">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full flex items-center justify-center gap-2 text-[#4B3621] font-black text-sm"
              >
                <span>{new Date(selectedDate).toLocaleDateString('vi-VN')}</span>
                <i className="fas fa-chevron-down text-[10px] text-[#C2A383]"></i>
              </button>
              {/* Mobile Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-full right-0 mt-2 z-[300] bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 w-[280px] animate-slide-up">
                  <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={handlePrevMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383]"><i className="fas fa-chevron-left text-[10px]"></i></button>
                    <span className="text-[11px] font-black text-[#4B3621] uppercase">{viewDate.getMonth() + 1}/{viewDate.getFullYear()}</span>
                    <button type="button" onClick={handleNextMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383]"><i className="fas fa-chevron-right text-[10px]"></i></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="text-center text-[8px] font-black text-gray-300 py-1">{d}</div>)}
                    {Array.from({ length: firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
                      const day = i + 1;
                      const isSelected = new Date(selectedDate).getDate() === day && new Date(selectedDate).getMonth() === viewDate.getMonth() && new Date(selectedDate).getFullYear() === viewDate.getFullYear();
                      return (
                        <button key={day} type="button" onClick={() => handleSelectDay(day)} className={`aspect-square rounded-lg text-[10px] font-black flex items-center justify-center ${isSelected ? 'bg-[#4B3621] text-white' : 'hover:bg-gray-50 text-gray-600'}`}>{day}</button>
                      );
                    })}
                  </div>
                  <button onClick={() => { const today = getLocalDateStr(); setSelectedDate(today); setViewDate(new Date(today)); setShowCalendar(false); }} className="w-full py-2 bg-[#C2A383]/10 text-[#C2A383] rounded-xl text-[9px] font-black uppercase">Hôm nay</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Từ:</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-bold text-[#4B3621] outline-none text-right w-20" />
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-1">
                <span className="text-gray-400">Đến:</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-bold text-[#4B3621] outline-none text-right w-20" />
              </div>
            </div>
          )}



          <div className="flex gap-2 shrink-0">
            <button
              onClick={downloadCSV}
              className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"
              title="Xuất Excel"
            >
              <i className="fas fa-file-csv text-xs"></i>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100"
            >
              <i className="fas fa-sync-alt text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* Mobile Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-3 rounded-[20px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase mb-1">Tổng thu</span>
            <span className="text-sm font-black text-emerald-600 tracking-tight">{formatVND(stats.rev)}</span>
          </div>
          <div className="bg-white p-3 rounded-[20px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase mb-1">Tổng chi</span>
            <span className="text-sm font-black text-red-500 tracking-tight">{formatVND(stats.exp)}</span>
          </div>
          <div className="bg-[#4B3621] p-3 rounded-[20px] shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-white/50 uppercase mb-1">Lãi ròng</span>
            <span className="text-sm font-black text-[#C2A383] tracking-tight">{formatVND(stats.profit)}</span>
          </div>
        </div>
      </div>

      {/* DESKTOP SECTION */}
      <div className="hidden md:flex shrink-0 flex-col xl:flex-row gap-4">

        {/* LEFT: Date & View Controls */}
        <div className="xl:w-1/3 bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between gap-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian hiển thị</label>
            <div className="flex gap-2">
              <button
                onClick={downloadCSV}
                className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center gap-2 transition-all font-bold text-[10px] uppercase tracking-wide"
                title="Xuất file Excel"
              >
                <i className="fas fa-file-csv text-lg"></i> Xuất Excel
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:bg-[#C2A383] hover:text-white flex items-center justify-center transition-all"
                title="Làm mới dữ liệu"
              >
                <i className="fas fa-sync-alt text-xs"></i>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Period Selector */}
            <div className="bg-gray-50 p-1 rounded-2xl flex relative">
              {[
                { id: 'day', label: 'Ngày' },
                { id: 'week', label: 'Tuần' },
                { id: 'month', label: 'Tháng' },
                { id: 'custom', label: 'Tùy chọn' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase transition-all z-10 ${period === p.id ? 'bg-white text-[#4B3621] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Picker / Range Picker */}
            <div className="relative">
              {period !== 'custom' ? (
                <>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full bg-[#FAF9F6] border border-gray-100 hover:border-[#C2A383] rounded-2xl px-4 py-3 font-black text-lg text-[#4B3621] outline-none transition-all flex items-center justify-between group"
                  >
                    <span>{new Date(selectedDate).toLocaleDateString('vi-VN')}</span>
                    <i className="fas fa-calendar-alt text-[#C2A383] group-hover:scale-110 transition-transform"></i>
                  </button>

                  {showCalendar && (
                    <div className="absolute top-full left-0 mt-2 z-[300] bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 w-full animate-slide-up">
                      <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={handlePrevMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383] hover:bg-[#C2A383] hover:text-white transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
                        <span className="text-[11px] font-black text-[#4B3621] uppercase tracking-widest">{viewDate.getMonth() + 1} / {viewDate.getFullYear()}</span>
                        <button type="button" onClick={handleNextMonth} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#C2A383] hover:bg-[#C2A383] hover:text-white transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                          <div key={d} className="text-center text-[8px] font-black text-gray-300 uppercase py-1">{d}</div>
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
                              className={`aspect-square rounded-lg text-[10px] font-black transition-all flex items-center justify-center ${isSelected ? 'bg-[#4B3621] text-white shadow-md' : 'hover:bg-[#C2A383]/10 text-gray-600'
                                }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          const today = getLocalDateStr();
                          setSelectedDate(today);
                          setViewDate(new Date(today));
                          setShowCalendar(false);
                        }}
                        className="w-full py-2.5 bg-[#C2A383]/10 text-[#C2A383] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#C2A383] hover:text-white transition-all"
                      >
                        Hôm nay
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Từ ngày</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#FAF9F6] border border-gray-100 rounded-2xl px-3 py-2 font-bold text-sm text-[#4B3621] outline-none focus:border-[#C2A383]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Đến ngày</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[#FAF9F6] border border-gray-100 rounded-2xl px-3 py-2 font-bold text-sm text-[#4B3621] outline-none focus:border-[#C2A383]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Key Metrics */}
        <div className="xl:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <i className="fas fa-coins text-6xl text-emerald-500 transform rotate-12"></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng thu</p>
            <h3 className="text-3xl lg:text-4xl font-black text-emerald-600 tracking-tighter">{formatVND(stats.rev)}</h3>
            <p className="text-[10px] font-bold text-emerald-600/60 mt-2 flex items-center gap-1">
              <i className="fas fa-arrow-up"></i> {filteredOrders.length} đơn hàng
            </p>
          </div>

          {/* Expense */}
          <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <i className="fas fa-receipt text-6xl text-red-500 transform -rotate-12"></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng chi</p>
            <h3 className="text-3xl lg:text-4xl font-black text-red-500 tracking-tighter">{formatVND(stats.exp)}</h3>
            <p className="text-[10px] font-bold text-red-500/60 mt-2 flex items-center gap-1">
              <i className="fas fa-arrow-down"></i> {filteredExpenses.length} khoản chi
            </p>
          </div>

          {/* Profit */}
          <div className="bg-[#4B3621] p-5 rounded-[32px] shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors"></div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Lợi nhuận ròng</p>
            <h3 className={`text-3xl lg:text-4xl font-black tracking-tighter relative z-10 ${stats.profit >= 0 ? 'text-[#C2A383]' : 'text-red-400'}`}>
              {formatVND(stats.profit)}
            </h3>
            <p className="text-[9px] font-bold text-white/40 mt-2 uppercase tracking-wide">
              {periodLabel}
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: DATA TABLE (Fills remaining height) */}
      <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-[#FAF9F6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center">
              <i className="fas fa-list text-xs"></i>
            </div>
            <h4 className="font-black text-[#4B3621] uppercase text-sm tracking-widest">Chi tiết giao dịch</h4>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">{filteredOrders.length + filteredExpenses.length} dòng dữ liệu</span>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white ring-1 ring-gray-50">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm w-32 border-b border-gray-100/50">Thời gian</th>
                <th className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm w-32 text-center border-b border-gray-100/50">Loại</th>
                <th className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm text-right border-b border-gray-100/50 w-48">Giá trị</th>
                <th className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm text-left border-b border-gray-100/50">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ...filteredOrders.map(o => ({ ...o, type: 'IN' as const, time: o.createdAt })),
                ...filteredExpenses.map(e => ({ ...e, type: 'OUT' as const, time: e.date }))
              ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((item: any, idx) => (
                <tr key={idx} className="group hover:bg-[#FAF9F6] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-black text-[#4B3621]">{new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[9px] font-bold text-gray-300 block mt-0.5">{new Date(item.time).toLocaleDateString('vi-VN')}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${item.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                      <i className={`fas ${item.type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[8px]`}></i>
                      {item.type === 'IN' ? 'Thu' : 'Chi'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-black text-lg tracking-tighter ${item.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                    <div className="flex flex-col items-end">
                      <span>{item.type === 'IN' ? '+' : '-'}{formatVND(item.type === 'IN' ? (item.totalAmount - (item.discountAmount || 0)) : (item.amount || 0))}</span>
                      {item.type === 'IN' && item.discountAmount && item.discountAmount > 0 && (
                        <span className="text-[9px] font-bold text-red-500 line-through opacity-50">{formatVND(item.totalAmount)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <p className="text-sm font-bold text-[#4B3621] line-clamp-1">
                      {item.type === 'IN' ? (
                        item.tableId === 'MANG_VE' ? 'Khách mang về' : `${tables.find(t => t.id === item.tableId)?.name || `Bàn ${item.tableId}`}`
                      ) : item.description}
                    </p>
                    {item.type === 'IN' && (
                      <p className="text-[10px] text-gray-400 truncate max-w-xs">{item.items?.map((i: any) => i.productName).join(', ')}</p>
                    )}
                  </td>
                </tr>
              ))}
              {(filteredOrders.length === 0 && filteredExpenses.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-2xl">
                        <i className="fas fa-inbox"></i>
                      </div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Không có dữ liệu trong khoảng thời gian này</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div >
    </div >
  );
};

export default AdminReport;
