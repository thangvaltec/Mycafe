import React, { useState } from 'react';
import { Order, PaymentMethod, Table } from '../../types';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';
import { getBankQrUrl, getBankSettings, SUPPORTED_BANKS } from '../../utils/settings';
import { api } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';

interface CheckoutModalProps {
    order: Order;
    table?: Table | { id: string, name: string, guestName?: string };
    onClose: () => void;
    onSuccess: () => void;
    onProcessPayment?: (method: PaymentMethod, receivedAmount: number, finalStartTime?: string, finalEndTime?: string) => Promise<void>;
    useOrderId?: boolean;
    startTime?: string;
    isBilliard?: boolean;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ order, table, onClose, onSuccess, useOrderId = false, onProcessPayment, startTime, isBilliard = false }) => {
    const [activeTab, setActiveTab] = useState<'cash' | 'transfer'>('cash');
    const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');
    const receivedAmount = parseVND(receivedAmountStr);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullBill, setShowFullBill] = useState(false);

    // Time Adjustment State
    // Default to order.createdAt as start time if not provided separately
    const [adjustedStartTime, setAdjustedStartTime] = useState<string>(
        startTime || (table && 'startTime' in table ? (table as any).startTime : order.createdAt)
    );
    const [adjustedEndTime, setAdjustedEndTime] = useState<string>(new Date().toISOString());
    // Price Per Hour should be passed or inferred. For now, assume fixed or extract from first time item.
    // Hack: Extract price from the existing time fee item if available, else default 20k
    const timeItem = order.items.find(i => i.productId === 'billiard-fee');
    const pricePerHour = timeItem ? (timeItem.price / (timeItem.quantity > 0 ? timeItem.quantity : 1)) : 20000; // Simplified estimation

    // --- DISCOUNT STATE ---
    const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Recalculate Logic
    const calculateNewTotal = () => {
        let subTotal = order.totalAmount;

        if (isBilliard) {
            const start = new Date(adjustedStartTime).getTime();
            const end = new Date(adjustedEndTime).getTime();
            if (!isNaN(start) && !isNaN(end) && start < end) {
                const durationHours = (end - start) / (1000 * 60 * 60);
                const newTimeFee = Math.ceil((durationHours * pricePerHour) / 1000) * 1000;

                const otherItemsTotal = order.items
                    .filter(i => i.productId !== 'billiard-fee')
                    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

                subTotal = newTimeFee + otherItemsTotal;
            }
        }

        // Apply Discount
        let discountAmt = 0;
        if (discountValue > 0) {
            if (discountMode === 'percent') {
                discountAmt = (subTotal * discountValue) / 100;
            } else {
                discountAmt = discountValue;
            }
        }
        if (discountAmt > subTotal) discountAmt = subTotal;

        return Math.max(0, subTotal - discountAmt);
    };

    const currentTotal = calculateNewTotal();
    const calculateDiscountAmount = () => {
        let base = isBilliard ? (currentTotal + (discountValue > 0 ? (discountMode === 'percent' ? (currentTotal / (1 - discountValue / 100) * discountValue / 100) : discountValue) : 0)) : order.totalAmount;
        // Logic trap above. Simpler: Re-calculate SubTotal then apply discount.
        // Let's rely on standard logic:
        let sub = order.totalAmount; // Default standard
        if (isBilliard) {
            const start = new Date(adjustedStartTime).getTime();
            const end = new Date(adjustedEndTime).getTime();
            if (!isNaN(start) && !isNaN(end) && start < end) {
                const durationHours = (end - start) / (1000 * 60 * 60);
                const newTimeFee = Math.ceil((durationHours * pricePerHour) / 1000) * 1000;
                const otherItemsTotal = order.items.filter(i => i.productId !== 'billiard-fee').reduce((sum, item) => sum + (item.price * item.quantity), 0);
                sub = newTimeFee + otherItemsTotal;
            }
        }

        if (discountValue <= 0) return 0;
        if (discountMode === 'percent') return (sub * discountValue) / 100;
        return Math.min(sub, discountValue);
    };
    const discountAmount = calculateDiscountAmount();


    const attemptPayment = async (method: PaymentMethod) => {
        // If Discount > 0, Require Password
        if (discountAmount > 0) {
            setShowPasswordPrompt(true);
            return; // Wait for password
        }
        await finalizePayment(method);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Unify with main Admin password (checking against database)
            const res = await api.login('admin', passwordInput);
            if (res.token) {
                setShowPasswordPrompt(false);
                finalizePayment(activeTab === 'cash' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER);
            } else {
                alert("Mật khẩu không đúng!");
                setPasswordInput('');
            }
        } catch (err) {
            alert("Lỗi xác thực hoặc lỗi kết nối!");
            setPasswordInput('');
        }
    };

    const finalizePayment = async (method: PaymentMethod) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalReceived = method === PaymentMethod.CASH ? receivedAmount : currentTotal;

        try {
            if (isBilliard) {
                if (onProcessPayment) {
                    await onProcessPayment(method, finalReceived, adjustedStartTime, adjustedEndTime);
                } else {
                    await api.billiardCheckout(
                        useOrderId ? Number(order.id) : Number(table?.id || order.tableId),
                        method,
                        finalReceived,
                        adjustedStartTime,
                        adjustedEndTime,
                        discountAmount // Pass Discount
                    );
                }
            } else {
                // Service View / Regular Order Checkout
                if (onProcessPayment) {
                    await onProcessPayment(method, finalReceived); // Add discount params if needed in callback interface?
                    // Assuming onProcessPayment for Standard DOES NOT support discount yet if it's external.
                    // But standard `adminPOS` uses `checkoutOrder` inside usually? No, `AdminPOS.tsx` uses `api.billiardCheckout`? 
                    // No, `AdminPOS.tsx` sets `CheckoutModal`. `CheckoutModal` calls `api.checkoutOrder` (line 82).
                } else {
                    // Use correct API for regular orders
                    await api.checkoutOrder(order.id, method, finalReceived, discountAmount);
                }
            }
            onSuccess();
        } catch (err: any) {
            alert('❌ Lỗi thanh toán: ' + (err.message || err));
            setIsSubmitting(false);
            setShowPasswordPrompt(false);
        }
    };

    // USER REQUEST: Fixed denominations for quick selection
    const commonDenominations = [20000, 50000, 100000, 200000, 500000];

    // Filter to show relevant denominations (e.g., if bill is 300k, don't show 20k/50k/100k/200k as sole payment? 
    // Actually, usually users want to tap "500k" when bill is 300k. 
    // They might also want to tap "20k" if bill is 15k.
    // Let's just show all common ones that are "reasonable" or just all of them + Exact Amount.
    const quickAmounts = [
        currentTotal, // "Đúng số tiền"
        ...commonDenominations.filter(d => d >= currentTotal) // USER REQUEST: Only show amounts >= total
    ].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i); // Unique & Sorted

    // Time Options Generator (00:00 - 23:45)
    const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
        const h = Math.floor(i / 4);
        const m = (i % 4) * 15;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });

    // Helper to get HH:mm from ISO
    const getHHMM = (isoString: string) => {
        const d = new Date(isoString);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // Helper to update Time part of ISO
    const updateTimePart = (isoString: string, newTime: string) => {
        const [h, m] = newTime.split(':').map(Number);
        const d = new Date(isoString);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 h-[100dvh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            {/* Main Modal Container - Safari Safe Area Fix: use h-full or h-[100dvh] on mobile */}
            <div className="relative w-full md:max-w-[1000px] h-full md:h-[650px] bg-[#FAF9F6] md:rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row animate-slide-up ring-4 ring-white/50">

                {/* Close Button */}
                {/* Close Button - User requested clear "Đóng" button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-[#4B3621] font-bold text-xs shadow-sm border border-gray-100 transition-all">
                    Đóng <i className="fas fa-times ml-1"></i>
                </button>

                {/* LEFT COLUMN: THE BILL (Mobile: Collapsible Header) */}
                <div className={`w-full md:w-[55%] bg-[#FAF9F6] flex flex-col border-b md:border-b-0 md:border-r border-[#D4A373]/10 relative transition-all duration-300 shrink-0 ${showFullBill ? 'max-h-[60%] shadow-xl z-20' : 'max-h-[100px] md:max-h-full'}`}>

                    {/* Header Summary (Clickable on Mobile) */}
                    <div className="p-5 md:p-8 shrink-0 flex flex-col items-center relative cursor-pointer active:bg-black/5 transition-colors border-b border-[#D4A373]/10 min-h-[110px]" onClick={() => setShowFullBill(!showFullBill)}>
                        {/* 1. Left: Order Info */}
                        <div className="absolute left-5 md:left-8 top-1/2 -translate-y-1/2 text-left max-w-[35%]">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[9px] font-black text-[#C2A383] uppercase tracking-widest">Hóa đơn</p>
                                <i className={`fas fa-chevron-down text-[#C2A383] text-[9px] md:hidden transition-transform ${showFullBill ? 'rotate-180' : ''}`}></i>
                            </div>
                            <h2 className="text-base md:text-xl font-black text-[#4B3621] uppercase truncate leading-tight">{table?.name || 'Khách'}</h2>
                            <p className="text-[9px] font-bold text-gray-400 truncate opacity-70">Order #{order.orderNumber || order.id.slice(-4)}</p>
                        </div>

                        {/* 2. Center: Total Amount (THE FOCUS) */}
                        <div className="text-center flex flex-col justify-center animate-fade-in">
                            <p className="text-[10px] uppercase text-[#C2A383] font-black tracking-[0.2em] mb-1">Cần thanh toán</p>
                            <p className="text-4xl md:text-5xl font-black text-[#4B3621] tracking-tighter leading-none">{formatVND(currentTotal)}</p>
                            {discountAmount > 0 && (
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 line-through opacity-50">{formatVND(currentTotal + discountAmount)}</span>
                                    <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-black">-{formatVND(discountAmount)}</span>
                                </div>
                            )}
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
                    {/* Time Sections Input - Simplified */}
                    {isBilliard && (
                        <div className="p-6 bg-white border-b border-gray-100 flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Giờ bắt đầu</label>
                                <div className="relative">
                                    {/* Date part is implicitly handled by adjustedStartTime's initial value */}
                                    <select
                                        value={getHHMM(adjustedStartTime)}
                                        onChange={e => setAdjustedStartTime(updateTimePart(adjustedStartTime, e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-[#4B3621] appearance-none"
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Giờ kết thúc</label>
                                <div className="relative">
                                    {/* Date part is implicitly handled by adjustedEndTime's initial value */}
                                    <select
                                        value={getHHMM(adjustedEndTime)}
                                        onChange={e => setAdjustedEndTime(updateTimePart(adjustedEndTime, e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-[#4B3621] appearance-none"
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- DISCOUNT SECTION --- */}
                    <div className="p-6 bg-red-50/50 border-t border-red-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px]">
                                    <i className="fas fa-tags"></i>
                                </div>
                                <span className="text-[11px] font-black text-red-800 uppercase tracking-widest">Giảm giá / Chiết khấu</span>
                            </div>
                            <div className="flex bg-white rounded-lg p-0.5 border border-red-100 shadow-sm">
                                <button
                                    onClick={() => { setDiscountMode('percent'); setDiscountValue(0); }}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${discountMode === 'percent' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                    %
                                </button>
                                <button
                                    onClick={() => { setDiscountMode('amount'); setDiscountValue(0); }}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${discountMode === 'amount' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                    VNĐ
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={discountMode === 'percent' ? discountValue : formatVND(discountValue)}
                                    onChange={(e) => {
                                        const rawVal = e.target.value.replace(/\D/g, '');
                                        let val = rawVal ? parseInt(rawVal) : 0;
                                        if (discountMode === 'percent' && val > 100) val = 100;
                                        setDiscountValue(val);
                                    }}
                                    className="w-full bg-white border border-red-100 rounded-xl px-4 py-2 font-black text-red-800 focus:border-red-300 outline-none text-right"
                                    placeholder="0"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-red-300 font-bold">
                                    {discountMode === 'percent' ? 'Mức giảm (%)' : 'Số tiền (đ)'}
                                </span>
                            </div>
                            <div className="text-right min-w-[80px]">
                                <p className="text-[9px] font-bold text-red-300 uppercase">Được giảm</p>
                                <p className="text-lg font-black text-red-500">-{formatVND(discountAmount)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: PAYMENT ACTIONS */}
                <div className="w-full md:w-[45%] bg-white flex flex-col flex-1 overflow-hidden relative rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none pb-safe">

                    {/* Payment Method Tabs */}
                    <div className="p-1 m-3 mb-2 bg-gray-100 rounded-[20px] flex relative shrink-0">
                        <div className={`absolute inset-y-1 w-1/2 bg-white rounded-[18px] shadow-sm transition-transform duration-300 ease-out ${activeTab === 'transfer' ? 'translate-x-[100%]' : 'translate-x-0'}`}></div>

                        <button onClick={() => setActiveTab('cash')} className={`relative z-10 flex-1 py-2 rounded-[18px] text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'cash' ? 'text-[#4B3621]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="fas fa-money-bill-wave text-sm"></i>
                            Tiền mặt
                        </button>
                        <button onClick={() => setActiveTab('transfer')} className={`relative z-10 flex-1 py-2 rounded-[18px] text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'transfer' ? 'text-[#4B3621]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="fas fa-qrcode text-sm"></i>
                            Chuyển khoản
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 px-5 md:px-8 py-2 overflow-y-auto relative no-scrollbar">

                        {/* CASH VIEW */}
                        <div className={`transition-all duration-300 ${activeTab === 'cash' ? 'block opacity-100' : 'hidden opacity-0'}`}>
                            <div className="space-y-6 animate-fade-in pb-20"> {/* Extra padding bottom for scroll */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">KHÁCH ĐƯA (VNĐ)</label>
                                    <div className="relative group">
                                        <input
                                            autoFocus={activeTab === 'cash'}
                                            type="text"
                                            inputMode="numeric"
                                            value={receivedAmountStr}
                                            onChange={(e) => setReceivedAmountStr(handleMoneyInput(e.target.value))}
                                            className="w-full bg-white border-2 border-[#E5E7EB] focus:border-[#C2A383] rounded-xl py-3 px-5 text-right text-2xl font-black text-[#4B3621] outline-none transition-all placeholder-gray-300 shadow-sm"
                                            placeholder="0"
                                        />
                                        {/* Clear Button inside Input */}
                                        {receivedAmountStr && (
                                            <button onClick={() => setReceivedAmountStr('')} className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500">
                                                <i className="fas fa-times text-[10px]"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Quick Suggestions - Fixed Grid */}
                                    <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-3 mb-1.5 ml-1">Gợi ý nhanh</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {quickAmounts.map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setReceivedAmountStr(formatVND(amt))}
                                                className={`px-1.5 py-2 border rounded-lg text-[10px] font-black transition-all active:scale-95 flex flex-col items-center justify-center
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
                                        <span className="text-2xl font-black text-emerald-600">{formatVND(Math.max(0, receivedAmount - currentTotal))}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <i className="fas fa-hand-holding-usd"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TRANSFER VIEW */}
                        <div className={`transition-all duration-300 h-full flex flex-col items-center pt-8 ${activeTab === 'transfer' ? 'flex opacity-100' : 'hidden opacity-0'}`}>
                            <div className="bg-white p-4 rounded-[32px] shadow-xl border-2 border-[#D4A373]/10 mb-8 shrink-0 flex flex-col items-center">
                                <img
                                    src={getBankQrUrl(currentTotal, `Thanh toan Order`)}
                                    alt="Mã QR Chuyển khoản"
                                    className="w-[200px] h-[300px] object-contain mix-blend-multiply"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Số tiền cần chuyển</p>
                                <p className="text-4xl font-black text-[#4B3621] tracking-tighter">{formatVND(currentTotal)}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Quét mã bằng ứng dụng Ngân hàng</p>
                            </div>
                        </div>

                        {/* Bottom Action Button - FIXED SAFARI PADDING */}
                        {/* Added pb-8 md:pb-8 for extra bottom breathing room, essential for Safari mobile */}
                        <div className="p-5 md:p-8 pt-4 mt-auto shrink-0 bg-white border-t border-gray-50 pb-12 md:pb-8">
                            <button
                                onClick={() => attemptPayment(activeTab === 'cash' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER)}
                                disabled={isSubmitting || (activeTab === 'cash' && receivedAmount < currentTotal)}
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

            {/* PASSWORD MODAL OVERLAY */}
            {showPasswordPrompt && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl scale-100 animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                <i className="fas fa-lock"></i>
                            </div>
                            <h3 className="text-xl font-black text-[#4B3621] uppercase">Xác nhận giảm giá</h3>
                            <p className="text-sm text-gray-500 mt-2">Vui lòng nhập mật khẩu Admin để áp dụng mức giảm <b>{formatVND(discountAmount)}</b></p>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <input
                                autoFocus
                                type="password"
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center font-bold text-[#4B3621] outline-none focus:border-[#C2A383]"
                                placeholder="Nhập mật khẩu..."
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowPasswordPrompt(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-200">Hủy</button>
                                <button type="submit" className="flex-1 py-3 bg-[#4B3621] text-white rounded-xl font-bold uppercase text-xs hover:bg-[#3E2C1B]">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutModal;
