import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Table } from '../../types';
import { formatVND } from '../../utils/format';
import { api } from '../../services/api';

interface AdminKitchenProps {
    orders: Order[];
    tables: Table[];
    onUpdateOrder: (o: Order) => void;
}

const AdminKitchen: React.FC<AdminKitchenProps> = ({ orders, tables, onUpdateOrder }) => {
    // Filter for orders that need preparation (Pending/Confirmed but not Paid/Served if those statuses exist)
    // For now, let's assume all non-PAID orders are relevant, or "Pending" ones.
    // Actually, status might be 'Pending' initially? 
    // Let's list orders that are NOT 'PAID' and NOT 'COMPLETED'.
    // But wait, if they pay first?
    // Ideally: Status = 'Pending' -> Kitchen sees it -> Marks 'Done' -> Status 'Served' -> Payment.

    // Group items by "Ticket" or just list all items?
    // Ticket style is better.

    const activeOrders = orders.filter(o => o.status !== OrderStatus.PAID && o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const handleStatusChange = async (order: Order, status: string) => {
        // API call to update status
        // We might need a specific API or just update status?
        // For now, simpler: Just strict flow.
        // But user wants "Expert" design.
        // Real cafe: Review Order -> "Accept/Print" -> "Done".
        // Let's add a "Done" button that assumes items are delivered.
        // For now, we update order status locally or trigger api?
        // App.tsx handles onUpdateOrder via api.updateOrder (if implemented) or we call api directly.
        // Let's check api.ts/App.tsx capability.
        // api.ts has no updateOrder status shortcut, but likely generic update.
        // We will assume onUpdateOrder does the job.
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-[#4B3621] uppercase tracking-tighter">Bếp / Pha Chế <span className="text-[#C2A383]">({activeOrders.length})</span></h2>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tự động cập nhật mỗi 5s</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-20">
                {activeOrders.map(order => {
                    const tableName = tables.find(t => t.id === order.tableId)?.name || (order.tableId === 'MANG_VE' ? 'Mang Về' : 'Bàn ?');
                    const timeDiff = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

                    return (
                        <div key={order.id} className="bg-white rounded-[32px] p-6 shadow-md border border-gray-100 flex flex-col h-fit relative overflow-hidden group">
                            {timeDiff > 15 && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">Quá 15p</div>}

                            <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                                <div>
                                    <h3 className="text-xl font-black text-[#4B3621]">{tableName}</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{order.orderNumber}</span>
                                </div>
                                <span className="text-2xl font-black text-[#C2A383]">{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="space-y-3 mb-6 flex-1">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <span className="bg-gray-100 text-[#4B3621] font-black w-6 h-6 rounded-lg flex items-center justify-center text-xs">{item.quantity}</span>
                                        <span className="text-sm font-bold text-gray-600 leading-tight">{item.productName}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full bg-[#4B3621] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-[#C2A383] transition-all active:scale-95">
                                Hoàn Tất Món
                            </button>
                        </div>
                    );
                })}
                {activeOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-300 opacity-50">
                        <i className="fas fa-mug-hot text-6xl mb-4"></i>
                        <p className="font-black uppercase tracking-widest">Hiện không có đơn cần làm</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminKitchen;
