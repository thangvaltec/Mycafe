
import React, { useState, useMemo, useRef } from 'react';
import { Product, Category, Order, OrderItem, OrderStatus, Table, BilliardSession } from '../types';
import { formatVND, getImageUrl } from '../utils/format';
import { api } from '../services/api';

interface CustomerViewProps {
  table: Table;
  products: Product[];
  categories: Category[];
  activeOrder?: Order;
  onPlaceOrder: (items: OrderItem[]) => void;
  compact?: boolean;
  onSwitchToAdmin?: () => void;
  onBackToTableList?: () => void;
  isAdmin?: boolean;
  onRemoveItem?: (itemId: string) => void;
}

const CustomerView: React.FC<CustomerViewProps> = ({
  table, products, categories, activeOrder, onPlaceOrder, compact, onSwitchToAdmin, onBackToTableList, isAdmin, onRemoveItem
}) => {
  // Initialize from LocalStorage
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem(`cart_table_${table.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Save to LocalStorage on change
  React.useEffect(() => {
    localStorage.setItem(`cart_table_${table.id}`, JSON.stringify(selectedItems));
  }, [selectedItems, table.id]);

  // ... (rest of states) ...
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id || '');
  const [showSheet, setShowSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const historyRef = useRef<HTMLDivElement>(null);

  const [billiardSession, setBilliardSession] = useState<BilliardSession | null>(null);
  const [durationStr, setDurationStr] = useState('');

  // Fetch Billiard Session Loop
  React.useEffect(() => {
    const isBilliard = table.alias === 'Bi-a' || (table.tableNumber && table.tableNumber.startsWith('BI-'));
    if (isBilliard) {
      const fetchSession = async () => {
        try {
          const sessions = await api.getBilliardSessions();
          const mySession = sessions.find(s => String(s.tableId) === String(table.id) && s.status === 'ACTIVE');
          if (mySession) setBilliardSession(mySession);
          else setBilliardSession(null);
        } catch (e) { }
      };
      fetchSession();
      const interval = setInterval(fetchSession, 15000);
      return () => clearInterval(interval);
    }
  }, [table]);

  // Timer Loop
  React.useEffect(() => {
    if (!billiardSession) return;
    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(billiardSession.startTime).getTime();
      const diff = now - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setDurationStr(`${h} giờ ${m} phút`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute to save CPU, user asked for clock but min precision is fine usually. 15s?
    // User said "tinh theo tung s/phut" in previous prompt. Let's do 10s.
    return () => clearInterval(interval);
  }, [billiardSession]);



  const itemCount = useMemo(() => Object.values(selectedItems).reduce((a: number, b) => a + (b as number), 0), [selectedItems]);
  const total = useMemo(() => Object.entries(selectedItems).reduce((acc: number, [pid, qty]) => {
    const p = products.find(prod => String(prod.id) === String(pid));
    return acc + (p ? p.price * (qty as number) : 0);
  }, 0), [selectedItems, products]);

  const scrollToCategory = (catId: string) => {
    setActiveCat(catId);
    const element = sectionRefs.current[catId];
    if (element) {
      // scrollIntoView is more reliable when the component is nested in a div.fixed.overflow-y-auto
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const update = (pid: string, delta: number) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      const val = (next[pid] || 0) + delta;
      if (val <= 0) delete next[pid];
      else next[pid] = val;
      return next;
    });
  };

  const handleSend = () => {
    if (itemCount === 0) return;
    const items: OrderItem[] = Object.entries(selectedItems).map(([pid, qty]) => {
      const p = products.find(prod => String(prod.id) === String(pid))!;
      return { productId: pid, productName: p.name, price: p.price, quantity: qty as number };
    });
    onPlaceOrder(items);
    setSelectedItems({}); // Clear cart
    localStorage.removeItem(`cart_table_${table.id}`); // Clear storage
    setShowSheet(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] relative max-w-[600px] mx-auto pb-32 animate-fade-in flex flex-col">
      {!compact && (
        <header className="bg-wood-gradient px-4 py-3 sticky top-0 z-[120] shadow-lg border-b border-white/10 flex justify-between items-center h-16 shrink-0">
          <div className="flex items-center gap-3">
            {onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="bg-[#C2A383] text-[#4B3621] w-9 h-9 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                title="Về trang Quản lý"
              >
                <i className="fas fa-user-shield text-xs"></i>
              </button>
            )}

            {onBackToTableList && (
              <button
                onClick={onBackToTableList}
                className="bg-[#F3F4F6] text-[#4B3621] px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
              >
                <i className="fas fa-th text-xs"></i>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Chọn bàn</span>
                <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">DS Bàn</span>
              </button>
            )}

            {!onSwitchToAdmin && !onBackToTableList && (
              <div className="w-9 h-9 bg-[#C2A383] rounded-xl flex items-center justify-center text-[#4B3621] text-lg font-black shadow-inner">B</div>
            )}

            <div className={`flex flex-col ${onSwitchToAdmin || onBackToTableList ? 'hidden sm:flex' : ''}`}>
              <h1 className="text-white text-xs font-black tracking-widest uppercase leading-none italic">Bống Cafe Sân Vườn-Billiard</h1>
              <p className="text-[#C2A383] text-[7px] font-bold uppercase tracking-[0.2em] mt-1">Rất hân hạnh được phục vụ quý khách</p>
              {billiardSession && (
                <div className="mt-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-600 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center w-fit animate-fade-in shadow-sm">
                  <i className="fas fa-stopwatch mr-1.5"></i> {durationStr}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeOrder && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 shadow-lg ${showHistory ? 'bg-[#C2A383] text-[#4B3621] border-transparent' : 'bg-white/10 text-white/80 border-white/20'
                  }`}
              >
                <i className="fas fa-history text-[11px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Lịch sử gọi món</span>
              </button>
            )}
            <div className="bg-[#C2A383] px-3 py-1.5 rounded-xl flex flex-col items-center min-w-[50px] shadow-lg">
              <span className="text-[#4B3621]/40 text-[6px] font-black uppercase tracking-widest leading-none">BÀN</span>
              <span className="text-[#4B3621] text-sm font-black leading-none mt-0.5">{table.name.replace('Bàn ', '')}</span>
            </div>
          </div>
        </header>
      )}

      {/* 2. CHỌN NHANH DANH MỤC (SẼ TRÔI ĐI KHI CUỘN) */}
      <section className="px-4 mt-6">
        <div className="bg-white p-3 rounded-[24px] shadow-sm border border-[#C2A383]/10">
          <div className="flex items-center gap-2 mb-5 px-1">
            <i className="fas fa-th-large text-[#C2A383] text-[10px]"></i>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn món nhanh</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 px-0.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`px-1.5 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider border text-center shadow-sm active:scale-95 whitespace-normal leading-tight h-auto min-h-[48px] flex items-center justify-center w-full ${activeCat === cat.id ? 'bg-[#C2A383] text-[#4B3621] border-transparent shadow-[#C2A383]/20 shadow-lg' : 'bg-[#FAF9F6] text-[#4B3621]/40 border-gray-100'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH MÓN ĂN */}
      <div className="px-4 mt-8 space-y-12">
        {/* Lịch sử đơn hiện tại - CHI TIẾT */}
        {/* Lịch sử đơn hiện tại - CHI TIẾT MODAL */}
        {activeOrder && showHistory && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
            <div className="relative bg-[#4B3621] p-1 rounded-[38px] shadow-2xl animate-slide-up ring-4 ring-[#C2A383]/10 w-full max-w-md mx-auto">
              <div className="bg-white p-6 rounded-[34px] border border-[#C2A383]/20 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-receipt text-[#C2A383] text-sm"></i>
                    <span className="text-[12px] font-black text-[#4B3621] uppercase tracking-tighter">Đơn đã gọi</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">Trạng thái</span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg">Đang phục vụ</span>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start group p-3.5 rounded-xl odd:bg-[#F5F0EB] even:bg-white border border-transparent hover:border-[#C2A383]/30 transition-colors mb-1">
                      <div className="flex gap-3">
                        {/* Admin Delete Action */}
                        {isAdmin && onRemoveItem && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Xóa món "${item.productName}" khỏi đơn?`)) {
                                onRemoveItem(String(item.id));
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors mr-1"
                            title="Xóa món"
                          >
                            <i className="fas fa-trash-alt text-[9px]"></i>
                          </button>
                        )}
                        <div className="w-6 h-6 rounded-lg bg-white text-[#4B3621] flex items-center justify-center font-black text-[10px] border border-gray-100 italic transition-transform group-hover:scale-110 shadow-sm">
                          {item.quantity}
                        </div>
                        <span className="text-[12px] font-black text-[#4B3621] leading-tight mt-0.5">{item.productName}</span>
                      </div>
                      <span className="text-[12px] font-black text-[#C2A383] tracking-tighter mt-0.5 whitespace-nowrap">{formatVND(item.price * item.quantity)}đ</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 shrink-0">
                  <div className="flex justify-between items-center px-1">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tổng cộng hóa đơn</span>
                      <p className="text-[8px] text-gray-400 font-medium italic">Vui lòng thanh toán tại quầy khi ra về</p>
                    </div>
                    <span className="text-3xl font-black text-[#4B3621] tracking-tighter">{formatVND(activeOrder.totalAmount || 0)}đ</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full mt-6 py-4 bg-[#4B3621] text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-[#3E2C1B] transition-colors shrink-0 shadow-lg active:scale-95"
                >
                  Đóng lịch sử
                </button>
              </div>
            </div>
          </div>
        )}

        {categories.map(cat => (
          <div key={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }} className="space-y-4 scroll-mt-20 lg:scroll-mt-28">
            <div className="flex items-center gap-2.5 px-2">
              <span className="w-1.5 h-4 bg-[#C2A383] rounded-full"></span>
              <h2 className="text-[13px] font-black text-[#4B3621] uppercase tracking-[0.15em] italic">{cat.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {products.filter(p => p.isActive && p.categoryId === cat.id).map(p => (
                <div key={p.id} className="bg-white rounded-[32px] p-3 shadow-sm border border-gray-50 flex flex-col group transition-all active:scale-[0.98]">
                  <div className="aspect-[1.1/1] rounded-[24px] overflow-hidden bg-gray-50 mb-3.5 relative shadow-inner border border-gray-50">
                    <img
                      src={getImageUrl(p.imageUrl)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={p.name}
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 flex flex-col px-1 pb-1">
                    <h3 className="text-[#4B3621] font-black text-[13px] leading-tight mb-2 h-9 overflow-hidden line-clamp-2">{p.name}</h3>
                    <div className="mt-auto flex items-end justify-between">
                      <p className="font-black text-[#C2A383] text-[13px] tracking-tighter mb-1">{formatVND(p.price)}đ</p>

                      <div className="flex items-center gap-2">
                        {selectedItems[p.id] > 0 && (
                          <span className="text-[10px] font-black text-[#4B3621] bg-gray-100 w-8 h-8 rounded-xl flex items-center justify-center border border-gray-100">{selectedItems[p.id]}</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); update(p.id, 1); }}
                          className="w-9 h-9 rounded-xl bg-[#4B3621] text-white shadow-lg flex items-center justify-center active:bg-[#C2A383] transition-colors"
                        >
                          <i className="fas fa-plus text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 4. GIỎ HÀNG NỔI */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-[110] max-w-[568px] mx-auto animate-bounce-subtle">
          <button onClick={() => setShowSheet(true)} className="w-full bg-[#4B3621] text-white py-4 px-6 rounded-[28px] shadow-2xl flex justify-between items-center animate-slide-up border border-white/10 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="bg-[#C2A383] w-10 h-10 rounded-xl flex items-center justify-center relative shadow-inner">
                <i className="fas fa-shopping-basket text-[#4B3621] text-sm"></i>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#4B3621] rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#4B3621] shadow-sm">{itemCount}</div>
              </div>
              <div className="text-left">
                <p className="font-black text-[9px] uppercase tracking-[0.1em] text-white/50 mb-0.5">Giỏ hàng</p>
                <p className="font-black text-[11px] uppercase tracking-wide">Đã chọn {itemCount} món</p>
              </div>
            </div>
            <span className="text-xl font-black tracking-tighter">{formatVND(total)}đ</span>
          </button>
        </div>
      )}

      {/* 5. MODAL CHI TIẾT */}
      {showSheet && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end p-3">
          <div className="absolute inset-0 bg-[#4B3621]/80 backdrop-blur-md" onClick={() => setShowSheet(false)}></div>
          <div className="relative bg-[#FDFCF8] rounded-[48px] p-8 animate-slide-up max-h-[85vh] flex flex-col max-w-[500px] mx-auto w-full shadow-2xl">
            <button
              onClick={() => setShowSheet(false)}
              className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-[#4B3621] text-white flex items-center gap-2 shadow-lg active:scale-95 transition-transform z-10"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">ĐÓNG</span>
              <i className="fas fa-times text-xs"></i>
            </button>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter mb-8 italic border-b border-gray-100 pb-5">Xác nhận đặt món</h3>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar px-1">
              {Object.entries(selectedItems).map(([pid, qty]) => {
                const p = products.find(prod => prod.id === pid)!;
                return (
                  <div key={pid} className="flex justify-between items-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={getImageUrl(p.imageUrl)} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                      <div>
                        <p className="font-black text-[#4B3621] text-sm leading-tight mb-1">{p.name}</p>
                        <p className="text-xs text-[#C2A383] font-black tracking-tighter">{formatVND(p.price)}đ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                      <button onClick={() => update(pid, -1)} className="w-8 h-8 rounded-xl bg-white text-gray-400 flex items-center justify-center shadow-sm active:bg-gray-100"><i className="fas fa-minus text-[8px]"></i></button>
                      <span className="font-black text-sm w-5 text-center text-[#4B3621]">{qty}</span>
                      <button onClick={() => update(pid, 1)} className="w-8 h-8 rounded-xl bg-[#4B3621] text-white flex items-center justify-center shadow-md active:bg-[#C2A383]"><i className="fas fa-plus text-[8px]"></i></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
              <div className="flex justify-between items-center mb-8 px-2">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">TỔNG CỘNG</span>
                <span className="text-4xl font-black text-[#4B3621] tracking-tighter">{formatVND(total)}đ</span>
              </div>
              <button onClick={handleSend} className="w-full bg-[#4B3621] text-white py-5 rounded-[28px] font-black text-sm shadow-xl uppercase tracking-widest active:scale-95 transition-transform hover:shadow-2xl">GỬI YÊU CẦU PHỤC VỤ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
