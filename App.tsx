import React, { useState, useEffect } from 'react';
import {
  Table, Product, Order, OrderStatus, Category, Expense, UserRole, OrderItem
} from './types';
import { authUtils } from './utils/auth';
import { api } from './services/api';
import AdminView from './components/AdminView';
import CustomerView from './components/CustomerView';

const App: React.FC = () => {

  const [isLoggedIn, setIsLoggedIn] = useState(authUtils.isValidSession);
  const [role, setRole] = useState<UserRole>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tableId')) return 'CUSTOMER';
    return (localStorage.getItem('userRole') as UserRole) || 'CUSTOMER';
  });

  // ... (Other state hooks remain same) ...
  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tableId') || '';
  });
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isQRCodeAccess, setIsQRCodeAccess] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return !!urlParams.get('tableId');
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = async () => {
    try {
      const [t, p, c, o, e] = await Promise.all([
        api.getTables(),
        api.getProducts(),
        api.getCategories(),
        api.getOrders(),
        api.getExpenses()
      ]);
      setTables(t.sort((a, b) => Number(a.id) - Number(b.id)));
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setExpenses(e || []);


      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load data", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableIdParam = urlParams.get('tableId');
    if (tableIdParam) {
      setSelectedTableId(tableIdParam);
      setRole('CUSTOMER');
      setIsQRCodeAccess(true);
    }

    // Session Auto-Check Interval
    const sessionCheckInterval = setInterval(() => {
      if (isLoggedIn && !authUtils.isValidSession()) {
        setIsLoggedIn(false);
        setRole('CUSTOMER');
        window.location.reload();
      }
    }, 60000); // Check every minute

    if (isLoggedIn) {
      loadData();
    } else {
      setIsLoading(false); // If not logged in & not table, stop loading
    }

    const interval = setInterval(() => {
      if (isLoggedIn) loadData();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(sessionCheckInterval);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login(username, password);
      if (res.token) {
        authUtils.login(res.role);
        setIsLoggedIn(true);
        setRole(res.role as UserRole);
      } else {
        setLoginError('Không nhận được token xác thực.');
      }
    } catch (err) {
      setLoginError('Đăng nhập thất bại. Kiểm tra lại tài khoản');
    }
  };

  const handleLogout = () => {
    authUtils.logout();
    setIsLoggedIn(false);
    setRole('CUSTOMER');
    window.location.reload(); // Optional: clean reload
  };

  const handlePlaceOrder = async (tableId: string, items: OrderItem[]) => {
    try {
      await api.placeOrder(tableId, items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        price: i.price,
        quantity: i.quantity
      })));
      await loadData();
    } catch (err: any) {
      alert("Gửi đơn thất bại: " + (err.message || err));
    }
  };

  const handleAddTable = async () => {
    const nextId = (tables.length + 1).toString().padStart(2, '0');
    await api.createTable({ tableNumber: nextId, name: `Bàn ${nextId}`, alias: 'Mới' });
    loadData();
  };

  const handleAddProduct = async (p: Partial<Product>) => {
    await api.createProduct(p);
    loadData();
  };

  const handleUpdateProduct = async (p: Product) => {
    await api.updateProduct(p);
    loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    loadData();
  };

  const handleUpdateTable = async (t: Table) => {
    await api.updateTable(t);
    loadData(); // Refresh all data after table update
  };

  const handleDeleteTable = async (id: number) => {
    if (window.confirm("CẢNH BÁO: Xóa bàn sẽ làm VÔ HIỆU HÓA mã QR đang được in trên bàn đó.\n\nBạn có chắc chắn muốn xóa không?")) {
      try {
        await api.deleteTable(id);
        loadData();
      } catch (err: any) {
        alert("Lỗi khi xóa bàn: " + (err.message || err));
      }
    }
  };

  // Order updates - trigger refresh after API call in component
  const handleUpdateOrder = (o: Order) => {
    loadData(); // Refresh to show updated order
  };

  // Expenses
  const handleAddExpense = async (e: Partial<Expense>) => {
    await api.addExpense(e);
    loadData();
  };
  const handleUpdateExpense = async (e: Expense) => {
    await api.updateExpense(e);
    loadData();
  };
  const handleDeleteExpense = async (id: string) => {
    if (confirm('Xóa khoản chi này?')) {
      await api.deleteExpense(id);
      loadData();
    }
  };

  // Categories
  const handleAddCategory = async (c: Partial<Category>) => {
    await api.createCategory(c);
    loadData();
  };
  const handleUpdateCategory = async (c: Category) => {
    await api.updateCategory(c);
    loadData();
  };
  const handleDeleteCategory = async (id: string) => {
    if (products.some(p => p.categoryId === id)) {
      alert("Category has products. Cannot delete.");
      return;
    }
    await api.deleteCategory(id);
    loadData();
  };

  // Admin triggers these via child - but we pass loadData or specific handlers
  // Note: AdminView uses onSetOrders etc which are now mostly "reload requested"
  // I will adapt AdminView props if needed, or better, pass wrapped handlers.

  const showLogin = !isLoggedIn && !isQRCodeAccess;

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: "url('/images/login-bg.jpg')" }} // User Uploaded Anime Style
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 relative z-10 transition-all hover:shadow-cyan-500/10 hover:scale-[1.01] duration-500">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-[#4B3621] uppercase tracking-tighter drop-shadow-sm">Bống Cafe Sân Vườn-Billiard</h1>
            <p className="text-[10px] text-[#8C6B4F] font-bold uppercase tracking-[0.3em] mt-2">Hệ thống quản trị</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tài khoản</label>
              <div className="relative group">
                <i className="fas fa-user absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[#C2A383] transition-colors"></i>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-bold text-[#4B3621] outline-none focus:border-[#C2A383] focus:bg-white transition-all shadow-inner"
                  placeholder="Tên đăng nhập"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative group">
                <i className="fas fa-lock absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[#C2A383] transition-colors"></i>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-bold text-[#4B3621] outline-none focus:border-[#C2A383] focus:bg-white transition-all shadow-inner"
                  placeholder="******"
                />
              </div>
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 animate-pulse">
                <i className="fas fa-exclamation-circle text-red-500 text-sm"></i>
                <p className="text-red-500 text-xs font-bold">{loginError}</p>
              </div>
            )}
            <button type="submit" className="w-full bg-gradient-to-r from-[#4B3621] to-[#6F4E37] text-white py-3.5 rounded-xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-[#4B3621]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
              Đăng nhập
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-[9px] text-gray-400 font-medium">© {new Date().getFullYear()} MyCafe System</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] flex-col gap-6">
        <div className="w-16 h-16 border-4 border-[#C2A383]/20 border-t-[#4B3621] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-[#4B3621] uppercase tracking-[0.3em] animate-pulse">Vui lòng đợi giây lát...</p>
      </div>
    );
  }

  const currentCustomerTable = tables.find(t => String(t.id) === String(selectedTableId));

  return (
    <div className="max-w-[1440px] mx-auto min-h-screen">
      {role === 'ADMIN' || role === 'STAFF' ? (
        <AdminView
          role={role}
          tables={tables}
          products={products}
          categories={categories}
          orders={orders}
          expenses={expenses}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateTable={handleUpdateTable}
          onDeleteTable={handleDeleteTable}
          onUpdateOrder={handleUpdateOrder}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
          onPlaceOrder={handlePlaceOrder}
          onAddTable={handleAddTable}
          onSetOrders={(newOrders) => { }}
          onSetExpenses={(newExpenses) => { }}
          onSetTables={(newTables) => { }}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onLogout={handleLogout}
          onSwitchMode={() => setRole('CUSTOMER')} // NEW PROP
        />
      ) : (
        currentCustomerTable ? (
          <CustomerView
            table={currentCustomerTable}
            products={products}
            categories={categories}
            activeOrder={orders.find(o => String(o.tableId) === String(selectedTableId) && o.status !== OrderStatus.PAID)}
            onPlaceOrder={(items) => handlePlaceOrder(selectedTableId, items)}
            // Pass admin switch if logged in as admin
            onSwitchToAdmin={isLoggedIn && localStorage.getItem('userRole') === 'ADMIN' ? () => setRole('ADMIN') : undefined}
            onBackToTableList={isLoggedIn ? () => setSelectedTableId('') : undefined}
          />
        ) : (

          isLoggedIn ? (
            <div className="min-h-screen bg-[#FDFCF8] p-6 lg:p-10">
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="text-center space-y-4">
                  <i className="fas fa-user-shield text-4xl text-[#4B3621]"></i>
                  <h1 className="text-3xl font-black text-[#4B3621] uppercase tracking-tighter">Chế độ khách (Admin)</h1>
                  <p className="text-sm font-bold text-gray-400">Chọn bàn để xem dưới giao diện khách hàng</p>
                </div >

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {tables.map(t => {
                    // Check for unsent cart in local storage
                    const cartKey = `cart_table_${t.id}`;
                    const savedCart = localStorage.getItem(cartKey);
                    let cartCount = 0;
                    if (savedCart) {
                      try {
                        const parsed = JSON.parse(savedCart);
                        cartCount = Object.values(parsed).reduce((a: any, b: any) => a + b, 0) as number;
                      } catch { }
                    }

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTableId(String(t.id))}
                        className={`
                        relative p-6 rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-2 aspect-square shadow-sm
                        ${t.isOccupied
                            ? 'bg-gray-50 border-gray-100 text-gray-400 opacity-80'
                            : 'bg-white border-gray-100 text-[#4B3621] hover:border-[#C2A383] hover:shadow-md hover:scale-[1.02] active:scale-95'
                          }
                      `}
                      >
                        <span className="text-3xl font-black">{t.name.replace('Bàn ', '')}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                        {t.isOccupied && <span className="absolute top-4 right-4 text-[8px] bg-gray-200 px-2 py-0.5 rounded-full font-bold">ĐANG DÙNG</span>}
                        {cartCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg border-2 border-white animate-bounce-subtle z-10">
                            {cartCount} món chưa gửi
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="text-center flex gap-4 justify-center">
                  <button onClick={() => setRole('ADMIN')} className="text-xs font-black text-white bg-[#4B3621] px-6 py-3 rounded-xl uppercase tracking-widest shadow-lg hover:bg-[#C2A383] transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Quay lại Admin
                  </button>
                </div>
              </div >
            </div >
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] p-10 text-center">
              <div className="space-y-6">
                <i className="fas fa-qrcode text-6xl text-gray-300 animate-pulse"></i>
                <h3 className="text-2xl font-black text-[#4B3621] uppercase">Vui lòng quét mã QR</h3>
                <p className="text-sm text-gray-500 font-bold max-w-xs mx-auto">Bạn cần quét mã QR tại bàn để truy cập vào thực đơn.</p>
              </div>
            </div>
          )
        )
      )}
    </div >
  );
};

export default App;
