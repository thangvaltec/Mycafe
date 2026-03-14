
import React from 'react';
import { Order, PaymentMethod } from '../../types';
import { formatVND, formatDateTimeVN } from '../../utils/format';

interface PrintReceiptProps {
    order: Order;
    tableName: string;
    paymentMethod: PaymentMethod;
    receivedAmount: number;
    discountAmount?: number;
    finalTotal: number;
    startTime?: string;  // For billiard
    endTime?: string;    // For billiard
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
    order, tableName, paymentMethod, receivedAmount, discountAmount = 0, finalTotal, startTime, endTime
}) => {
    const now = new Date().toISOString();
    const changeAmount = paymentMethod === PaymentMethod.CASH ? Math.max(0, receivedAmount - finalTotal) : 0;
    const menuItems = order.items.filter(i => i.productId !== 'billiard-fee');
    const billiardItem = order.items.find(i => i.productId === 'billiard-fee');
    const isBilliard = !!billiardItem;

    // Compute actual billiard duration & fee from checkout times (not stale order data)
    const menuFee = menuItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const actualTimeFee = isBilliard ? Math.max(0, finalTotal + (discountAmount || 0) - menuFee) : 0;
    let durationStr = '';
    if (isBilliard && startTime && endTime) {
        const mins = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
        durationStr = `Tiền giờ (${Math.floor(mins / 60)}h ${mins % 60}m)`;
    } else if (billiardItem) {
        durationStr = billiardItem.productName;
    }

    return (
        <div id="print-receipt" className="hidden print:block font-mono text-[11px] text-black bg-white">
            {/* 
              *** CSS PRINT STYLES ***
              Được inject qua thẻ style inline, áp dụng khi in.
              Tự động ẩn mọi thứ khác, chỉ hiển thị #print-receipt.
            */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #print-receipt, #print-receipt * { visibility: visible !important; }
                    #print-receipt {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 58mm !important;   /* Đổi thành 80mm nếu dùng máy in 80mm */
                        padding: 4mm !important;
                        font-size: 9pt !important;
                        font-family: 'Courier New', monospace !important;
                        display: block !important;
                        color: #000 !important;
                        background: #fff !important;
                    }
                    @page {
                        size: 58mm auto;          /* width = 58mm, height tự co giãn */
                        margin: 0;
                    }
                }
            `}</style>

            {/* ===== HEADER ===== */}
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                <p className="font-bold text-[13px] tracking-tight leading-tight">BỐNG COFFEE</p>
                <p className="text-[9px]">Sân Vườn & Billiards</p>
                <p className="text-[8px] mt-0.5">ĐC: [Ngã Tư Yên Lạc-Thạch Lạc]</p>
                <p className="text-[8px]">ĐT: [0886-660-123]</p>
            </div>

            {/* ===== ORDER INFO ===== */}
            <div className="mb-2 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between">
                    <span className="font-bold">Bàn:</span>
                    <span className="font-bold">{tableName}</span>
                </div>
                {/* <div className="flex justify-between">
                    <span>Order #:</span>
                    <span>#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                </div> */}
                <div className="flex justify-between">
                    <span>Thời gian:</span>
                    <span>{formatDateTimeVN(now)}</span>
                </div>
                {isBilliard && startTime && endTime && (
                    <div className="flex justify-between">
                        <span>Giờ chơi:</span>
                        <span>{formatDateTimeVN(startTime).split(' ')[0]} → {formatDateTimeVN(endTime).split(' ')[0]}</span>
                    </div>
                )}
            </div>

            {/* ===== BILLIARD FEE ===== */}
            {isBilliard && billiardItem && (
                <div className="mb-2 pb-2 border-b border-dashed border-black">
                    <p className="font-bold text-[9px] uppercase tracking-widest mb-1">⏱ Phí giờ chơi</p>
                    <div className="flex justify-between">
                        <span className="flex-1 pr-1 leading-tight">{durationStr}</span>
                        <span className="whitespace-nowrap font-bold">{formatVND(actualTimeFee)}đ</span>
                    </div>
                </div>
            )}

            {/* ===== MENU ITEMS ===== */}
            {menuItems.length > 0 && (
                <div className="mb-2 pb-2 border-b border-dashed border-black">
                    {isBilliard && <p className="font-bold text-[9px] uppercase tracking-widest mb-1">☕ Đồ uống / Thức ăn</p>}
                    {menuItems.map((item, idx) => (
                        <div key={idx} className="mb-1">
                            <div className="flex justify-between">
                                <span className="flex-1 pr-1 leading-tight">{item.productName}</span>
                                <span className="whitespace-nowrap font-bold">{formatVND(item.price * item.quantity)}đ</span>
                            </div>
                            <div className="text-[8px] text-gray-500 pl-1">
                                {item.quantity} x {formatVND(item.price)}đ
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== TOTALS ===== */}
            <div className="mb-2 pb-2 border-b border-dashed border-black space-y-0.5">
                {discountAmount > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span>Tạm tính:</span>
                            <span>{formatVND(finalTotal + discountAmount)}đ</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                            <span>Giảm giá:</span>
                            <span>-{formatVND(discountAmount)}đ</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between font-bold text-[13px] mt-1">
                    <span>TỔNG CỘNG:</span>
                    <span>{formatVND(finalTotal)}đ</span>
                </div>
            </div>

            {/* ===== PAYMENT INFO ===== */}
            <div className="mb-2 pb-2 border-b border-dashed border-black space-y-0.5">
                <div className="flex justify-between">
                    <span>Hình thức TT:</span>
                    <span className="font-bold">{paymentMethod === PaymentMethod.CASH ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                </div>
                {paymentMethod === PaymentMethod.CASH && (
                    <>
                        <div className="flex justify-between">
                            <span>Khách đưa:</span>
                            <span>{formatVND(receivedAmount)}đ</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Tiền thừa:</span>
                            <span>{formatVND(changeAmount)}đ</span>
                        </div>
                    </>
                )}
            </div>

            {/* ===== FOOTER ===== */}
            <div className="text-center text-[8px] mt-2 space-y-0.5">
                <p className="font-bold">Cảm ơn quý khách!</p>
                <p>Hẹn gặp lại lần sau </p>
                <p className="mt-1 text-[7px] text-gray-500">
                    {formatDateTimeVN(now)}
                </p>
            </div>
        </div>
    );
};

// ===== PRINT FUNCTION =====
// Gọi hàm này từ bất kỳ đâu để in hóa đơn
export const triggerPrint = () => {
    window.print();
};

export default PrintReceipt;
