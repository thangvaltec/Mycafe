
import React, { useState } from 'react';
import { Table, Order, OrderStatus, PaymentMethod } from '../../types';
import { BANK_QR_IMAGE_URL } from '../../constants';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminPOSProps {
  tables: Table[];
  orders: Order[];
  onUpdateTable: (t: Table) => void;
  onUpdateOrder: (o: Order) => void;
  onOpenOrderView: (table: Table | { id: string, name: string, guestName?: string }) => void;
  onAddTable: () => void;
}

const AdminPOS: React.FC<AdminPOSProps> = ({ tables, orders, onUpdateTable, onUpdateOrder, onOpenOrderView, onAddTable }) => {
  const [selectedTable, setSelectedTable] = useState<Table | { id: string, name: string, guestName?: string } | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showOpenTableModal, setShowOpenTableModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'method' | 'cash' | 'transfer'>('method');
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');

  const currentOrder = selectedTable ? orders.find(o => o.tableId === selectedTable.id && o.status !== OrderStatus.PAID) : null;
  const receivedAmount = parseVND(receivedAmountStr);

  const handleOpenTable = () => {
    if (selectedTable && 'isOccupied' in selectedTable) {
      const table = selectedTable as Table;
      onUpdateTable({ ...table, isOccupied: true, guestName: guestName || 'Khách vãng lai' });
      setShowOpenTableModal(false);
      setGuestName('');
      onOpenOrderView({ ...table, isOccupied: true, guestName: guestName || 'Khách vãng lai' });
    }
  };

  const startCheckout = (table: Table | { id: string, name: string, guestName?: string }) => {
    setSelectedTable(table);
    setReceivedAmountStr('');
    setCheckoutStep('method');
    setShowCheckoutModal(true);
  };

  const finalizePayment = (method: PaymentMethod) => {
    if (!currentOrder || !selectedTable) return;
    const finalReceived = method === PaymentMethod.CASH ? receivedAmount : currentOrder.totalAmount;
    onUpdateOrder({ 
      ...currentOrder, 
      status: OrderStatus.PAID,
      paymentMethod: method,
      paymentAmount: finalReceived,
      changeAmount: Math.max(0, finalReceived - currentOrder.totalAmount)
    });

    if ('isOccupied' in selectedTable) {
      onUpdateTable({ ...(selectedTable as Table), isOccupied: false, currentOrderId: undefined, guestName: '' });
    }
    setShowCheckoutModal(false);
    setSelectedTable(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4 px-2 lg:px-0">
        <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter">Sơ đồ bàn</h3>
        <button onClick={onAddTable} className="bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:text-[#4B3621] px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm active:scale-95">+ THÊM BÀN</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(t => {
          const tableOrder = orders.find(o => o.tableId === t.id && o.status !== OrderStatus.PAID);
          return (
            <div key={t.id} className={`relative p-6 rounded-[32px] border-2 transition-all flex flex-col justify-between min-h-[220px] shadow-sm ${t.isOccupied ? 'bg-[#4B3621] text-white border-transparent' : 'bg-white text-gray-400 border-gray-100 hover:border-[#C2A383]'}`}>
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black tracking-tighter">{t.name}</h3>
                  {t.isOccupied && tableOrder && <span className="text-lg font-black text-[#C2A383]">{formatVND(tableOrder.totalAmount)}đ</span>}
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${t.isOccupied ? 'text-white/40' : 'text-gray-300'}`}>{t.alias}</p>
                <div className="mt-4">
                  {t.isOccupied && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white/60 uppercase tracking-tighter">Khách hàng:</p>
                      <p className="font-black text-sm text-[#C2A383] truncate">{t.guestName || 'Khách vãng lai'}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {t.isOccupied ? (
                  <>
                    <button onClick={() => onOpenOrderView(t)} className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-black text-[10px] uppercase transition-colors">Ghi món</button>
                    <button onClick={() => startCheckout(t)} className="bg-[#C2A383] text-[#4B3621] py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-transform">Thanh toán</button>
                  </>
                ) : (
                  <button onClick={() => { setSelectedTable(t); setShowOpenTableModal(true); }} className="col-span-2 bg-gray-50 hover:bg-[#4B3621] hover:text-white text-[#4B3621] py-4 rounded-2xl font-black text-[10px] uppercase transition-all border border-gray-100">Mở bàn mới</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCheckoutModal && currentOrder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCheckoutModal(false)}></div>
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up flex flex-col lg:flex-row max-h-[95vh]">
            
            {/* PHẦN 1: BẢNG KÊ CHI TIẾT HÓA ĐƠN */}
            <div className="flex-1 p-8 lg:p-12 bg-[#FDFCFB] border-r border-gray-100 overflow-y-auto">
              <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-[#4B3621] uppercase tracking-tighter">Bảng kê thanh toán</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">MÃ HÓA ĐƠN #{currentOrder.id.slice(-4)} – BÀN {selectedTable.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên khách hàng</p>
                  <p className="font-black text-[#C2A383] text-lg uppercase">{selectedTable.guestName || 'Khách vãng lai'}</p>
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
                  {currentOrder.items.map((item, idx) => (
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
                  <span className="text-5xl lg:text-6xl font-black tracking-tighter">{formatVND(currentOrder.totalAmount)}đ</span>
                </div>
              </div>
            </div>

            {/* PHẦN 2: CHỌN PHƯƠNG THỨC VÀ XỬ LÝ THANH TOÁN */}
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
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền mặt khách đưa</label>
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
                       <span className="font-bold text-gray-400 uppercase tracking-widest">Hóa đơn:</span>
                       <span className="font-black text-gray-700">{formatVND(currentOrder.totalAmount)}đ</span>
                    </div>
                    <div className="h-px bg-gray-200 border-dashed border-b"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền thừa:</span>
                      <span className="text-3xl font-black text-emerald-600">{formatVND(Math.max(0, receivedAmount - currentOrder.totalAmount))}đ</span>
                    </div>
                  </div>
                  <button 
                    disabled={receivedAmount < currentOrder.totalAmount} 
                    onClick={() => finalizePayment(PaymentMethod.CASH)} 
                    className="w-full bg-[#4B3621] text-white py-7 rounded-[32px] font-black text-sm uppercase shadow-2xl shadow-[#4B3621]/30 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    HOÀN TẤT & IN BILL
                  </button>
                </div>
              )}

              {checkoutStep === 'transfer' && (
                <div className="space-y-8 text-center animate-fade-in">
                  <div className="bg-white p-6 border-2 border-dashed border-blue-100 rounded-[48px] flex flex-col items-center gap-8 shadow-sm">
                    <div className="w-52 h-52 bg-white rounded-3xl overflow-hidden border-4 border-gray-50 p-2 shadow-inner">
                      <img src={`${BANK_QR_IMAGE_URL}&amount=${currentOrder.totalAmount}`} className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Số tiền chuyển khoản</p>
                      <h4 className="text-4xl font-black text-blue-700 tracking-tighter">{formatVND(currentOrder.totalAmount)}đ</h4>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setCheckoutStep('method')} className="flex-1 bg-gray-100 text-gray-500 py-6 rounded-3xl font-black text-[10px] uppercase active:bg-gray-200 transition-colors">QUAY LẠI</button>
                    <button onClick={() => finalizePayment(PaymentMethod.BANK_TRANSFER)} className="flex-[2] bg-[#4B3621] text-white py-6 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-[#4B3621]/20 active:scale-95 transition-transform">XÁC NHẬN ĐÃ NHẬN</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Mở Bàn */}
      {showOpenTableModal && selectedTable && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOpenTableModal(false)}></div>
          <div className="relative bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-slide-up border border-white/20">
            <h3 className="text-2xl font-black text-[#4B3621] mb-8 uppercase tracking-tighter text-center">Bắt đầu phục vụ {selectedTable.name}</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Tên khách hàng (không bắt buộc)</label>
                <input type="text" autoFocus value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="VD: Anh Hoàng, Chị Lan..." className="w-full bg-gray-50 border-none rounded-3xl p-6 font-bold outline-none focus:ring-2 focus:ring-[#C2A383] transition-all" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowOpenTableModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-3xl font-black text-[10px] uppercase">HỦY</button>
                <button onClick={handleOpenTable} className="flex-1 bg-[#4B3621] text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-[#4B3621]/20 active:scale-95 transition-transform">MỞ BÀN</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPOS;
