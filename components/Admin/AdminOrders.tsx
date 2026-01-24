
import React, { useState } from 'react';
import { Order, OrderStatus, Table, PaymentMethod } from '../../types';
import CheckoutModal from './CheckoutModal';
import { formatVND } from '../../utils/format';
import { api } from '../../services/api';

interface AdminOrdersProps {
  orders: Order[];
  tables: Table[];
  onUpdateOrder: (o: Order) => void;
  onUpdateTable: (t: Table) => void;
  onOpenOrderView: (tableId: string) => void;
  onDeleteOrderItem: (itemId: string, orderId: string) => void;
}

const AdminOrders: React.FC<AdminOrdersProps> = ({ orders, tables, onUpdateOrder, onUpdateTable, onOpenOrderView, onDeleteOrderItem }) => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState<Order | null>(null);

  // Helpers for display labels
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'Chờ xử lý';
      case OrderStatus.PREPARING: return 'Đang pha chế';
      case OrderStatus.READY: return 'Sẵn sàng';
      case OrderStatus.SERVED: return 'Đã phục vụ';
      case OrderStatus.PAID: return 'Đã thanh toán';
      case OrderStatus.CANCELLED: return 'Đã hủy';
      default: return status;
    }
  };

  const getMethodLabel = (method: string | undefined) => {
    if (method === PaymentMethod.CASH) return 'Tiền mặt';
    if (method === PaymentMethod.BANK_TRANSFER) return 'Chuyển khoản';
    return method || 'N/A';
  };

  const activeOrders = orders.filter(o => o.status !== OrderStatus.PAID).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paidOrders = orders.filter(o => {
    if (o.status !== OrderStatus.PAID) return false;
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const startCheckout = (order: Order) => {
    setSelectedOrder(order);
    setShowCheckoutModal(true);
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
              const isTakeaway = order.tableId === 'MANG_VE' || table?.alias === 'Takeaway' || table?.tableNumber === 'MV';
              return (
                <div key={order.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col h-full relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-6 relative">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isTakeaway ? 'MANG VỀ' : (table?.name || 'Bàn ' + order.tableId)}</p>
                      <h4 className="text-2xl font-black text-[#4B3621] leading-none">{table?.guestName === 'Khách vãng lai' ? '' : (table?.guestName || '')}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{formatVND(order.totalAmount)}đ</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase">{getStatusLabel(order.status)}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 mb-6 max-h-[240px] overflow-y-auto custom-scrollbar border-t border-dashed border-gray-100 pt-4">
                    <div className="flex justify-between items-center px-1 mb-2">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Danh sách món ({order.items.length})</p>
                      <i className="fas fa-list-ul text-gray-200 text-xs"></i>
                    </div>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-2xl hover:bg-orange-50/50 transition-colors group/item border border-transparent hover:border-orange-100">
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                          <span className="text-xs font-bold text-gray-700 truncate group-hover/item:text-[#4B3621] leading-tight flex-1" title={item.productName}>{item.productName}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (item.quantity <= 1) {
                                  if (window.confirm(`Bạn có chắc muốn xóa món "${item.productName}" không?`)) onDeleteOrderItem(String(item.id), order.id);
                                  return;
                                }
                                try {
                                  const updated = await api.updateOrderItem(order.id, String(item.id), item.quantity - 1);
                                  onUpdateOrder(updated);
                                } catch (err) { alert('Lỗi: ' + err); }
                              }}
                              className="w-6 h-6 rounded-md bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center active:scale-90"
                            >
                              <i className="fas fa-minus text-[8px]"></i>
                            </button>

                            <span className="w-5 text-center text-[10px] font-black text-[#4B3621]">{item.quantity}</span>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const updated = await api.updateOrderItem(order.id, String(item.id), item.quantity + 1);
                                  onUpdateOrder(updated);
                                } catch (err) { alert('Lỗi: ' + err); }
                              }}
                              className="w-6 h-6 rounded-md bg-[#4B3621] text-white hover:bg-[#C2A383] transition-colors flex items-center justify-center active:scale-90 shadow-sm"
                            >
                              <i className="fas fa-plus text-[8px]"></i>
                            </button>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Bạn có chắc muốn xóa món "${item.productName}" không?`)) onDeleteOrderItem(String(item.id), order.id);
                            }}
                            className="px-2 py-1.5 bg-white text-red-500 rounded-lg font-black text-[8px] uppercase tracking-wider border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all shadow-sm whitespace-nowrap flex items-center gap-1 opacity-60 hover:opacity-100 group-hover/item:opacity-100"
                          >
                            <i className="fas fa-trash-alt"></i> XÓA
                          </button>
                        </div>
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
          <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter">Lịch sử hôm nay</h3>
          <p className="text-[9px] font-bold text-gray-300 uppercase italic">Nhấn vào hàng để xem chi tiết</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-gray-50">
                  <th className="px-2 md:px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Thời gian</th>
                  <th className="px-2 md:px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Bàn</th>
                  <th className="px-2 md:px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Thanh toán</th>
                  <th className="px-2 md:px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paidOrders.map(order => {
                  const table = tables.find(t => t.id === order.tableId);
                  const isTakeaway = table?.alias === 'Takeaway' || table?.tableNumber === 'MV';
                  return (
                    <tr key={order.id} onClick={() => setViewingHistoryOrder(order)} className="hover:bg-[#C2A383]/5 transition-colors cursor-pointer group">
                      <td className="px-2 md:px-4 py-4 text-xs font-bold text-gray-400 whitespace-nowrap">{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-2 md:px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 text-xs whitespace-nowrap">{isTakeaway ? 'MANG VỀ' : (table?.name || 'Bàn ' + order.tableId)}</span>
                          <span className="text-[10px] text-gray-400 font-bold truncate max-w-[80px] md:max-w-none">{isTakeaway ? 'Khách lẻ' : (table?.guestName === 'Khách vãng lai' ? '' : (table?.guestName || ''))}</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-4 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md whitespace-nowrap ${order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {getMethodLabel(order.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-4 text-right font-black text-[#4B3621] whitespace-nowrap text-xs md:text-sm">{formatVND(order.totalAmount)}đ</td>
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
        <CheckoutModal
          order={selectedOrder}
          table={tables.find(t => t.id === selectedOrder.tableId)}
          useOrderId={true}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            setShowCheckoutModal(false);
            window.location.reload();
          }}
        />
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
                    {getMethodLabel(viewingHistoryOrder.paymentMethod)}
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
            </div>

            <div className="p-10 pt-0 shrink-0">
              <div className="bg-[#FAF9F6] p-8 rounded-[40px] space-y-4 border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">TỔNG HÓA ĐƠN:</span>
                  <span className="text-2xl font-black text-[#4B3621]">{formatVND(viewingHistoryOrder.totalAmount)}đ</span>
                </div>

                {viewingHistoryOrder.discountAmount && viewingHistoryOrder.discountAmount > 0 ? (
                  <div className="flex justify-between items-center py-2 border-y border-dashed border-gray-200">
                    <span className="text-red-400 font-bold text-[10px] uppercase tracking-widest">GIẢM GIÁ / CHIẾT KHẤU:</span>
                    <span className="text-lg font-black text-red-500">-{formatVND(viewingHistoryOrder.discountAmount)}đ</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">THỰC THU ({viewingHistoryOrder.paymentMethod === PaymentMethod.CASH ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}):</span>
                  <span className="text-3xl font-black text-emerald-600">{formatVND(viewingHistoryOrder.totalAmount - (viewingHistoryOrder.discountAmount || 0))}đ</span>
                </div>

                <div className="flex justify-between items-center opacity-40">
                  <span className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">TIỀN THỪA TRẢ KHÁCH:</span>
                  <span className="text-lg font-black text-emerald-600">{formatVND(viewingHistoryOrder.changeAmount || 0)}đ</span>
                </div>
              </div>
            </div>

            <div className="p-10 pt-0">
              <button onClick={() => setViewingHistoryOrder(null)} className="w-full py-6 bg-[#4B3621] text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl transform active:scale-[0.98] transition-all">Đóng chi tiết</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
