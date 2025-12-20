
import React, { useState, useEffect } from 'react';
import { 
  Table, Product, Order, OrderStatus, Category, Expense, UserRole, OrderItem, PaymentMethod 
} from './types';
import { INITIAL_TABLES, INITIAL_PRODUCTS, CATEGORIES as STATIC_CATEGORIES } from './constants';
import AdminView from './components/AdminView';
import CustomerView from './components/CustomerView';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [selectedTableId, setSelectedTableId] = useState<string>('01');
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const savedOrders = localStorage.getItem('heritage_orders');
    const savedExpenses = localStorage.getItem('heritage_expenses');
    const savedProducts = localStorage.getItem('heritage_products');
    const savedTables = localStorage.getItem('heritage_tables');
    const savedCategories = localStorage.getItem('heritage_categories');
    
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedTables) setTables(JSON.parse(savedTables));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
  }, []);

  useEffect(() => {
    localStorage.setItem('heritage_orders', JSON.stringify(orders));
    localStorage.setItem('heritage_expenses', JSON.stringify(expenses));
    localStorage.setItem('heritage_products', JSON.stringify(products));
    localStorage.setItem('heritage_tables', JSON.stringify(tables));
    localStorage.setItem('heritage_categories', JSON.stringify(categories));
  }, [orders, expenses, products, tables, categories]);

  const handlePlaceOrder = (tableId: string, items: OrderItem[]) => {
    const total = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const table = tables.find(t => t.id === tableId);
    
    if ((tableId === 'MANG_VE' || (table?.isOccupied)) && tableId !== 'NEW_ORDER') {
      const activeOrder = orders.find(o => o.tableId === tableId && o.status !== OrderStatus.PAID);
      if (activeOrder) {
        setOrders(prev => prev.map(o => {
          if (o.id === activeOrder.id) {
            return {
              ...o,
              items: [...o.items, ...items],
              totalAmount: o.totalAmount + total
            };
          }
          return o;
        }));
        return;
      }
    }

    const newOrder: Order = {
      id: `HD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      tableId: tableId,
      status: OrderStatus.NEW,
      items,
      totalAmount: total,
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [...prev, newOrder]);
    
    if (tableId !== 'MANG_VE') {
      setTables(prev => prev.map(t => 
        t.id === tableId ? { ...t, isOccupied: true, currentOrderId: newOrder.id } : t
      ));
    }
  };

  const handleAddTable = () => {
    const nextId = (tables.length + 1).toString().padStart(2, '0');
    const newTable: Table = { id: nextId, name: `Bàn ${nextId}`, alias: 'Bàn mới tạo', isOccupied: false };
    setTables(prev => [...prev, newTable]);
  };

  const handleAddProduct = (p: Product) => setProducts(prev => [p, ...prev]);
  const handleUpdateProduct = (p: Product) => setProducts(prev => prev.map(old => old.id === p.id ? p : old));
  const handleDeleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const handleUpdateTable = (t: Table) => setTables(prev => prev.map(old => old.id === t.id ? t : old));
  const handleUpdateOrder = (o: Order) => setOrders(prev => prev.map(old => old.id === o.id ? o : old));
  const handleAddExpense = (e: Expense) => setExpenses(prev => [...prev, e]);
  
  const handleAddCategory = (c: Category) => setCategories(prev => [...prev, c]);
  const handleUpdateCategory = (c: Category) => setCategories(prev => prev.map(old => old.id === c.id ? c : old));
  const handleDeleteCategory = (id: string) => {
    if (products.some(p => p.categoryId === id)) {
      alert("Không thể xóa danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.");
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-[1440px] mx-auto min-h-screen">
      <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex gap-4 bg-[#1A1A19]/90 backdrop-blur px-6 py-3 rounded-[32px] border border-white/10 shadow-2xl items-center">
        <button 
          onClick={() => setRole(role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN')}
          className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
            role === 'ADMIN' ? 'bg-[#C2A383] text-[#4B3621]' : 'text-white/40'
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
          onUpdateOrder={handleUpdateOrder}
          onAddExpense={handleAddExpense}
          onPlaceOrder={handlePlaceOrder}
          onAddTable={handleAddTable}
          onSetOrders={setOrders}
          onSetExpenses={setExpenses}
          onSetTables={setTables}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      ) : (
        <CustomerView 
          table={tables.find(t => t.id === selectedTableId)!}
          products={products}
          categories={categories}
          activeOrder={orders.find(o => o.tableId === selectedTableId && o.status !== OrderStatus.PAID)}
          onPlaceOrder={(items) => handlePlaceOrder(selectedTableId, items)}
        />
      )}
    </div>
  );
};

export default App;
