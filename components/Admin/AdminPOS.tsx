
import React, { useState } from 'react';
import { Table, Order, OrderStatus, PaymentMethod } from '../../types';

import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';
import { api } from '../../services/api';
import CheckoutModal from './CheckoutModal';
import { QRCodeSVG } from 'qrcode.react';

interface AdminPOSProps {
  tables: Table[];
  orders: Order[];
  onUpdateTable: (t: Table) => void;
  onUpdateOrder: (o: Order) => void;
  onOpenOrderView: (table: Table | { id: string, name: string, guestName?: string }) => void;
  onAddTable: () => void;
  onDeleteTable: (id: number) => void;
}

const AdminPOS: React.FC<AdminPOSProps> = ({ tables, orders, onUpdateTable, onUpdateOrder, onOpenOrderView, onAddTable, onDeleteTable }) => {
  const [selectedTable, setSelectedTable] = useState<Table | { id: string, name: string, guestName?: string } | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showOpenTableModal, setShowOpenTableModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTable, setQrTable] = useState<Table | null>(null);

  // Quick View State
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  const currentOrder = selectedTable ? orders.find(o => o.tableId === selectedTable.id && o.status !== OrderStatus.PAID) : null;

  const handleOpenTable = () => {
    if (selectedTable && 'isOccupied' in selectedTable) {
      const table = selectedTable as Table;
      onUpdateTable({ ...table, isOccupied: true, guestName: guestName || '' });
      setShowOpenTableModal(false);
      setGuestName('');
      onOpenOrderView({ ...table, isOccupied: true, guestName: guestName || '' });
    }
  };

  const startCheckout = (table: Table | { id: string, name: string, guestName?: string }) => {
    setSelectedTable(table);
    setShowCheckoutModal(true);
  };


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

  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editPassword, setEditPassword] = useState('');

  const handleToggleEditMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setShowEditPasswordModal(true);
      setEditPassword('');
    } else {
      setIsEditMode(false);
    }
  };

  const confirmEditMode = async () => {
    try {
      const res = await api.login('admin', editPassword);
      if (res.token) {
        setIsEditMode(true);
        setShowEditPasswordModal(false);
      } else {
        alert("Mật khẩu không đúng!");
      }
    } catch {
      alert("Mật khẩu không đúng hoặc lỗi kết nối!");
    }
  };

  // ... (rest of simple states)

  // ... (inside return)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pl-2 gap-4">
        <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter">Sơ đồ bàn</h3>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-white border border-gray-100 px-3 py-2 rounded-2xl shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <label className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer select-none">
              <input type="checkbox" checked={isEditMode} onChange={handleToggleEditMode} className="hidden" />
              Chỉnh sửa
            </label>
          </div>
          <button onClick={onAddTable} className="bg-[#4B3621] text-white px-6 py-2 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 hover:bg-[#C2A383] transition-all">+ Thêm bàn</button>
        </div>
      </div>

      {showEditPasswordModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditPasswordModal(false)}></div>
          <div className="relative bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black text-[#4B3621] mb-2 uppercase text-center">Xác thực Admin</h3>
            <p className="text-xs text-gray-500 font-bold text-center mb-6">Nhập mật khẩu quản trị để mở khóa xóa bàn</p>
            <input
              type="password"
              autoFocus
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmEditMode()}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-black text-center outline-none focus:border-[#C2A383] mb-6"
              placeholder="Mật khẩu admin"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowEditPasswordModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-[10px] uppercase">Hủy</button>
              <button onClick={confirmEditMode} className="flex-1 bg-[#4B3621] text-white py-3 rounded-xl font-bold text-[10px] uppercase shadow-lg">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6">
        {tables.filter(t => {
          // Safety check for missing/null fields
          // Assuming tableNumber might be missing or different case if API issue
          const tNum = t.tableNumber || '';
          const tAlias = t.alias || '';
          return !tNum.startsWith('BI-') && tAlias !== 'Bi-a';
        }).map(t => {
          const tableOrder = orders.find(o => o.tableId === t.id && o.status !== OrderStatus.PAID);
          return (
            <div key={t.id} className={`relative px-5 py-5 rounded-[28px] border-2 transition-all flex flex-col justify-between min-h-[180px] shadow-sm ${t.isOccupied ? 'bg-[#4B3621] text-white border-transparent' : 'bg-white text-gray-400 border-gray-100 hover:border-[#C2A383]'} ${isEditMode && !t.isOccupied ? 'border-red-200 border-dashed bg-red-50/10' : ''}`}>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl lg:text-2xl font-black tracking-tighter leading-none">{t.name}</h3>
                  {tableOrder && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedOrderForDetail(tableOrder); }}
                      className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm transition-colors uppercase tracking-wider"
                    >
                      Chi tiết
                    </button>
                  )}
                </div>

                <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${t.isOccupied ? 'text-white/40' : 'text-gray-300'}`}>{t.alias}</p>

                {t.isOccupied && tableOrder ? (
                  <div className="space-y-3">
                    <p className="text-3xl font-black text-[#C2A383] tracking-tighter leading-none">{formatVND(tableOrder.totalAmount)}đ</p>

                    {(t.guestName && t.guestName !== 'Khách vãng lai') && (
                      <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                        <i className="fas fa-user-circle text-white/40 text-xs"></i>
                        <p className="font-bold text-xs text-white/90 truncate flex-1">{t.guestName}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-12 flex items-center">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest italic opacity-50">Bàn Trống</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {t.isOccupied ? (
                  <>
                    <button onClick={() => onOpenOrderView(t)} className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-black text-[10px] uppercase transition-colors flex flex-col items-center gap-1">
                      <i className="fas fa-utensils text-xs mb-0.5 opacity-60"></i>
                      Ghi món
                    </button>
                    <button onClick={() => startCheckout(t)} className="bg-[#C2A383] text-[#4B3621] py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-transform flex flex-col items-center gap-1">
                      <i className="fas fa-file-invoice-dollar text-xs mb-0.5"></i>
                      Thanh toán
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setSelectedTable(t); setShowOpenTableModal(true); }} className={`col-span-1 bg-gray-50 text-[#4B3621] py-3 rounded-xl font-black text-[10px] uppercase transition-all border border-gray-100 flex flex-col items-center gap-1 group ${!isEditMode ? 'hover:bg-[#4B3621] hover:text-white' : 'opacity-50 cursor-not-allowed'}`} disabled={isEditMode}>
                      <i className="fas fa-door-open text-xs mb-0.5 group-hover:text-current opacity-50"></i>
                      Mở bàn
                    </button>
                    <div className="col-span-1">
                      {isEditMode ? (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteTable(Number(t.id)); }} className="w-full h-full bg-red-50 text-red-500 border border-red-100 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all hover:bg-red-500 hover:text-white flex flex-col items-center justify-center gap-1">
                          <i className="fas fa-trash text-xs"></i> XÓA BÀN
                        </button>
                      ) : (
                        <button onClick={() => { setQrTable(t); setShowQRModal(true); }} className="w-full h-full bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all flex flex-col items-center justify-center gap-1">
                          <i className="fas fa-qrcode text-xs"></i> QR CODE
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

      </div>

      {showCheckoutModal && currentOrder && (
        <CheckoutModal
          order={currentOrder}
          table={selectedTable as Table}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            if (selectedTable && 'isOccupied' in selectedTable) {
              onUpdateTable({ ...(selectedTable as Table), isOccupied: false, currentOrderId: undefined, guestName: '' });
            }
            setShowCheckoutModal(false);
            setSelectedTable(null);
            window.location.reload();
          }}
        />
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
      {/* Modal QR Bàn */}
      {showQRModal && qrTable && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowQRModal(false)}></div>
          <div className="relative bg-white rounded-[50px] p-10 w-full max-w-sm shadow-2xl animate-fade-in text-center">
            <div className="absolute top-6 right-6">
              <button onClick={() => setShowQRModal(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"><i className="fas fa-times"></i></button>
            </div>

            <div className="mt-4 mb-2">
              <h3 className="text-3xl font-black text-[#4B3621] tracking-tighter uppercase mb-1">MÃ QR {qrTable.name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Quét để gọi món tại bàn</p>
            </div>

            <div className="bg-[#FAF9F6] p-8 rounded-[40px] my-8 border-2 border-dashed border-[#C2A383]/30 flex justify-center shadow-inner">
              <QRCodeSVG
                value={`${window.location.protocol}//${window.location.host}/?tableId=${qrTable.id}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-4">
              <button onClick={() => window.print()} className="w-full bg-[#4B3621] text-white py-5 rounded-3xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform"><i className="fas fa-print mr-2"></i> IN MÃ QR</button>
              <p className="text-[9px] text-gray-400 font-medium italic">URL: {window.location.host}/?tableId={qrTable.id}</p>
            </div>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrderForDetail(null)}></div>
          <div className="relative bg-[#FDFCF8] rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-fade-in flex flex-col border border-white/20">
            <h3 className="text-2xl font-black text-[#4B3621] uppercase tracking-tighter mb-1 text-center">Chi tiết món gọi</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center mb-6">Bàn {tables.find(t => String(t.id) === String(selectedOrderForDetail.tableId))?.tableNumber || '?'}</p>

            <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 pr-2 max-h-[50vh]">
              <div className="space-y-3">
                {selectedOrderForDetail.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 shadow-sm odd:bg-[#FAF9F6] even:bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EAE8E4] text-[#4B3621] font-black text-xs flex items-center justify-center border border-white shadow-inner">
                        x{item.quantity}
                      </div>
                      <span className="text-sm font-bold text-[#4B3621] leading-tight">{item.productName}</span>
                    </div>
                    <span className="text-xs font-black text-[#C2A383]">{new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderForDetail(null)}
              className="w-full bg-[#4B3621] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#3E2C1B] active:scale-95 transition-all shadow-lg"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPOS;
