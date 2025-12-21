
import React, { useState } from 'react';
import { Order, PaymentMethod, Table } from '../../types';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';
import { BANK_QR_IMAGE_URL } from '../../constants';
import { api } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';

interface CheckoutModalProps {
    order: Order;
    table?: Table | { id: string, name: string };
    onClose: () => void;
    onSuccess: () => void;
    onProcessPayment?: (method: PaymentMethod, receivedAmount: number) => Promise<void>;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ order, table, onClose, onSuccess, useOrderId = false, onProcessPayment }) => {
    const [activeTab, setActiveTab] = useState<'cash' | 'transfer'>('cash');
    const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');
    const receivedAmount = parseVND(receivedAmountStr);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullBill, setShowFullBill] = useState(false); // Mobile toggle

    const finalizePayment = async (method: PaymentMethod) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalReceived = method === PaymentMethod.CASH ? receivedAmount : order.totalAmount;

        try {
            if (onProcessPayment) {
                await onProcessPayment(method, finalReceived);
            } else {
                await api.checkout(
                    useOrderId ? order.id : (table?.id || order.tableId),
                    method,
                    finalReceived,
                    useOrderId
                );
            }
            onSuccess();
        } catch (err: any) {
            alert('❌ Lỗi thanh toán: ' + (err.message || err));
            setIsSubmitting(false);
        }
    };

    // USER REQUEST: Fixed denominations for quick selection
    const commonDenominations = [20000, 50000, 100000, 200000, 500000];

    // Filter to show relevant denominations (e.g., if bill is 300k, don't show 20k/50k/100k/200k as sole payment? 
    // Actually, usually users want to tap "500k" when bill is 300k. 
    // They might also want to tap "20k" if bill is 15k.
    // Let's just show all common ones that are "reasonable" or just all of them + Exact Amount.
    const quickAmounts = [
        order.totalAmount, // "Đúng số tiền"
        ...commonDenominations.filter(d => d >= order.totalAmount || d > 10000) // Show all common notes, maybe filtered slightly?
    ].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i); // Unique & Sorted


    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 h-[100dvh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            {/* Main Modal Container - Safari Safe Area Fix: use h-full or h-[100dvh] on mobile */}
            <div className="relative w-full md:max-w-[1000px] h-full md:h-[650px] bg-[#FAF9F6] md:rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row animate-slide-up ring-4 ring-white/50">

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#4B3621] flex items-center justify-center transition-colors shadow-sm">
                    <i className="fas fa-times text-lg"></i>
                </button>

                {/* LEFT COLUMN: THE BILL (Mobile: Collapsible Header) */}
                <div className={`w-full md:w-[55%] bg-[#FAF9F6] flex flex-col border-b md:border-b-0 md:border-r border-[#D4A373]/10 relative transition-all duration-300 shrink-0 ${showFullBill ? 'max-h-[60%] shadow-xl z-20' : 'max-h-[100px] md:max-h-full'}`}>

                    {/* Header Summary (Clickable on Mobile) */}
                    <div className="p-5 md:p-8 shrink-0 flex justify-between items-start cursor-pointer md:cursor-default active:bg-black/5 md:active:bg-transparent transition-colors" onClick={() => setShowFullBill(!showFullBill)}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[10px] font-black text-[#C2A383] uppercase tracking-[0.2em]">Hóa đơn</p>
                                <i className={`fas fa-chevron-down text-[#C2A383] text-xs md:hidden transition-transform ${showFullBill ? 'rotate-180' : ''}`}></i>
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black text-[#4B3621] tracking-tighter uppercase truncate pr-4">{table?.name || 'Khách'}</h2>
                            <p className="text-[10px] md:text-sm font-bold text-gray-400">Order #{order.orderNumber || order.id.slice(-4)}</p>
                        </div>
                        <div className="text-right flex flex-col justify-center h-full">
                            <p className="text-xl md:text-3xl font-black text-[#4B3621] tracking-tight">{formatVND(order.totalAmount)}</p>
                        </div>
                    </div>

                    {/* Scrollable Items List */}
                    {/* Scrollable Items List */}
                    <div className={`flex-1 overflow-y-auto px-6 md:px-8 py-2 space-y-3 mask-image-b bg-[#FAF9F6] ${showFullBill ? 'block' : 'hidden md:block'}`}>
                        {/* 1. Billiard Fee Section */}
                        {order.items.filter(i => i.productId === 'billiard-fee').map((item, idx) => (
                            <div key={`billiard-${idx}`} className="bg-[#4B3621] p-4 rounded-xl shadow-lg shadow-[#4B3621]/20 mb-4 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <i className="fas fa-stopwatch text-6xl"></i>
                                </div>
                                <div className="relative z-10 font-bold">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] uppercase text-white/50 tracking-widest">Tiền giờ</span>
                                        <span className="text-xl font-black text-emerald-400">{formatVND(item.price)}</span>
                                    </div>
                                    <p className="text-sm font-black text-white">{item.productName}</p>
                                    <p className="text-[10px] text-white/40 mt-1 italic">Đã bao gồm trong tổng cộng</p>
                                </div>
                            </div>
                        ))}

                        {/* 2. Menu Items Section */}
                        {order.items.filter(i => i.productId !== 'billiard-fee').length > 0 && (
                            <>
                                {order.items.some(i => i.productId === 'billiard-fee') && (
                                    <div className="flex items-center gap-2 px-1 mt-6 mb-2">
                                        <i className="fas fa-utensils text-[10px] text-[#C2A383]"></i>
                                        <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Menu đã gọi</p>
                                    </div>
                                )}

                                {order.items.filter(i => i.productId !== 'billiard-fee').map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 border-b border-dashed border-[#D4A373]/20 last:border-0 hover:bg-white/50 px-2 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <span className="w-8 h-8 rounded-lg bg-white border border-[#D4A373]/20 text-[#4B3621] font-black text-xs flex items-center justify-center shadow-sm">
                                                {item.quantity}
                                            </span>
                                            <div>
                                                <p className="font-bold text-[#4B3621] text-sm group-hover:text-[#C2A383] transition-colors">{item.productName}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{formatVND(item.price)}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-[#4B3621] text-sm">{formatVND(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: PAYMENT ACTIONS */}
                <div className="w-full md:w-[45%] bg-white flex flex-col flex-1 overflow-hidden relative rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none pb-safe">

                    {/* Payment Method Tabs */}
                    <div className="p-1 m-4 sm:m-6 mb-2 bg-gray-100 rounded-[24px] flex relative shrink-0">
                        <div className={`absolute inset-y-1 w-1/2 bg-white rounded-[20px] shadow-sm transition-transform duration-300 ease-out ${activeTab === 'transfer' ? 'translate-x-[100%]' : 'translate-x-0'}`}></div>

                        <button onClick={() => setActiveTab('cash')} className={`relative z-10 flex-1 py-3 md:py-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'cash' ? 'text-[#4B3621]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="fas fa-money-bill-wave text-lg"></i>
                            Tiền mặt
                        </button>
                        <button onClick={() => setActiveTab('transfer')} className={`relative z-10 flex-1 py-3 md:py-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'transfer' ? 'text-[#4B3621]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="fas fa-qrcode text-lg"></i>
                            Chuyển khoản
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 px-5 md:px-8 py-2 overflow-y-auto relative no-scrollbar">

                        {/* CASH VIEW */}
                        <div className={`transition-all duration-300 ${activeTab === 'cash' ? 'block opacity-100' : 'hidden opacity-0'}`}>
                            <div className="space-y-6 animate-fade-in pb-20"> {/* Extra padding bottom for scroll */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">KHÁCH ĐƯA (VNĐ)</label>
                                    <div className="relative group">
                                        <input
                                            autoFocus={activeTab === 'cash'}
                                            type="text"
                                            inputMode="numeric"
                                            value={receivedAmountStr}
                                            onChange={(e) => setReceivedAmountStr(handleMoneyInput(e.target.value))}
                                            className="w-full bg-white border-2 border-[#E5E7EB] focus:border-[#C2A383] rounded-2xl py-5 px-6 text-right text-3xl font-black text-[#4B3621] outline-none transition-all placeholder-gray-300 shadow-sm"
                                            placeholder="0"
                                        />
                                        {/* Clear Button inside Input */}
                                        {receivedAmountStr && (
                                            <button onClick={() => setReceivedAmountStr('')} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500">
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Quick Suggestions - Fixed Grid */}
                                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-4 mb-2 ml-1">Gợi ý nhanh</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {quickAmounts.map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setReceivedAmountStr(formatVND(amt))}
                                                className={`px-2 py-3 border rounded-xl text-[11px] font-black transition-all active:scale-95 flex flex-col items-center justify-center
                                                    ${receivedAmount === amt
                                                        ? 'bg-[#4B3621] text-white border-[#4B3621] shadow-md'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#C2A383] hover:text-[#C2A383]'
                                                    }`}
                                            >
                                                {formatVND(amt)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Tiền thừa trả khách</span>
                                        <span className="text-2xl font-black text-emerald-600">{formatVND(Math.max(0, receivedAmount - order.totalAmount))}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <i className="fas fa-hand-holding-usd"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TRANSFER VIEW */}
                        <div className={`transition-all duration-300 h-full flex flex-col items-center pt-8 ${activeTab === 'transfer' ? 'flex opacity-100' : 'hidden opacity-0'}`}>
                            <div className="bg-white p-4 rounded-[32px] shadow-xl border-2 border-[#D4A373]/10 mb-8 shrink-0">
                                <QRCodeSVG
                                    value={`${BANK_QR_IMAGE_URL}&amount=${order.totalAmount}`}
                                    size={200}
                                    level="M"
                                    imageSettings={{
                                        src: "https://imagedelivery.net/KMb5Epp0S1q9aD0Wl4yV_A/b404431f-0e6e-4c74-0466-417163821f00/public",
                                        x: undefined,
                                        y: undefined,
                                        height: 30,
                                        width: 30,
                                        excavate: true,
                                    }}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Số tiền cần chuyển</p>
                                <p className="text-4xl font-black text-[#4B3621] tracking-tighter">{formatVND(order.totalAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Button - FIXED SAFARI PADDING */}
                    {/* Added pb-8 md:pb-8 for extra bottom breathing room, essential for Safari mobile */}
                    <div className="p-5 md:p-8 pt-4 mt-auto shrink-0 bg-white border-t border-gray-50 pb-12 md:pb-8">
                        <button
                            onClick={() => finalizePayment(activeTab === 'cash' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER)}
                            disabled={isSubmitting || (activeTab === 'cash' && receivedAmount < order.totalAmount)}
                            className={`w-full py-5 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-3
                                ${activeTab === 'cash'
                                    ? 'bg-[#4B3621] text-white hover:bg-[#3E2C1B] disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            {isSubmitting ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <span>{activeTab === 'cash' ? 'Hoàn tất thanh toán' : 'Xác nhận đã nhận tiền'}</span>
                                    <i className="fas fa-arrow-right"></i>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
