
import React, { useState, useMemo } from 'react';
import { Order, PaymentMethod, Table } from '../../types';
import { formatVND, parseVND, handleMoneyInput } from '../../utils/format';
import { BANK_QR_IMAGE_URL } from '../../constants';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';

interface BilliardCheckoutModalProps {
    order: Order;
    table: Table | { id: string, name: string, guestName?: string, startTime?: string };
    pricePerHour: number;
    startTime: string; // Original Start Time
    onClose: () => void;
    onSuccess: () => void;
}

const BilliardCheckoutModal: React.FC<BilliardCheckoutModalProps> = ({
    order, table, pricePerHour, startTime, onClose, onSuccess
}) => {
    // --- Step 1: Verification State ---
    const [step, setStep] = useState<'verify' | 'payment'>('verify');

    // Time State
    const [adjustedStartTime, setAdjustedStartTime] = useState<string>(startTime);
    const [adjustedEndTime, setAdjustedEndTime] = useState<string>(new Date().toISOString());

    // --- Step 2: Payment State ---
    const [activeTab, setActiveTab] = useState<'cash' | 'transfer'>('cash');
    const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');
    const receivedAmount = parseVND(receivedAmountStr);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Calculation Logic ---
    const calculations = useMemo(() => {
        const start = new Date(adjustedStartTime).getTime();
        const end = new Date(adjustedEndTime).getTime();

        let durationMinutes = 0;
        let timeFee = 0;

        if (!isNaN(start) && !isNaN(end) && end > start) {
            durationMinutes = (end - start) / (1000 * 60);
            const durationHours = durationMinutes / 60;
            // Round up fee to nearest 1,000 VND
            timeFee = Math.ceil((durationHours * pricePerHour) / 1000) * 1000;
        }

        const menuFee = order.items
            .filter(i => i.productId !== 'billiard-fee')
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const totalAmount = timeFee + menuFee;

        return {
            durationMinutes: Math.floor(durationMinutes),
            durationString: `${Math.floor(durationMinutes / 60)}h ${Math.floor(durationMinutes % 60)}m`,
            timeFee,
            menuFee,
            totalAmount
        };
    }, [adjustedStartTime, adjustedEndTime, pricePerHour, order.items]);

    // --- Helpers ---
    const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
        const h = Math.floor(i / 4);
        const m = (i % 4) * 15;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });

    const getHHMM = (isoString: string) => {
        const d = new Date(isoString);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const updateTimePart = (isoString: string, newTime: string) => {
        const [h, m] = newTime.split(':').map(Number);
        const d = new Date(isoString);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };

    const handleConfirmTime = () => {
        if (calculations.totalAmount <= 0) {
            alert("Tổng tiền phải lớn hơn 0");
            return;
        }
        setStep('payment');
        setReceivedAmountStr(formatVND(calculations.totalAmount)); // Pre-fill exact amount for convenience
    };

    const handleProcessPayment = async () => {
        if (isSubmitting) return;

        // Final validation
        if (activeTab === 'cash' && receivedAmount < calculations.totalAmount) {
            alert("Tiền khách đưa chưa đủ!");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.billiardCheckout(
                Number(table.id),
                activeTab === 'cash' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER,
                activeTab === 'cash' ? receivedAmount : calculations.totalAmount,
                adjustedStartTime,
                adjustedEndTime
            );
            alert("✅ Thanh toán thành công!");
            onSuccess();
        } catch (err: any) {
            alert("❌ Lỗi thanh toán: " + (err.message || err));
            setIsSubmitting(false);
        }
    };

    const commonDenominations = [20000, 50000, 100000, 200000, 500000];
    const quickAmounts = [
        calculations.totalAmount,
        ...commonDenominations.filter(d => d >= calculations.totalAmount)
    ].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            <div className={`relative w-full bg-[#FAF9F6] rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 animate-slide-up bg-white my-auto
                ${step === 'payment' ? 'max-w-lg md:max-w-5xl md:flex-row md:h-[600px]' : 'max-w-lg'}`}>

                {/* --- LEFT COLUMN: TIME VERIFICATION & BILL SUMMARY --- */}
                <div className={`flex flex-col bg-white transition-all duration-300 relative z-10
                    ${step === 'payment' ? 'w-full md:w-[45%] border-b md:border-b-0 md:border-r border-gray-100 shadow-sm md:shadow-none shrink-0' : 'w-full'}`}>

                    {/* Header */}
                    <div className="p-5 border-b border-gray-50 flex justify-between items-start shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${step === 'verify' ? 'bg-[#C2A383] text-white' : 'bg-green-100 text-green-700'}`}>
                                    {step === 'verify' ? 'Bước 1: Chốt Giờ' : 'Bước 2: Thanh Toán'}
                                </span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-[#4B3621] uppercase tracking-tighter truncate max-w-[200px] md:max-w-[280px]">{table.name}</h2>
                            <p className="text-xs font-bold text-[#C2A383]">{table.guestName || "Khách vãng lai"}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white">

                        {/* Time Inputs Block - Hidden on Mobile Payment Step */}
                        <div className={`bg-[#F8F9FA] rounded-2xl p-4 border border-gray-100 transition-all ${step === 'payment' ? 'hidden md:block opacity-80 grayscale-[0.5] pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#4B3621] text-white flex items-center justify-center text-[10px]">
                                    <i className="fas fa-history"></i>
                                </div>
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Thời gian chơi</span>
                                <span className="ml-auto text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-gray-100 text-[#4B3621]">{calculations.durationString}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 relative">
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Bắt đầu</label>
                                    <div className="relative">
                                        <select
                                            value={getHHMM(adjustedStartTime)}
                                            onChange={e => {
                                                const newStart = updateTimePart(adjustedStartTime, e.target.value);
                                                setAdjustedStartTime(newStart);

                                                // Intelligent Auto-Correction logic
                                                const startCheck = new Date(newStart).getTime();
                                                const currentEndCheck = new Date(adjustedEndTime).getTime();

                                                // If End Time is before or equal to new Start Time, bump it forward
                                                if (currentEndCheck <= startCheck) {
                                                    // Default to +1 hour or at least +15 mins
                                                    const newEnd = new Date(startCheck + 60 * 60 * 1000);
                                                    setAdjustedEndTime(newEnd.toISOString());
                                                }
                                            }}
                                            disabled={step === 'payment'}
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-black text-[#4B3621] appearance-none disabled:bg-gray-50 focus:border-[#C2A383] outline-none shadow-sm"
                                        >
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none"></i>
                                    </div>
                                </div>

                                {/* Connector Line */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center z-10 text-gray-300 text-[8px] sm:flex hidden">
                                    <i className="fas fa-arrow-right"></i>
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Kết thúc</label>
                                    <div className="relative">
                                        <select
                                            value={getHHMM(adjustedEndTime)}
                                            onChange={e => setAdjustedEndTime(updateTimePart(adjustedEndTime, e.target.value))}
                                            disabled={step === 'payment'}
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-black text-[#4B3621] appearance-none disabled:bg-gray-50 focus:border-[#C2A383] outline-none shadow-sm"
                                        >
                                            {/* Only show times AFTER start time */}
                                            {TIME_OPTIONS.filter(t => {
                                                const [h, m] = t.split(':').map(Number);
                                                const itemTime = new Date(adjustedStartTime);
                                                itemTime.setHours(h, m, 0, 0);
                                                return itemTime.getTime() > new Date(adjustedStartTime).getTime();
                                            }).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center pt-3 border-t border-dashed border-gray-200">
                                <span className="text-[10px] text-gray-400">Đơn giá: {formatVND(pricePerHour)}/h</span>
                                <span className="text-lg font-black text-[#4B3621]">{formatVND(calculations.timeFee)}</span>
                            </div>
                        </div>

                        {/* Menu Summary Block - Hidden on Mobile Payment Step */}
                        {order.items.filter(i => i.productId !== 'billiard-fee').length > 0 && (
                            <div className={`bg-[#fff] rounded-2xl p-4 border border-gray-100 shadow-sm ${step === 'payment' ? 'hidden md:block' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">
                                            <i className="fas fa-utensils"></i>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Menu Đã Gọi</span>
                                    </div>
                                    <span className="text-lg font-black text-[#4B3621]">{formatVND(calculations.menuFee)}</span>
                                </div>
                                <div className="space-y-1 pl-8">
                                    {order.items.filter(i => i.productId !== 'billiard-fee').map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px] text-gray-500">
                                            <span>{item.quantity}x {item.productName}</span>
                                            <span>{formatVND(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Total Highlight */}
                        <div className="py-2 flex justify-between items-end px-2">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tổng thanh toán</span>
                            <span className="text-4xl font-black text-[#C2A383] tracking-tighter leading-none">{formatVND(calculations.totalAmount)}</span>
                        </div>
                    </div>

                    {/* Step 1 Action Header (Visible in Verify Mode) */}
                    {step === 'verify' && (
                        <div className="p-5 pt-0 mt-auto bg-white border-t border-transparent">
                            <button
                                onClick={handleConfirmTime}
                                className="w-full bg-[#4B3621] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] shadow-xl shadow-[#4B3621]/20 hover:bg-[#3E2C1B] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                            >
                                <span>Tiếp tục</span>
                                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                            </button>
                        </div>
                    )}

                    {/* Back Button (Only Visible in Payment Mode Desktop - on Mobile it's at top of Right Column usually, but let's keep logic simple) */}
                    {step === 'payment' && (
                        <div className="hidden md:block p-5 pt-0 mt-auto bg-white">
                            <button
                                onClick={() => setStep('verify')}
                                className="w-full py-3 rounded-2xl font-bold text-xs text-gray-400 hover:text-[#4B3621] hover:bg-gray-50 transition-colors uppercase tracking-wider"
                            >
                                <i className="fas fa-arrow-left mr-2"></i> Quay lại chỉnh giờ
                            </button>
                        </div>
                    )}
                </div>

                {/* --- RIGHT COLUMN: PAYMENT METHODS (Visible in Payment Mode) --- */}
                {step === 'payment' && (
                    <div className="flex-1 bg-[#FAF9F6] flex flex-col h-full animate-fade-in relative z-20 md:border-l border-gray-100">
                        {/* Mobile Back Button Header */}
                        <div className="md:hidden p-4 flex items-center gap-2 text-gray-400 cursor-pointer hover:text-[#4B3621]" onClick={() => setStep('verify')}>
                            <i className="fas fa-arrow-left"></i>
                            <span className="text-xs font-bold uppercase tracking-wide">Quay lại</span>
                        </div>

                        {/* Payment Tabs */}
                        <div className="px-5 md:px-8 py-4 shrink-0">
                            <div className="p-1 bg-gray-200/60 rounded-[16px] flex relative">
                                <div className={`absolute inset-y-1 w-1/2 bg-white rounded-[12px] shadow-sm transition-transform duration-300 ease-out ${activeTab === 'transfer' ? 'translate-x-full' : 'translate-x-0'}`}></div>

                                <button onClick={() => setActiveTab('cash')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'cash' ? 'text-[#4B3621]' : 'text-gray-400'}`}>
                                    <i className="fas fa-money-bill-wave"></i> Tiền mặt
                                </button>
                                <button onClick={() => setActiveTab('transfer')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'transfer' ? 'text-[#4B3621]' : 'text-gray-400'}`}>
                                    <i className="fas fa-qrcode"></i> QR Code
                                </button>
                            </div>
                        </div>

                        {/* Payment Content */}
                        <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4 custom-scrollbar">
                            {activeTab === 'cash' ? (
                                <div className="space-y-6 h-full flex flex-col justify-center">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Khách đưa</label>
                                        <div className="relative inline-block w-full max-w-[200px]">
                                            <input
                                                autoFocus
                                                type="text"
                                                inputMode="numeric"
                                                value={receivedAmountStr}
                                                onChange={e => setReceivedAmountStr(handleMoneyInput(e.target.value))}
                                                className="w-full text-4xl font-black text-[#4B3621] text-center outline-none bg-transparent placeholder-gray-200 py-2 border-b-2 border-transparent focus:border-[#C2A383] transition-colors"
                                                placeholder="0"
                                            />
                                            {receivedAmountStr && (
                                                <button onClick={() => setReceivedAmountStr('')} className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center">
                                                    <i className="fas fa-times text-[10px]"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Gợi ý nhanh</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {quickAmounts.slice(0, 6).map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => setReceivedAmountStr(formatVND(amt))}
                                                    className={`py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border
                                                        ${receivedAmount === amt
                                                            ? 'bg-[#4B3621] text-white border-[#4B3621] shadow-md'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#C2A383] hover:text-[#C2A383]'
                                                        }`}
                                                >
                                                    {formatVND(amt)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Change Display */}
                                    <div className={`transition-all duration-300 ${receivedAmount > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        <div className="flex justify-between items-center bg-[#ECFDF5] p-4 rounded-2xl border border-[#D1FAE5]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-sm">
                                                    <i className="fas fa-hand-holding-dollar"></i>
                                                </div>
                                                <span className="text-xs font-black text-[#047857] uppercase tracking-wide">Tiền thừa trả khách</span>
                                            </div>
                                            <span className="text-xl font-black text-[#047857]">{formatVND(Math.max(0, receivedAmount - calculations.totalAmount))}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-scale-in">
                                    <div className="bg-white p-6 rounded-[32px] shadow-xl border-4 border-white ring-1 ring-gray-100">
                                        <QRCodeSVG
                                            value={`${BANK_QR_IMAGE_URL}&amount=${calculations.totalAmount}`}
                                            size={200}
                                            level="M"
                                            includeMargin
                                            imageSettings={{
                                                src: "https://imagedelivery.net/KMb5Epp0S1q9aD0Wl4yV_A/b404431f-0e6e-4c74-0466-417163821f00/public",
                                                x: undefined, y: undefined, height: 30, width: 30, excavate: true
                                            }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-[#4B3621] tracking-tighter mb-1">{formatVND(calculations.totalAmount)}</p>
                                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                            <i className="fas fa-check-circle"></i> Đã bao gồm phí
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-5 md:p-8 bg-white border-t border-gray-50 md:rounded-br-[32px]">
                            <button
                                onClick={handleProcessPayment}
                                disabled={isSubmitting || (activeTab === 'cash' && receivedAmount < calculations.totalAmount)}
                                className={`w-full py-4 md:py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-3
                                    ${activeTab === 'cash'
                                        ? 'bg-[#4B3621] text-white hover:bg-[#3E2C1B] disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{activeTab === 'cash' ? 'Hoàn tất thanh toán' : 'Xác nhận đã nhận tiền'}</span>
                                        <i className="fas fa-check"></i>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BilliardCheckoutModal;
