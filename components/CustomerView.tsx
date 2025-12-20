
import React, { useState, useMemo, useRef } from 'react';
import { Product, Category, Order, OrderItem, OrderStatus, Table } from '../types';
import { formatVND } from '../utils/format';

interface CustomerViewProps {
  table: Table;
  products: Product[];
  categories: Category[];
  activeOrder?: Order;
  onPlaceOrder: (items: OrderItem[]) => void;
}

const CustomerView: React.FC<CustomerViewProps> = ({ 
  table, products, categories, activeOrder, onPlaceOrder 
}) => {
  const [selectedItems, setSelectedItems] = useState<{[key: string]: number}>({});
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id || '');
  const [showSheet, setShowSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const sectionRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const itemCount = useMemo(() => Object.values(selectedItems).reduce((a, b) => a + b, 0), [selectedItems]);
  const total = useMemo(() => Object.entries(selectedItems).reduce((acc, [pid, qty]) => {
    const p = products.find(prod => prod.id === pid);
    return acc + (p ? p.price * qty : 0);
  }, 0), [selectedItems, products]);

  const scrollToCategory = (catId: string) => {
    setActiveCat(catId);
    const element = sectionRefs.current[catId];
    if (element) {
      const offset = 120; // Thậm chí nhỏ hơn cho header siêu gọn
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
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
      const p = products.find(prod => prod.id === pid)!;
      return { productId: pid, productName: p.name, price: p.price, quantity: qty };
    });
    onPlaceOrder(items);
    setSelectedItems({});
    setShowSheet(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] relative max-w-[600px] mx-auto shadow-sm pb-24 animate-fade-in">
      {/* HEADER SIÊU GỌN - Tối ưu 2 cột trái phải cho phần trên */}
      <header className="bg-[#4B3621] px-4 py-3 rounded-b-[20px] shadow-md sticky top-0 z-[100] border-b border-white/5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <h1 className="text-white text-base font-black tracking-tighter italic leading-none">The Heritage</h1>
            <p className="text-[#C2A383] text-[6px] font-black uppercase tracking-[0.2em] mt-0.5">Sabor de Vietnam</p>
          </div>
          
          <div className="flex items-center gap-1.5">
             {activeOrder && (
               <button onClick={() => setShowHistory(!showHistory)} className="w-7 h-7 bg-white/10 rounded-md flex items-center justify-center text-[#C2A383] border border-white/10">
                 <i className="fas fa-receipt text-[8px]"></i>
               </button>
             )}
             <div className="bg-[#C2A383] px-2 py-1 rounded-md flex flex-col items-center min-w-[40px]">
               <span className="text-[#4B3621]/40 text-[5px] font-black uppercase tracking-widest">BÀN</span>
               <span className="text-[#4B3621] text-xs font-black leading-none">{table.name.split(' ')[1] || table.name}</span>
             </div>
          </div>
        </div>

        {/* DANH MỤC DẠNG LƯỚI 2 CỘT TỰ ĐỘNG - TIẾT KIỆM KHÔNG GIAN */}
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => scrollToCategory(cat.id)} 
              className={`px-2 py-1.5 rounded-lg text-[7px] font-black transition-all uppercase tracking-wider border text-center ${
                activeCat === cat.id ? 'bg-[#C2A383] text-[#4B3621] border-transparent shadow-sm' : 'bg-white/5 text-white/20 border-white/5'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="px-2 mt-3 space-y-4">
        {/* Lịch sử đơn hiện tại - Thu gọn tối đa */}
        {activeOrder && showHistory && (
          <div className="bg-white border border-[#C2A383]/30 p-3 rounded-xl shadow-sm animate-fade-in mx-1">
            <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
               <span className="text-[8px] font-black text-[#4B3621] uppercase">Đơn của bạn</span>
               <span className="text-[7px] text-gray-300 font-bold uppercase">Mã: {activeOrder.id.slice(-4)}</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
              {activeOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[9px] font-bold text-gray-500">
                  <span>{item.quantity}x {item.productName}</span>
                  <span>{formatVND(item.price * item.quantity)}đ</span>
                </div>
              ))}
            </div>
            <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center mt-1.5">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">Tổng hiện tại:</span>
              <span className="text-xs font-black text-[#4B3621]">{formatVND(activeOrder.totalAmount)}đ</span>
            </div>
          </div>
        )}

        {/* THỰC ĐƠN - ẢNH NHỎ GỌN, ÍT KHOẢNG TRẮNG */}
        {categories.map(cat => (
          <div key={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }} className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <span className="w-0.5 h-2.5 bg-[#C2A383] rounded-full"></span>
              <h2 className="text-[9px] font-black text-[#4B3621] uppercase tracking-wider">{cat.name}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {products.filter(p => p.isActive && p.categoryId === cat.id).map(p => (
                <div key={p.id} className="bg-white rounded-[16px] p-1.5 shadow-sm border border-gray-50 flex flex-col group transition-all active:scale-[0.98]">
                  {/* Ảnh nhỏ lại đáng kể */}
                  <div className="aspect-[1.2/1] rounded-[12px] overflow-hidden bg-gray-50 mb-1.5 relative shadow-inner border border-gray-50">
                    <img 
                      src={p.imageUrl} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={p.name}
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col px-0.5">
                    <h3 className="text-[#4B3621] font-bold text-[10px] leading-tight mb-0.5 h-6 overflow-hidden line-clamp-2">{p.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <p className="font-black text-[#C2A383] text-[10px] tracking-tighter">{formatVND(p.price)}đ</p>
                      
                      <div className="flex items-center gap-1">
                        {selectedItems[p.id] > 0 && (
                          <span className="text-[9px] font-black text-[#4B3621] bg-gray-100 w-4 h-4 rounded-md flex items-center justify-center">{selectedItems[p.id]}</span>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); update(p.id, 1); }} 
                          className="w-5 h-5 rounded-md bg-[#4B3621] text-white shadow-sm flex items-center justify-center active:bg-[#C2A383]"
                        >
                          <i className="fas fa-plus text-[6px]"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* GIỎ HÀNG NỔI - DẸP HƠN NỮA */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-[110] max-w-[574px] mx-auto">
          <button onClick={() => setShowSheet(true)} className="w-full bg-[#4B3621] text-white py-2 px-4 rounded-[14px] shadow-lg flex justify-between items-center animate-slide-up border border-white/5">
            <div className="flex items-center gap-2">
              <div className="bg-[#C2A383] w-7 h-7 rounded-lg flex items-center justify-center relative shadow-inner">
                <i className="fas fa-shopping-basket text-[#4B3621] text-[10px]"></i>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-[#4B3621] rounded-full flex items-center justify-center text-[7px] font-black border border-[#4B3621]">{itemCount}</div>
              </div>
              <div className="text-left">
                <p className="font-black text-[9px] uppercase tracking-wide">Đã chọn {itemCount} món</p>
              </div>
            </div>
            <span className="text-sm font-black tracking-tighter">{formatVND(total)}đ</span>
          </button>
        </div>
      )}

      {/* MODAL CHI TIẾT - THIẾT KẾ LẠI GỌN GÀNG */}
      {showSheet && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end p-2">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => setShowSheet(false)}></div>
          <div className="relative bg-white rounded-[24px] p-4 animate-slide-up max-h-[70vh] flex flex-col max-w-[500px] mx-auto w-full">
            <div className="w-6 h-1 bg-gray-100 rounded-full mx-auto mb-3"></div>
            <h3 className="text-sm font-black text-[#4B3621] uppercase tracking-widest mb-3 italic">Xác nhận đặt đơn</h3>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar px-0.5">
               {Object.entries(selectedItems).map(([pid, qty]) => {
                 const p = products.find(prod => prod.id === pid)!;
                 return (
                   <div key={pid} className="flex justify-between items-center p-2 bg-gray-50/50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <img src={p.imageUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <div>
                          <p className="font-bold text-[#4B3621] text-[10px] leading-none">{p.name}</p>
                          <p className="text-[7px] text-gray-400 font-bold uppercase mt-1">{formatVND(p.price)}đ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border">
                        <button onClick={() => update(pid, -1)} className="w-5 h-5 rounded-md bg-gray-50 text-gray-400 flex items-center justify-center"><i className="fas fa-minus text-[5px]"></i></button>
                        <span className="font-black text-[10px] w-2.5 text-center">{qty}</span>
                        <button onClick={() => update(pid, 1)} className="w-5 h-5 rounded-md bg-[#4B3621] text-white flex items-center justify-center"><i className="fas fa-plus text-[5px]"></i></button>
                      </div>
                   </div>
                 );
               })}
            </div>

            <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
               <div className="flex justify-between items-center mb-3 px-1">
                  <span className="text-gray-400 font-black uppercase text-[7px] tracking-widest">TỔNG</span>
                  <span className="text-lg font-black text-[#4B3621] tracking-tighter">{formatVND(total)}đ</span>
               </div>
               <button onClick={handleSend} className="w-full bg-[#4B3621] text-white py-3.5 rounded-xl font-black text-[10px] shadow-md uppercase tracking-wider active:scale-95 transition-transform">GỬI YÊU CẦU PHỤC VỤ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
