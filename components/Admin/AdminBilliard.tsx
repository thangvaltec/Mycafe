import React, { useState, useEffect } from 'react';
import { BilliardSession, PaymentMethod, Order, OrderItem, OrderStatus, Table } from '../../types';
import { formatVND, parseVND } from '../../utils/format';
import { api } from '../../services/api';
import CheckoutModal from './CheckoutModal';
import BilliardCheckoutModal from './BilliardCheckoutModal';
import { QRCodeSVG } from 'qrcode.react';

interface AdminBilliardProps {
    tables: Table[]; // To link name/alias
    onOpenOrderView: (table: { id: string, name: string, guestName?: string }) => void;
    onSetTables: (tables: Table[]) => void;
}

// Hardcoded tables as per user request (or fetch if we want). Start with user's ID set
const BILLIARD_TABLE_IDS = ['BI-01', 'BI-02', 'BI-03', 'BI-04'];

const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const roundToNearest15 = (date: Date) => {
    const minutes = date.getMinutes();
    const rounded = Math.round(minutes / 15) * 15;
    date.setMinutes(rounded);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
};

const formatTime15 = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const AdminBilliard: React.FC<AdminBilliardProps> = ({ tables, onOpenOrderView, onSetTables }) => {
    const [sessions, setSessions] = useState<BilliardSession[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    // Quick View State
    const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

    const [activeFormTable, setActiveFormTable] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [numPeople, setNumPeople] = useState('2');
    const [pricePerHourStr, setPricePerHourStr] = useState('40.000');

    const [checkoutSession, setCheckoutSession] = useState<BilliardSession | null>(null);
    const [startTimeStr, setStartTimeStr] = useState('');

    // QR Code State
    const [showQR, setShowQR] = useState<string | null>(null);

    const [now, setNow] = useState(new Date());

    const [localTables, setLocalTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Payment Calculation State
    // Unified Checkout State
    const [checkoutBill, setCheckoutBill] = useState<any>(null);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    // Initial Loading Sequence
    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            await checkAndCreateTables();
            await fetchData();
            setIsLoading(false);
        };
        initData();

        const interval = setInterval(fetchData, 5000);
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, []);

    const checkAndCreateTables = async () => {
        // "30 Years Experience": Auto-heal missing tables
        const baseline = localTables.length > 0 ? localTables : tables;
        let currentTables = baseline;
        if (currentTables.length === 0) {
            currentTables = await api.getTables();
            setLocalTables(currentTables);
            onSetTables(currentTables);
        }

        const missing = BILLIARD_TABLE_IDS.filter(id => !currentTables.find(t => t.tableNumber === id));
        if (missing.length > 0) {
            try {
                await Promise.all(missing.map(id => api.addTable({
                    name: `Bàn Bida ${id}`,
                    tableNumber: id,
                    alias: 'Bi-a',
                    status: 'Empty'
                })));
                const updatedTables = await api.getTables();
                onSetTables(updatedTables);
                setLocalTables(updatedTables);
            } catch (e) {
                console.error("Failed to auto-create billiard tables", e);
            }
        }
    };

    const fetchData = async () => {
        try {
            const [sess, ord, tbls] = await Promise.all([
                api.getBilliardSessions(),
                api.getOrders(),
                api.getTables()
            ]);
            setSessions(sess);
            setOrders(ord);
            setLocalTables(tbls);
        } catch (err) {
            console.error("Failed to fetch billiard data", err);
        }
    };

    const calculateAccrued = (session: BilliardSession) => {
        const start = new Date(session.startTime).getTime();
        const current = now.getTime();
        const hours = (current - start) / (1000 * 60 * 60);
        return Math.floor(hours * session.pricePerHour);
    };

    const getDurationString = (startTime: string) => {
        const diff = now.getTime() - new Date(startTime).getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return `${h} giờ ${m} phút`;
    };

    const handleOpenForm = (tableCode: string) => {
        setActiveFormTable(tableCode);
        setGuestName('');
        setNumPeople('2');
        const d = roundToNearest15(new Date());
        setStartTimeStr(formatTime15(d));
    };

    const handleStart = async () => {
        if (!activeFormTable) return;
        try {
            let realTable = tables.find(t => t.tableNumber === activeFormTable);
            if (!realTable) {
                const allTables = await api.getTables();
                realTable = allTables.find((t: Table) => t.tableNumber === activeFormTable);
                if (realTable) onSetTables(allTables);
            }
            if (!realTable) {
                try {
                    const newTable = await api.addTable({
                        name: `Bàn Bida ${activeFormTable}`,
                        tableNumber: activeFormTable!,
                        alias: 'Bi-a',
                        status: 'Empty'
                    });
                    realTable = newTable;
                    const allTables = await api.getTables();
                    onSetTables(allTables);
                } catch (e) {
                    alert(`Không thể khởi tạo bàn ${activeFormTable}.`);
                    return;
                }
            }

            let finalStartTime = undefined;
            if (startTimeStr) {
                const [h, m] = startTimeStr.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                finalStartTime = d.toISOString();
            }

            const res = await api.startBilliardSession({
                tableId: parseInt(realTable.id),
                guestName: guestName || 'Khách chơi bida',
                numPeople: parseInt(numPeople) || 2,
                pricePerHour: parseVND(pricePerHourStr),
                startTime: finalStartTime
            });
            setSessions([...sessions, res]);
            setActiveFormTable(null);
            setGuestName('');
        } catch (err: any) {
            if (err.message && err.message.includes("active")) {
                alert("Bàn đang có người chơi. Đang cập nhật lại dữ liệu...");
                fetchData();
                setActiveFormTable(null);
            } else {
                alert('Lỗi: ' + err.message);
            }
        }
    };

    // Unified Checkout Flow
    const handleInitCheckout = async (session: BilliardSession) => {
        try {
            setIsCheckoutLoading(true);
            const bill = await api.getBill(session.tableId);
            setCheckoutBill(bill);
            setCheckoutSession(session); // Keep track of session
        } catch (err: any) {
            alert("Lỗi lấy hóa đơn: " + err.message);
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    const handleProcessPayment = async (method: PaymentMethod, receivedAmount: number, finalStartTime?: string, finalEndTime?: string) => {
        if (!checkoutBill || !checkoutSession) return;
        try {
            await api.billiardCheckout(checkoutBill.tableId, method, receivedAmount, finalStartTime, finalEndTime);
            alert("Thanh toán thành công!");
            setCheckoutSession(null);
            setCheckoutBill(null);
            fetchData();
        } catch (err: any) {
            alert('Lỗi thanh toán: ' + err.message);
        }
    };

    // Helper to Convert BillPreview to Order structure for CheckoutModal
    const getCheckoutOrder = (): Order | null => {
        if (!checkoutBill) return null;
        return {
            id: checkoutBill.orderId || `session-${checkoutSession.id}`,
            orderNumber: 0,
            tableId: String(checkoutBill.tableId),
            status: OrderStatus.PENDING,
            items: checkoutBill.items.map((i: any) => ({
                id: i.name, // quick hack for uniqueness if needed
                productName: i.name,
                productId: i.type === 'TIME_FEE' ? 'billiard-fee' : 'menu-item',
                price: i.unitPrice,
                quantity: i.quantity
            })),
            totalAmount: checkoutBill.totalAmount,
            createdAt: checkoutBill.startTime || new Date().toISOString()
        };
    };

    const mappingTables = localTables.length > 0 ? localTables : tables;

    const activeSessionMap = sessions.reduce((acc, s) => {
        let t = mappingTables.find(tbl => String(tbl.id) === String(s.tableId));
        if (t && t.tableNumber) {
            acc[t.tableNumber] = s;
        }
        return acc;
    }, {} as Record<string, BilliardSession>);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {isCheckoutLoading && (
                <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl flex flex-col items-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-[#4B3621] mb-2"></i>
                        <p className="font-bold">Đang tính tiền...</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl md:text-2xl font-black text-[#4B3621] uppercase tracking-tighter">Quản lý Bida</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => {
                            setIsLoading(true);
                            await checkAndCreateTables();
                            await fetchData();
                            setIsLoading(false);
                        }}
                        className="bg-white/50 hover:bg-white text-[#4B3621] p-2 rounded-full transition-all active:scale-95 shadow-sm"
                        title="Làm mới dữ liệu"
                    >
                        <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                    </button>
                    <div className="text-sm font-bold text-gray-400 capitalize">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long' })}, {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {BILLIARD_TABLE_IDS.map(tableCode => {
                    const activeSession = activeSessionMap[tableCode];
                    const realTable = mappingTables.find(t => t.tableNumber === tableCode);
                    const foodOrder = realTable ? orders.find(o => o.tableId === realTable.id && o.status !== OrderStatus.PAID) : null;

                    // Simple estimation for UI display (not checkout)
                    const accFunc = (s: BilliardSession) => {
                        const start = new Date(s.startTime).getTime();
                        const current = new Date().getTime(); // use local clock for UI update
                        const h = (current - start) / (1000 * 60 * 60);
                        return Math.floor(h * s.pricePerHour);
                    };
                    const accrued = activeSession ? accFunc(activeSession) : 0;
                    const total = accrued + (foodOrder?.totalAmount || 0);

                    if (activeSession) {
                        return (
                            <div key={tableCode} className="relative bg-[#3E2C1B] text-[#E0C097] p-6 rounded-[32px] shadow-2xl flex flex-col justify-between min-h-[360px] border border-[#5A4232]">
                                <div className="absolute top-6 right-6 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981] animate-pulse"></div>
                                <button
                                    onClick={() => realTable && setShowQR(realTable.id)}
                                    className="absolute top-6 right-12 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                    title="Mã QR Gọi Món"
                                >
                                    <i className="fas fa-qrcode text-xs"></i>
                                </button>

                                <div>
                                    <h3 className="text-4xl lg:text-3xl font-black text-white tracking-tighter mb-6">{tableCode}</h3>
                                    <div className="mb-6">
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Đang chơi</p>
                                        <p className="text-2xl lg:text-xl font-black text-[#C2A383] truncate">{activeSession.guestName}</p>
                                    </div>
                                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Thời gian</p>
                                            <p className="text-xl lg:text-lg font-bold text-white font-mono">{getDurationString(activeSession.startTime)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Tiền giờ</p>
                                            <p className="text-lg lg:text-base font-bold text-gray-400">{formatVND(activeSession.pricePerHour)}/h</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#2A1E12] rounded-2xl p-4 border border-white/5 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-gray-500">Tạm tính:</span>
                                            <span className="text-3xl lg:text-2xl font-black text-emerald-400 tracking-tighter">{formatVND(total)}đ</span>
                                        </div>
                                        {foodOrder && (
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-orange-400"><i className="fas fa-utensils mr-1"></i>Đồ ăn</span>
                                                    <button
                                                        onClick={() => setSelectedOrderForDetail(foodOrder)}
                                                        className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-colors uppercase tracking-wide shadow-sm"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{formatVND(foodOrder.totalAmount)}đ</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => realTable && onOpenOrderView({ id: realTable.id, name: `${tableCode} - ${activeSession.guestName}` })}
                                        className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-black text-[10px] uppercase transition-colors flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-bell-concierge"></i> Gọi Món / Menu
                                    </button>
                                    <button
                                        onClick={() => handleInitCheckout(activeSession)}
                                        className="w-full bg-[#C2A383] hover:bg-[#D4B595] text-[#4B3621] py-4 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                                    >
                                        KẾT THÚC & THANH TOÁN
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={tableCode} className="relative bg-white text-gray-400 p-6 rounded-[32px] border-2 border-gray-100 shadow-sm flex flex-col justify-between min-h-[360px]">
                            <div className="flex justify-between items-start">
                                <h3 className="text-4xl lg:text-3xl font-black tracking-tighter opacity-30">{tableCode}</h3>
                                {realTable && (
                                    <button
                                        onClick={() => setShowQR(realTable.id)}
                                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                                        title="Lấy mã QR"
                                    >
                                        <i className="fas fa-qrcode text-xs"></i>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col items-center justify-center flex-1 opacity-40">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <i className="fas fa-circle-play text-3xl text-gray-300"></i>
                                </div>
                                <p className="font-bold text-xs uppercase tracking-widest">Bàn Trống</p>
                                {!realTable && <p className="text-[9px] text-red-400 mt-2 font-medium">(Đang khởi tạo...)</p>}
                            </div>
                            <button
                                disabled={!realTable}
                                onClick={() => handleOpenForm(tableCode)}
                                className="w-full bg-[#FAF9F6] hover:bg-[#4B3621] hover:text-white text-[#4B3621] py-4 rounded-2xl font-black text-xs uppercase transition-all border border-gray-200 hover:border-[#4B3621] disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <span className="group-hover:translate-x-1 transition-transform inline-block">
                                    <i className="fas fa-play mr-2"></i> MỞ BÀN MỚI
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Form Mở Bàn */}
            {activeFormTable && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveFormTable(null)}></div>
                    <div className="relative bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-slide-up border border-white/20">
                        <h3 className="text-2xl font-black text-[#4B3621] mb-8 uppercase tracking-tighter text-center">Mở Bàn {activeFormTable}</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Tên khách chơi</label>
                                <input type="text" autoFocus value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="VD: Nhóm Anh Tuấn..." className="w-full bg-[#FAF9F6] border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-[#C2A383] text-[#4B3621]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Giờ bắt đầu</label>
                                    <div className="relative">
                                        <select
                                            value={startTimeStr}
                                            onChange={e => setStartTimeStr(e.target.value)}
                                            className="w-full bg-[#FAF9F6] border-none rounded-2xl p-4 font-bold outline-none text-[#4B3621] appearance-none"
                                        >
                                            {TIME_OPTIONS.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center px-2 pointer-events-none text-gray-400">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Giá/Giờ (đ)</label>
                                    <input type="text" value={pricePerHourStr} onChange={e => setPricePerHourStr(formatVND(parseVND(e.target.value)))} className="w-full bg-[#FAF9F6] border-none rounded-2xl p-4 font-black outline-none text-[#C2A383]" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Số người</label>
                                <input type="number" value={numPeople} onChange={e => setNumPeople(e.target.value)} className="w-full bg-[#FAF9F6] border-none rounded-2xl p-4 font-bold outline-none text-[#4B3621]" />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setActiveFormTable(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200">HỦY</button>
                                <button onClick={handleStart} className="flex-1 bg-[#4B3621] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#4B3621]/20 active:scale-95 transition-transform hover:bg-[#3E2C1B]">BẮT ĐẦU</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowQR(null)}></div>
                    <div className="relative bg-white rounded-[50px] p-10 w-full max-w-sm shadow-2xl animate-fade-in text-center">
                        <div className="absolute top-6 right-6">
                            <button onClick={() => setShowQR(null)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"><i className="fas fa-times"></i></button>
                        </div>

                        <div className="mt-4 mb-2">
                            <h3 className="text-3xl font-black text-[#4B3621] tracking-tighter uppercase mb-1">
                                MÃ QR {tables.find(t => t.id === showQR)?.name || showQR}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Quét để gọi món tại bàn</p>
                        </div>

                        <div className="bg-[#FAF9F6] p-8 rounded-[40px] my-8 border-2 border-dashed border-[#C2A383]/30 flex justify-center shadow-inner">
                            <QRCodeSVG
                                value={`${window.location.protocol}//${window.location.host}/?tableId=${showQR}`}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        <div className="space-y-4">
                            <button onClick={() => window.print()} className="w-full bg-[#4B3621] text-white py-5 rounded-3xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform"><i className="fas fa-print mr-2"></i> IN MÃ QR</button>
                            <p className="text-[9px] text-gray-400 font-medium italic">URL: {window.location.host}/?tableId={showQR}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal Unified */}
            {checkoutBill && checkoutSession && (
                <BilliardCheckoutModal
                    order={getCheckoutOrder()!}
                    table={{
                        id: String(checkoutSession.tableId),
                        name: tables.find(t => t.id === String(checkoutSession.tableId))?.name || `Bàn ${checkoutBill.tableId}`,
                        guestName: checkoutSession.guestName,
                        startTime: checkoutSession.startTime
                    }}
                    pricePerHour={checkoutSession.pricePerHour}
                    startTime={checkoutSession.startTime}
                    onClose={() => { setCheckoutSession(null); setCheckoutBill(null); }}
                    onSuccess={() => {
                        setCheckoutSession(null);
                        setCheckoutBill(null);
                        fetchData();
                    }}
                />
            )}

            {/* Detail Modal for Billiard Food */}
            {selectedOrderForDetail && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrderForDetail(null)}></div>
                    <div className="relative bg-[#FDFCF8] rounded-[40px] p-4 w-full max-w-sm shadow-2xl animate-fade-in flex flex-col border border-white/20 max-h-[95vh]">
                        <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter mb-0.5 text-center">Món đã gọi</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center mb-3 pb-2 border-b border-gray-100">
                            {tables.find(t => String(t.id) === String(selectedOrderForDetail.tableId))?.tableNumber || '?'}
                        </p>

                        <div className="flex-1 overflow-y-auto custom-scrollbar mb-3 pr-2">
                            <div className="space-y-2">
                                {selectedOrderForDetail.items
                                    .map((item, idx) => {
                                        const timeKey = `order_item_time_${selectedOrderForDetail.id}_${item.id}`;
                                        let orderTime = localStorage.getItem(timeKey);
                                        if (!orderTime) {
                                            orderTime = new Date().toISOString();
                                            localStorage.setItem(timeKey, orderTime);
                                        }
                                        return { ...item, orderTime, originalIndex: idx };
                                    })
                                    .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
                                    .map((item) => {
                                        const timeDisplay = new Date(item.orderTime).toLocaleTimeString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        });

                                        return (
                                            <div key={item.originalIndex} className="flex justify-between items-center p-2.5 rounded-xl border border-gray-100 shadow-sm odd:bg-[#FAF9F6] even:bg-white">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[9px] text-gray-400 font-bold shrink-0 w-10">{timeDisplay}</span>
                                                    <div className="w-6 h-6 shrink-0 rounded-lg bg-[#EAE8E4] text-[#4B3621] font-black text-[9px] flex items-center justify-center border border-white shadow-inner">
                                                        x{item.quantity}
                                                    </div>
                                                    <span className="text-xs font-bold text-[#4B3621] leading-tight truncate">{item.productName}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-[#C2A383] whitespace-nowrap ml-2">{formatVND(item.price * item.quantity)}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedOrderForDetail(null)}
                            className="w-full bg-[#4B3621] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#3E2C1B] active:scale-95 transition-all shadow-lg"
                        >
                            Đóng cửa sổ
                        </button>
                    </div>
                </div >
            )}
        </div >
    );
};

export default AdminBilliard;
