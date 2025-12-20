import React, { useState, useEffect } from 'react';
import {
  Table, Product, Order, OrderStatus, Category, Expense, UserRole, OrderItem
} from './types';
import { api } from './services/api';
import AdminView from './components/AdminView';
import CustomerView from './components/CustomerView';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [role, setRole] = useState<UserRole>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tableId')) return 'CUSTOMER';
    return (localStorage.getItem('userRole') as UserRole) || 'CUSTOMER';
  });
  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tableId') || '01';
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

      if (t.length > 0 && !t.find(tbl => String(tbl.id) === String(selectedTableId))) {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('tableId')) {
          setSelectedTableId(String(t[0].id));
        }
      }
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

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login(username, password);
      if (res.token) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', res.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER');
        setIsLoggedIn(true);
        if (res.role === 'ADMIN') setRole('ADMIN');
      } else {
        setLoginError('Không nhận được token xác thực.');
      }
    } catch (err) {
      setLoginError('Đăng nhập thất bại. Kiểm tra lại tài khoản');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
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
    } catch (err) {
      alert("Failed to place order: " + err);
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
    if (confirm('Delete product?')) {
      await api.deleteProduct(id);
      loadData();
    }
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#C2A383]/20">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-[#4B3621] uppercase tracking-tighter">Com Cafe</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Hệ thống quản trị</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tài khoản</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-[#4B3621] outline-none focus:border-[#C2A383]"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-[#4B3621] outline-none focus:border-[#C2A383]"
                placeholder="******"
              />
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-[#4B3621] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-[#C2A383] transition-colors">
              Đăng nhập
            </button>
          </form>
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
      {!isQRCodeAccess && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex gap-4 bg-[#1A1A19]/90 backdrop-blur px-6 py-3 rounded-[32px] border border-white/10 shadow-2xl items-center">
          <button
            onClick={() => setRole(role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN')}
            className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${role === 'ADMIN' ? 'bg-[#C2A383] text-[#4B3621]' : 'text-white/40'
              }`}
          >
            {role === 'ADMIN' ? 'QUẢN LÝ / POS' : 'GIAO DIỆN KHÁCH'}
          </button>

          {role === 'CUSTOMER' && (
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Đang ở:</span>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-transparent text-[#C2A383] text-[10px] font-black border-none outline-none cursor-pointer uppercase tracking-widest"
              >
                {tables.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {role === 'ADMIN' ? (
        <AdminView
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
          onPlaceOrder={handlePlaceOrder}
          onAddTable={handleAddTable}
          onSetOrders={(newOrders) => { }}
          onSetExpenses={(newExpenses) => { }}
          onSetTables={(newTables) => { }}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onLogout={handleLogout}
        />
      ) : (
        currentCustomerTable ? (
          <CustomerView
            table={currentCustomerTable}
            products={products}
            categories={categories}
            activeOrder={orders.find(o => String(o.tableId) === String(selectedTableId) && (o.status !== 'PAID' && o.status !== OrderStatus.PAID))}
            onPlaceOrder={(items) => handlePlaceOrder(selectedTableId, items)}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] p-10 text-center">
            <div className="space-y-6">
              <i className="fas fa-exclamation-triangle text-4xl text-red-400"></i>
              <h3 className="text-xl font-black text-[#4B3621]">KHÔNG TÌM THẤY BÀN</h3>
              <p className="text-xs text-gray-500 font-bold">Mã QR này có vẻ không hợp lệ hoặc bàn đã bị xóa khỏi hệ thống. Vui lòng quét lại mã khác.</p>
              <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-[#4B3621] text-white rounded-2xl font-black text-[10px] uppercase">Về trang chủ</button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default App;
