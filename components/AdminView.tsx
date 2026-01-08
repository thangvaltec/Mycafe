
import React, { useState } from 'react';
import { Table, Product, Order, Category, Expense, OrderItem, OrderStatus, UserRole } from '../types';
import AdminPOS from './Admin/AdminPOS';
import AdminOrders from './Admin/AdminOrders';
import AdminMenu from './Admin/AdminMenu';
import AdminExpenses from './Admin/AdminExpenses';
import AdminReport from './Admin/AdminReport';
import AdminTakeaway from './Admin/AdminTakeaway';
import AdminBilliard from './Admin/AdminBilliard';
import CustomerView from './CustomerView';
import { api } from '../services/api';

interface AdminViewProps {
  tables: Table[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  expenses: Expense[];
  onAddProduct: (p: Partial<Product>) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateTable: (t: Table) => void;
  onDeleteTable: (id: number) => void;
  onUpdateOrder: (o: Order) => void;
  onAddExpense: (e: Partial<Expense>) => void;
  onUpdateExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onPlaceOrder: (tableId: string, items: OrderItem[]) => void;
  onAddTable: () => void;
  onSetOrders: (orders: Order[]) => void;
  onSetExpenses: (expenses: Expense[]) => void;
  onSetTables: (tables: Table[]) => void;
  onAddCategory: (c: Partial<Category>) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
  onLogout: () => void;
  onSwitchMode: () => void; // NEW
  role: UserRole;
}

const AdminView: React.FC<AdminViewProps> = ({
  tables, products, categories, orders, expenses,
  onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateTable, onDeleteTable, onUpdateOrder, onAddExpense, onUpdateExpense, onDeleteExpense, onPlaceOrder, onAddTable,
  onSetOrders, onSetExpenses, onSetTables, onAddCategory, onUpdateCategory, onDeleteCategory,
  onLogout, onSwitchMode, role
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'takeaway' | 'expenses' | 'orders' | 'menu' | 'report' | 'billiard'>('pos');
  const [isStaffOrdering, setIsStaffOrdering] = useState(false);
  const [currentOrderingTable, setCurrentOrderingTable] = useState<Table | { id: string, name: string, guestName?: string } | null>(null);

  const revenue = orders.filter(o => {
    if (o.status !== OrderStatus.PAID) return false;
    return new Date(o.createdAt).toDateString() === new Date().toDateString();
  }).reduce((acc, b) => acc + b.totalAmount, 0);

  const handleOpenOrderView = (table: Table | { id: string, name: string, guestName?: string }) => {
    setCurrentOrderingTable(table);
    setIsStaffOrdering(true);
  };

  const handleStaffPlaceOrder = (items: OrderItem[]) => {
    if (currentOrderingTable) {
      onPlaceOrder(currentOrderingTable.id, items);
      setIsStaffOrdering(false);
    }
  };

  const handleRemoveItem = async (itemId: string, orderId?: string) => {
    let activeOrder = null;
    if (orderId) {
      activeOrder = orders.find(o => o.id === orderId);
    } else if (currentOrderingTable) {
      activeOrder = orders.find(o => o.tableId === currentOrderingTable.id && o.status !== OrderStatus.PAID);
    }

    if (!activeOrder) return;

    try {
      const updatedOrder = (await api.deleteOrderItem(activeOrder.id, itemId)) as Order;
      onSetOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    } catch (err: any) {
      alert('Không thể xóa món: ' + (err.message || err));
    }
  };

  if (isStaffOrdering && currentOrderingTable) {
    return (
      <div className="fixed inset-0 z-[150] bg-white overflow-y-auto">
        <div className="sticky top-0 z-[160] bg-[#4B3621] p-4 flex items-center justify-between text-white shadow-xl">
          <button onClick={() => setIsStaffOrdering(false)} className="flex items-center gap-2 font-bold p-2 text-xs">
            <i className="fas fa-chevron-left"></i> QUAY LẠI
          </button>
          <div className="text-center">
            <p className="text-[10px] opacity-60 font-black uppercase">Ghi món cho</p>
            <p className="font-black">{currentOrderingTable.name} {currentOrderingTable.guestName ? `- ${currentOrderingTable.guestName}` : ''}</p>
          </div>
          <div className="w-10"></div>
        </div>
        <CustomerView
          table={currentOrderingTable as Table}
          products={products}
          categories={categories}
          activeOrder={orders.find(o => o.tableId === currentOrderingTable.id && o.status !== OrderStatus.PAID)}
          onPlaceOrder={handleStaffPlaceOrder}
          compact
          isAdmin={true}
          onRemoveItem={handleRemoveItem}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8F7F3] overflow-hidden">
      {/* Sidebar Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 lg:h-screen lg:w-24 xl:w-72 bg-[#1A1A19] text-white flex lg:flex-col lg:relative z-[100] shadow-2xl">
        <div className="hidden lg:flex flex-col items-center xl:items-start gap-4 p-8 w-full border-b border-white/5">
          <div className="w-12 h-12 bg-[#C2A383] rounded-2xl flex items-center justify-center text-[#4B3621] text-2xl font-black">H</div>
          <div className="hidden xl:block">
            <h1 className="font-black text-lg leading-none tracking-tighter">Com Cafe</h1>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Hệ thống quản trị</p>
          </div>
        </div>
        <div className="flex flex-1 justify-around lg:flex-col lg:justify-start lg:p-4 gap-1 lg:gap-2 w-full">
          {[
            { id: 'pos', icon: 'fa-table-cells', label: 'Phục vụ' },
            { id: 'takeaway', icon: 'fa-bag-shopping', label: 'Mang về' },
            { id: 'billiard', icon: 'fa-circle-dot', label: 'Bida' },
            { id: 'orders', icon: 'fa-receipt', label: 'Đơn hàng' },
            { id: 'menu', icon: 'fa-mug-hot', label: 'Thực đơn' },
            { id: 'expenses', icon: 'fa-wallet', label: 'Chi phí' },
            { id: 'report', icon: 'fa-chart-pie', label: 'Báo cáo' }
          ].filter(item => role !== 'STAFF' || (item.id !== 'expenses' && item.id !== 'report')).map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex-1 lg:flex-none p-2 lg:p-4 rounded-xl lg:rounded-2xl flex flex-col lg:flex-row items-center gap-1 lg:gap-4 transition-all ${activeTab === item.id ? 'bg-[#C2A383] text-[#4B3621] font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}>
              <i className={`fas ${item.icon} text-lg lg:text-xl`}></i>
              <span className="text-[10px] lg:text-sm font-black whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="hidden lg:flex p-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full p-4 rounded-2xl flex items-center gap-4 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <i className="fas fa-sign-out-alt text-xl"></i>
            <span className="hidden xl:block text-sm font-black whitespace-nowrap uppercase tracking-widest">Đăng xuất</span>
          </button>
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        <header className="h-16 lg:h-24 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-10 shrink-0 z-10 relative">
          {/* LEFT: Title */}
          <div className="flex items-center">
            <h2 className="text-lg lg:text-2xl font-black text-[#4B3621] uppercase tracking-tighter truncate leading-none">
              {activeTab === 'pos' && 'Phục vụ tại bàn'}
              {activeTab === 'takeaway' && 'Đơn mang về'}
              {activeTab === 'orders' && 'Lịch sử hóa đơn'}
              {activeTab === 'menu' && 'Thực đơn'}
              {activeTab === 'billiard' && 'Quản lý Bida'}
              {activeTab === 'expenses' && 'Chi phí'}
              {activeTab === 'report' && 'Doanh thu'}
            </h2>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Revenue - Hidden on very small screens */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">Doanh thu</span>
              <span className="text-lg font-black text-[#2D5A27] leading-none">{revenue.toLocaleString()}đ</span>
            </div>

            {/* Switch Mode Button */}
            <button
              onClick={onSwitchMode}
              className="h-10 px-4 bg-[#4B3621] text-white rounded-xl flex items-center gap-2 hover:bg-[#C2A383] transition-all shadow-lg active:scale-95"
            >
              <i className="fas fa-eye text-xs"></i>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Giao diện khách</span>
              <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">Khách</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-100 shadow-sm active:scale-95"
              title="Đăng xuất"
            >
              <i className="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 bg-[#F8F7F3] overflow-y-auto p-4 lg:p-10 admin-scroll">
          {activeTab === 'pos' && (
            <AdminPOS
              tables={tables}
              orders={orders}
              onUpdateTable={onUpdateTable}
              onUpdateOrder={onUpdateOrder}
              onOpenOrderView={handleOpenOrderView}
              onAddTable={onAddTable}
              onDeleteTable={onDeleteTable}
            />
          )}
          {activeTab === 'takeaway' && (
            <AdminTakeaway
              orders={orders}
              tables={tables}
              onUpdateOrder={onUpdateOrder}
              onOpenOrderView={handleOpenOrderView}
            />
          )}
          {activeTab === 'billiard' && (
            <AdminBilliard
              tables={tables}
              onOpenOrderView={handleOpenOrderView}
              onSetTables={onSetTables}
            />
          )}
          {activeTab === 'orders' && (
            <AdminOrders
              orders={orders}
              tables={tables}
              onUpdateOrder={onUpdateOrder}
              onUpdateTable={onUpdateTable}
              onOpenOrderView={(id) => handleOpenOrderView(tables.find(t => t.id === id)!)}
              onDeleteOrderItem={handleRemoveItem}
            />
          )}
          {activeTab === 'menu' && (
            <AdminMenu
              products={products}
              categories={categories}
              onAddProduct={onAddProduct}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
            />
          )}
          {activeTab === 'expenses' && (
            <AdminExpenses
              expenses={expenses}
              onAddExpense={onAddExpense}
              onUpdateExpense={onUpdateExpense}
              onDeleteExpense={onDeleteExpense}
            />
          )}
          {activeTab === 'report' && (
            <AdminReport
              orders={orders}
              expenses={expenses}
              tables={tables}
              onSetOrders={onSetOrders}
              onSetExpenses={onSetExpenses}
              onSetTables={onSetTables}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminView;
