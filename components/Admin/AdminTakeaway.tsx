
import React, { useState } from 'react';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import { BANK_QR_IMAGE_URL } from '../../constants';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminTakeawayProps {
  orders: Order[];
  onUpdateOrder: (o: Order) => void;
  onOpenOrderView: (table: { id: string, name: string, guestName?: string }) => void;
}

const AdminTakeaway: React.FC<AdminTakeawayProps> = ({ orders, onUpdateOrder, onOpenOrderView }) => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'method' | 'cash' | 'transfer'>('method');
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');

  const takeawayOrder = orders.find(o => o.tableId === 'MANG_VE' && o.status !== OrderStatus.PAID);
  const receivedAmount = parseVND(receivedAmountStr);

  const startCheckout = () => {
    if (!takeawayOrder) return;
    setReceivedAmountStr('');
    setCheckoutStep('method');
    setShowCheckoutModal(true);
  };

  const finalizePayment = (method: PaymentMethod) => {
    if (!takeawayOrder) return;
    const finalReceived = method === PaymentMethod.CASH ? receivedAmount : takeawayOrder.totalAmount;
    const change = Math.max(0, finalReceived - takeawayOrder.totalAmount);
    
    onUpdateOrder({ 
      ...takeawayOrder, 
      status: OrderStatus.PAID,
      paymentMethod: method,
      paymentAmount: finalReceived,
      changeAmount: change
    });

    setShowCheckoutModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-[#10b981] rounded-[48px] p-10 text-white shadow-2xl shadow-emerald-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-20 -mt-20 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Khách Mang Về</h3>
            <p className="text-emerald-100 font-bold text-sm max-w-sm">Hệ thống ghi món và thanh toán nhanh chóng cho khách không ngồi tại quán.</p>
          </div>
          <button 
            onClick={() => onOpenOrderView({ id: 'MANG_VE', name: 'Mang Về' })}
            className="bg-white text-[#10b981] px-10 py-5 rounded-[28px] font-black text-sm shadow-xl hover:scale-105 transition-transform active:scale-95 whitespace-nowrap"
          >
            <i className="fas fa-plus-circle mr-2"></i> {takeawayOrder ? 'THÊM MÓN VÀO ĐƠN' : 'TẠO ĐƠN MANG VỀ'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {takeawayOrder ? (
          <div className="bg-white rounded-[40px] border border-emerald-100 shadow-sm overflow-hidden flex flex-col md:flex-row items-center p-8 gap-8">
            <div className="flex-1">
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-3 inline-block border border-emerald-100">Đơn hàng hiện tại</span>
              <h4 className="text-2xl font-black text-[#4B3621]">Đang chờ thanh toán</h4>
              <p className="text-sm text-gray-400 font-bold mt-1">Mã hóa đơn: #{takeawayOrder.id.slice(-4)}</p>
            </div>
            <div className="flex items-center gap-10">
               <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng tiền</p>
                  <p className="text-4xl font-black text-emerald-600 tracking-tighter">{formatVND(takeawayOrder.totalAmount)}đ</p>
               </div>
               <button 
                onClick={startCheckout}
                className="bg-[#4B3621] text-white px-12 py-6 rounded-[32px] font-black text-lg shadow-2xl active:scale-95 transition-all"
              >
                THANH TOÁN NGAY
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[48px] p-20 text-center border-2 border-dashed border-gray-100">
             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 text-4xl mx-auto mb-6">
               <i className="fas fa-shopping-bag"></i>
             </div>
             <h4 className="text-xl font-black text-gray-400 uppercase tracking-tighter mb-2">Chưa có đơn mang về nào</h4>
          </div>
        )}
      </div>

      {showCheckoutModal && takeawayOrder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowCheckoutModal(false)}></div>
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up flex flex-col lg:flex-row max-h-[95vh]">
            
            {/* PHẦN 1: BẢNG KÊ CHI TIẾT (GIỐNG TẠI QUÁN) */}
            <div className="flex-1 p-8 lg:p-12 bg-[#FDFCFB] border-r border-gray-100 overflow-y-auto">
              <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-[#4B3621] uppercase tracking-tighter">Bảng kê mang về</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">MÃ HÓA ĐƠN #{takeawayOrder.id.slice(-4)} – {new Date(takeawayOrder.createdAt).toLocaleTimeString('vi-VN')}</p>
                </div>
                <div className="text-right">
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl font-black text-xs uppercase border border-emerald-100 italic">Khách Mang Về</div>
                </div>
              </div>
              
              <table className="w-full mb-10">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b-2 border-gray-50">
                    <th className="text-left py-5 px-2">Tên món</th>
                    <th className="text-center py-5 px-4">SL</th>
                    <th className="text-right py-5 px-4">Đơn giá</th>
                    <th className="text-right py-5 px-2">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {takeawayOrder.items.map((item, idx) => (
                    <tr key={idx} className="text-sm group hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-2 font-black text-[#4B3621]">{item.productName}</td>
                      <td className="py-5 px-4 text-center font-black text-[#C2A383]">x{item.quantity}</td>
                      <td className="py-5 px-4 text-right text-gray-400 font-bold">{formatVND(item.price)}đ</td>
                      <td className="py-5 px-2 text-right font-black text-[#4B3621]">{formatVND(item.price * item.quantity)}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-auto pt-10 border-t-4 border-[#4B3621]">
                <div className="flex justify-between items-center bg-[#4B3621] p-8 rounded-[32px] text-white shadow-xl">
                  <span className="font-black text-white/50 uppercase text-sm tracking-[0.2em]">Tổng tiền mang về:</span>
                  <span className="text-5xl lg:text-6xl font-black tracking-tighter">{formatVND(takeawayOrder.totalAmount)}đ</span>
                </div>
              </div>
            </div>

            {/* PHẦN 2: XỬ LÝ THANH TOÁN (GIỐNG TẠI QUÁN) */}
            <div className="w-full lg:w-[420px] p-8 lg:p-12 space-y-8 bg-white shrink-0">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="font-black text-[#4B3621] text-xs uppercase tracking-widest">Xử lý thanh toán</h4>
                 <button onClick={() => setShowCheckoutModal(false)} className="text-gray-300 hover:text-gray-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>

              {checkoutStep === 'method' && (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => setCheckoutStep('cash')} className="w-full flex items-center gap-6 p-7 rounded-[32px] bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:bg-emerald-100 transition-all group shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"><i className="fas fa-money-bill-wave text-2xl"></i></div>
                    <span className="font-black text-sm uppercase tracking-widest">Tiền mặt</span>
                  </button>
                  <button onClick={() => setCheckoutStep('transfer')} className="w-full flex items-center gap-6 p-7 rounded-[32px] bg-blue-50 text-blue-700 border-2 border-blue-100 hover:bg-blue-100 transition-all group shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"><i className="fas fa-qrcode text-2xl"></i></div>
                    <span className="font-black text-sm uppercase tracking-widest">Chuyển khoản</span>
                  </button>
                </div>
              )}

              {checkoutStep === 'cash' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền khách đưa</label>
                       <button onClick={() => setCheckoutStep('method')} className="text-[#C2A383] text-[10px] font-black uppercase underline">Thay đổi</button>
                    </div>
                    <input 
                      type="text" inputMode="numeric" autoFocus 
                      value={receivedAmountStr} 
                      onChange={(e) => setReceivedAmountStr(handleMoneyInput(e.target.value))} 
                      className="w-full bg-gray-50 border-2 border-[#C2A383]/30 rounded-[32px] p-8 font-black text-5xl text-[#4B3621] text-center outline-none focus:border-[#C2A383] shadow-inner" 
                    />
                  </div>
                  <div className="bg-[#FAF9F6] p-8 rounded-[40px] space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400 uppercase tracking-widest">Cần thanh toán:</span>
                       <span className="font-black text-gray-700">{formatVND(takeawayOrder.totalAmount)}đ</span>
                    </div>
                    <div className="h-px bg-gray-200 border-dashed border-b"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền thừa:</span>
                      <span className="text-3xl font-black text-emerald-600">{formatVND(Math.max(0, receivedAmount - takeawayOrder.totalAmount))}đ</span>
                    </div>
                  </div>
                  <button 
                    disabled={receivedAmount < takeawayOrder.totalAmount} 
                    onClick={() => finalizePayment(PaymentMethod.CASH)} 
                    className="w-full bg-[#4B3621] text-white py-7 rounded-[32px] font-black text-sm uppercase shadow-2xl active:scale-95 transition-all disabled:opacity-30"
                  >
                    HOÀN TẤT & IN BILL
                  </button>
                </div>
              )}

              {checkoutStep === 'transfer' && (
                <div className="space-y-8 text-center animate-fade-in">
                  <div className="bg-white p-6 border-2 border-dashed border-blue-100 rounded-[48px] flex flex-col items-center gap-8 shadow-sm">
                    <div className="w-52 h-52 bg-white rounded-3xl overflow-hidden border-4 border-gray-50 p-2 shadow-inner">
                      <img src={`${BANK_QR_IMAGE_URL}&amount=${takeawayOrder.totalAmount}`} className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Số tiền chuyển khoản</p>
                      <h4 className="text-4xl font-black text-blue-700 tracking-tighter">{formatVND(takeawayOrder.totalAmount)}đ</h4>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setCheckoutStep('method')} className="flex-1 bg-gray-100 text-gray-500 py-6 rounded-3xl font-black text-[10px] uppercase">QUAY LẠI</button>
                    <button onClick={() => finalizePayment(PaymentMethod.BANK_TRANSFER)} className="flex-[2] bg-[#4B3621] text-white py-6 rounded-3xl font-black text-[10px] uppercase shadow-xl active:scale-95">XÁC NHẬN ĐÃ NHẬN</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTakeaway;
