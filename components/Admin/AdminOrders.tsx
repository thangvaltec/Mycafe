
import React, { useState } from 'react';
import { Order, OrderStatus, Table, PaymentMethod } from '../../types';
import { BANK_QR_IMAGE_URL } from '../../constants';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminOrdersProps {
  orders: Order[];
  tables: Table[];
  onUpdateOrder: (o: Order) => void;
  onUpdateTable: (t: Table) => void;
  onOpenOrderView: (tableId: string) => void;
}

const AdminOrders: React.FC<AdminOrdersProps> = ({ orders, tables, onUpdateOrder, onUpdateTable, onOpenOrderView }) => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState<Order | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'method' | 'cash' | 'transfer'>('method');
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');

  const activeOrders = orders.filter(o => o.status !== OrderStatus.PAID).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paidOrders = orders.filter(o => o.status === OrderStatus.PAID).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const receivedAmount = parseVND(receivedAmountStr);

  const startCheckout = (order: Order) => {
    setSelectedOrder(order);
    setReceivedAmountStr('');
    setCheckoutStep('method');
    setShowCheckoutModal(true);
  };

  const finalizePayment = (method: PaymentMethod) => {
    if (!selectedOrder) return;
    const table = tables.find(t => t.id === selectedOrder.tableId);
    const finalReceived = method === PaymentMethod.CASH ? receivedAmount : selectedOrder.totalAmount;
    const change = Math.max(0, finalReceived - selectedOrder.totalAmount);
    
    onUpdateOrder({ 
      ...selectedOrder, 
      status: OrderStatus.PAID,
      paymentMethod: method,
      paymentAmount: finalReceived,
      changeAmount: change
    });

    if (table) {
      onUpdateTable({ 
        ...table, 
        isOccupied: false, 
        currentOrderId: undefined,
        guestName: '' 
      });
    }

    setShowCheckoutModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
          <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter">Đơn hàng đang phục vụ</h3>
          <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full">{activeOrders.length} BÀN</span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-[40px] p-12 text-center border border-dashed border-gray-200">
             <i className="fas fa-mug-hot text-4xl text-gray-100 mb-4"></i>
             <p className="text-gray-300 font-bold text-sm uppercase">Hiện tại không có bàn nào đang hoạt động</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeOrders.map(order => {
              const table = tables.find(t => t.id === order.tableId);
              return (
                <div key={order.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col h-full relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-6 relative">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{table?.name || 'Không xác định'}</p>
                      <h4 className="text-2xl font-black text-[#4B3621] leading-none">{table?.guestName || 'Khách vãng lai'}</h4>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{formatVND(order.totalAmount)}đ</span>
                  </div>

                  <div className="flex-1 space-y-2 mb-8 max-h-32 overflow-y-auto no-scrollbar border-t border-gray-50 pt-4">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-bold text-gray-500 italic">
                        <span className="truncate mr-4">• {item.productName}</span>
                        <span className="shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button onClick={() => onOpenOrderView(order.tableId)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-gray-100 transition-all">Thêm món</button>
                    <button onClick={() => startCheckout(order)} className="bg-[#4B3621] text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Thanh toán</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">Lịch sử hôm nay</h3>
          <p className="text-[9px] font-bold text-gray-300 uppercase italic">Nhấn vào hàng để xem chi tiết</p>
        </div>
        
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-gray-50">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã đơn</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bàn / Khách</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thanh toán</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paidOrders.map(order => {
                  const table = tables.find(t => t.id === order.tableId);
                  return (
                    <tr key={order.id} onClick={() => setViewingHistoryOrder(order)} className="hover:bg-[#C2A383]/5 transition-colors cursor-pointer group">
                      <td className="px-8 py-5 font-black text-[#C2A383] text-xs group-hover:underline">#{order.id.slice(-4)}</td>
                      <td className="px-8 py-5 text-xs font-bold text-gray-400">{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 text-xs">{order.tableId === 'MANG_VE' ? 'MANG VỀ' : `Bàn ${order.tableId}`}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{order.tableId === 'MANG_VE' ? 'Khách lẻ' : (table?.guestName || 'Khách vãng lai')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                           {order.paymentMethod}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-[#4B3621]">{formatVND(order.totalAmount)}đ</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {paidOrders.length === 0 && <div className="p-20 text-center text-gray-200 font-black italic">Chưa có đơn hàng nào được thanh toán hôm nay</div>}
          </div>
        </div>
      </section>

      {/* MODAL THANH TOÁN (ĐỒNG BỘ GIAO DIỆN) */}
      {showCheckoutModal && selectedOrder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowCheckoutModal(false)}></div>
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up flex flex-col lg:flex-row max-h-[95vh]">
            
            <div className="flex-1 p-8 lg:p-12 bg-[#FDFCFB] border-r border-gray-100 overflow-y-auto">
              <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-[#4B3621] uppercase tracking-tighter">Bảng kê thanh toán</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">MÃ HÓA ĐƠN #{selectedOrder.id.slice(-4)} – BÀN {selectedOrder.tableId}</p>
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
                  {selectedOrder.items.map((item, idx) => (
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
                  <span className="font-black text-white/50 uppercase text-sm tracking-[0.2em]">Tổng cộng cần thu:</span>
                  <span className="text-5xl lg:text-6xl font-black tracking-tighter">{formatVND(selectedOrder.totalAmount)}đ</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[420px] p-8 lg:p-12 space-y-8 bg-white shrink-0">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="font-black text-[#4B3621] text-xs uppercase tracking-widest">Xử lý tiền</h4>
                 <button onClick={() => setShowCheckoutModal(false)} className="text-gray-300 hover:text-gray-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>

              {checkoutStep === 'method' && (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => setCheckoutStep('cash')} className="w-full flex items-center gap-6 p-7 rounded-[32px] bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:bg-emerald-100 transition-all group shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md"><i className="fas fa-money-bill-wave text-2xl"></i></div>
                    <span className="font-black text-sm uppercase tracking-widest">Tiền mặt</span>
                  </button>
                  <button onClick={() => setCheckoutStep('transfer')} className="w-full flex items-center gap-6 p-7 rounded-[32px] bg-blue-50 text-blue-700 border-2 border-blue-100 hover:bg-blue-100 transition-all group shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md"><i className="fas fa-qrcode text-2xl"></i></div>
                    <span className="font-black text-sm uppercase tracking-widest">Chuyển khoản</span>
                  </button>
                </div>
              )}

              {checkoutStep === 'cash' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Tiền mặt khách đưa</label>
                    <input 
                      type="text" inputMode="numeric" autoFocus 
                      value={receivedAmountStr} 
                      onChange={(e) => setReceivedAmountStr(handleMoneyInput(e.target.value))} 
                      className="w-full bg-gray-50 border-2 border-[#C2A383]/30 rounded-[32px] p-8 font-black text-5xl text-[#4B3621] text-center outline-none focus:border-[#C2A383] shadow-inner" 
                    />
                  </div>
                  <div className="bg-[#FAF9F6] p-8 rounded-[40px] space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400 uppercase tracking-widest">Hóa đơn:</span>
                       <span className="font-black text-gray-700">{formatVND(selectedOrder.totalAmount)}đ</span>
                    </div>
                    <div className="h-px bg-gray-200 border-dashed border-b"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền thừa:</span>
                      <span className="text-3xl font-black text-emerald-600">{formatVND(Math.max(0, receivedAmount - selectedOrder.totalAmount))}đ</span>
                    </div>
                  </div>
                  <button 
                    disabled={receivedAmount < selectedOrder.totalAmount} 
                    onClick={() => finalizePayment(PaymentMethod.CASH)} 
                    className="w-full bg-[#4B3621] text-white py-7 rounded-[32px] font-black text-sm uppercase shadow-2xl active:scale-95 transition-all"
                  >
                    HOÀN TẤT
                  </button>
                </div>
              )}

              {checkoutStep === 'transfer' && (
                <div className="space-y-8 text-center animate-fade-in">
                  <div className="bg-white p-6 border-2 border-dashed border-blue-100 rounded-[48px] flex flex-col items-center gap-8 shadow-sm">
                    <div className="w-52 h-52 bg-white rounded-3xl overflow-hidden border-4 border-gray-50 p-2 shadow-inner">
                      <img src={`${BANK_QR_IMAGE_URL}&amount=${selectedOrder.totalAmount}`} className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <h4 className="text-4xl font-black text-blue-700 tracking-tighter">{formatVND(selectedOrder.totalAmount)}đ</h4>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setCheckoutStep('method')} className="flex-1 bg-gray-100 text-gray-500 py-6 rounded-3xl font-black text-[10px] uppercase">LẠI</button>
                    <button onClick={() => finalizePayment(PaymentMethod.BANK_TRANSFER)} className="flex-[2] bg-[#4B3621] text-white py-6 rounded-3xl font-black text-[10px] uppercase shadow-xl">XÁC NHẬN</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT LỊCH SỬ (Receipt View) */}
      {viewingHistoryOrder && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setViewingHistoryOrder(null)}></div>
          <div className="relative bg-white rounded-[56px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
            <div className="p-10 pb-6 flex justify-between items-start bg-[#FAF9F6] border-b border-gray-100">
               <div>
                 <div className="flex items-center gap-3 mb-2">
                   <span className="bg-[#4B3621] text-white px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest">ĐÃ THANH TOÁN</span>
                   <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border ${viewingHistoryOrder.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                     {viewingHistoryOrder.paymentMethod}
                   </span>
                 </div>
                 <h3 className="text-4xl font-black text-[#4B3621] tracking-tighter">Chi tiết biên lai</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">MÃ HÓA ĐƠN #{viewingHistoryOrder.id.slice(-4)} – {new Date(viewingHistoryOrder.createdAt).toLocaleString('vi-VN')}</p>
               </div>
               <button onClick={() => setViewingHistoryOrder(null)} className="w-12 h-12 rounded-full bg-white text-gray-300 flex items-center justify-center shadow-sm hover:text-gray-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Danh sách món ăn</p>
                  <div className="divide-y divide-gray-50">
                    {viewingHistoryOrder.items.map((item, idx) => (
                      <div key={idx} className="py-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[10px] font-black text-[#C2A383] border border-gray-100">{item.quantity}</div>
                           <span className="font-black text-[#4B3621] text-sm">{item.productName}</span>
                        </div>
                        <span className="font-bold text-gray-500 text-sm">{formatVND(item.price * item.quantity)}đ</span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="bg-[#FAF9F6] p-8 rounded-[40px] space-y-6 border border-gray-100">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase tracking-widest">
                     <span>Tổng hóa đơn:</span>
                     <span className="text-[#4B3621] font-black text-lg">{formatVND(viewingHistoryOrder.totalAmount)}đ</span>
                  </div>
                  <div className="h-px w-full border-b border-dashed border-gray-200"></div>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase tracking-widest">
                     <span>Khách đã đưa ({viewingHistoryOrder.paymentMethod}):</span>
                     <span className="text-[#4B3621] font-black text-lg">{formatVND(viewingHistoryOrder.paymentAmount || 0)}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase tracking-widest">
                     <span>Tiền thừa trả khách:</span>
                     <span className="text-emerald-600 font-black text-2xl">{formatVND(viewingHistoryOrder.changeAmount || 0)}đ</span>
                  </div>
               </div>
            </div>

            <div className="p-10 pt-0">
               <button onClick={() => setViewingHistoryOrder(null)} className="w-full bg-[#4B3621] text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-xl">ĐÓNG CHI TIẾT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
