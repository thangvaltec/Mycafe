// Imports update
import React, { useState } from 'react';
import { Order, OrderStatus, Table } from '../../types';
import { formatVND } from '../../utils/format';
import { api } from '../../services/api';
import CheckoutModal from './CheckoutModal';

interface AdminTakeawayProps {
  orders: Order[];
  tables: Table[];
  onUpdateOrder: (o: Order) => void;
  onOpenOrderView: (table: { id: string, name: string, guestName?: string }) => void;
}

const AdminTakeaway: React.FC<AdminTakeawayProps> = ({ orders, tables, onUpdateOrder, onOpenOrderView }) => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Find the real "Mang về" table from database (by Alias or TableNumber)
  const takeawayTable = tables.find(t => t.alias === 'Takeaway' || t.tableNumber === 'MV' || t.name.includes('Mang về'));
  const takeawayTableId = takeawayTable?.id || '';

  // Debug: Log if table not found
  if (!takeawayTable && tables.length > 0) {
    console.warn('⚠️ Không tìm thấy bàn "Mang về". Tables hiện có:', tables.map(t => ({ id: t.id, name: t.name, alias: t.alias, tableNumber: t.tableNumber })));
  }

  const takeawayOrder = orders.find(o => o.tableId === takeawayTableId && o.status !== OrderStatus.PAID);

  const startCheckout = () => {
    if (!takeawayOrder) return;
    setShowCheckoutModal(true);
  };

  const handleCreateOrder = () => {
    if (!takeawayTable) {
      alert('Lỗi: Không tìm thấy bàn "Mang về" trong hệ thống. Vui lòng liên hệ quản trị viên.');
      return;
    }
    console.log('🚀 Tạo đơn mang về cho bàn:', takeawayTable);
    onOpenOrderView({ id: takeawayTable.id, name: 'Mang Về' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-[#10b981] rounded-[48px] p-10 text-white shadow-2xl shadow-emerald-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-20 -mt-20 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Khách Mang Về</h3>
            <p className="text-emerald-100 font-bold text-sm max-w-sm">Hệ thống ghi món và thanh toán nhanh chóng cho khách không ngồi tại quán.</p>
            {!takeawayTable && <p className="text-yellow-300 text-xs mt-2 font-bold">⚠️ Chưa có bàn "Mang về" trong hệ thống</p>}
          </div>
          <button
            onClick={handleCreateOrder}
            disabled={!takeawayTable}
            className="bg-white text-[#10b981] px-10 py-5 rounded-[28px] font-black text-sm shadow-xl hover:scale-105 transition-transform active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
        <CheckoutModal
          order={takeawayOrder}
          table={takeawayTable}
          useOrderId={true}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            setShowCheckoutModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default AdminTakeaway;
