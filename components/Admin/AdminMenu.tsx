
import React, { useState, useRef } from 'react';
import { Product, Category } from '../../types';
import { formatVND, handleMoneyInput, parseVND } from '../../utils/format';

interface AdminMenuProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
}

const AdminMenu: React.FC<AdminMenuProps> = ({ 
  products, categories, onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddCategory, onUpdateCategory, onDeleteCategory
}) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenProductModal = (p?: Product) => {
    const item = p || { categoryId: categories[0]?.id, isActive: true, imageUrl: '' };
    setEditingItem(item);
    setPriceInput(p?.price !== undefined ? formatVND(p.price) : '');
    setIsProductModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const finalProduct = {
      ...editingItem as Product,
      price: parseVND(priceInput)
    };

    if (finalProduct.id) {
      onUpdateProduct(finalProduct);
    } else {
      onAddProduct({ ...finalProduct, id: `p${Date.now()}` });
    }
    setIsProductModalOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory({ id: `cat-${Date.now()}`, name: newCatName.trim() });
    setNewCatName('');
  };

  const handleSaveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (editingCategory.id) {
      onUpdateCategory(editingCategory as Category);
    }
    setEditingCategory(null);
  };

  const scrollToCategory = (id: string) => {
    const element = document.getElementById(`cat-section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-layer-group text-[#C2A383]"></i>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Duyệt nhanh hàng mục</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c.id} onClick={() => scrollToCategory(c.id)} className="px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#4B3621] hover:bg-[#C2A383]/10 transition-all flex items-center gap-2">
                {c.name}
                <span className="bg-gray-200/50 text-gray-400 px-2 py-0.5 rounded-lg text-[8px]">{products.filter(p => p.categoryId === c.id).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
          <button onClick={() => setIsCategoryModalOpen(true)} className="flex-1 sm:flex-none border-2 border-[#C2A383]/30 text-[#4B3621] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#C2A383]/10">QUẢN LÝ HÀNG MỤC</button>
          <button onClick={() => handleOpenProductModal()} className="flex-1 sm:flex-none bg-[#4B3621] text-white px-10 py-5 rounded-2xl font-black text-xs shadow-xl shadow-[#4B3621]/20">THÊM MÓN MỚI</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto admin-scroll pb-32 space-y-16">
        {categories.map(cat => (
          <section key={cat.id} id={`cat-section-${cat.id}`} className="space-y-8 scroll-mt-10">
            <div className="flex items-center gap-6 px-2">
              <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter whitespace-nowrap flex items-center gap-3">
                <span className="w-2 h-8 bg-[#C2A383] rounded-full"></span>{cat.name}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {products.filter(p => p.categoryId === cat.id).map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[48px] shadow-sm border border-gray-50 flex gap-6 items-center hover:shadow-xl transition-all">
                  <div className="w-32 h-32 rounded-[36px] overflow-hidden shadow-md shrink-0 border-4 border-gray-50 relative">
                    <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                    {!p.isActive && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center"><span className="bg-gray-800 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">TẠM NGƯNG</span></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-[#4B3621] text-lg leading-tight truncate">{p.name}</h4>
                    <p className="text-xl font-black text-[#C2A383] mt-1 tracking-tighter">{formatVND(p.price)}đ</p>
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => handleOpenProductModal(p)} className="flex-1 py-3 bg-[#FAF9F6] text-[9px] font-black uppercase rounded-2xl hover:bg-[#C2A383] hover:text-white transition-all text-gray-400">SỬA</button>
                      <button onClick={() => confirm('Xóa món này?') && onDeleteProduct(p.id)} className="px-4 py-3 bg-red-50 text-red-300 text-[9px] font-black uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Modal Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)}></div>
          <form onSubmit={handleSaveProduct} className="relative bg-white rounded-[48px] p-8 lg:p-10 w-full max-w-lg shadow-2xl space-y-6 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="text-2xl font-black text-[#4B3621] mb-4">{editingItem?.id ? 'Cập Nhật Món Ăn' : 'Thêm Món Mới'}</h3>
            
            <div className="space-y-6">
              {/* Image Upload Area */}
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={triggerFileSelect}
                  className="w-48 h-48 rounded-[40px] bg-gray-50 border-4 border-dashed border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:border-[#C2A383]/50 transition-all overflow-hidden relative group"
                >
                  {editingItem?.imageUrl ? (
                    <>
                      <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">
                        Đổi ảnh mới
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <i className="fas fa-camera text-3xl text-gray-200 mb-2"></i>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Chạm để chọn ảnh từ máy</p>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Tên món ăn</label>
                  <input required type="text" value={editingItem?.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="VD: Cà phê cốt dừa..." className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-[#C2A383] transition-all" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Giá bán (VNĐ)</label>
                    <div className="relative">
                      <input required type="text" inputMode="numeric" value={priceInput} onChange={e => setPriceInput(handleMoneyInput(e.target.value))} placeholder="0" className="w-full bg-gray-50 rounded-2xl p-4 font-black outline-none border-2 border-transparent focus:border-[#C2A383] transition-all" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">đ</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Hàng mục</label>
                    <select value={editingItem?.categoryId} onChange={e => setEditingItem({...editingItem, categoryId: e.target.value})} className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none appearance-none border-2 border-transparent focus:border-[#C2A383] transition-all">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Mô tả ngắn</label>
                  <textarea value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Mô tả hương vị món ăn..." className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-[#C2A383] transition-all h-24 resize-none"></textarea>
                </div>

                <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <input type="checkbox" id="isActive" checked={editingItem?.isActive ?? true} onChange={e => setEditingItem({...editingItem, isActive: e.target.checked})} className="w-5 h-5 accent-emerald-600 rounded-md cursor-pointer" />
                  <label htmlFor="isActive" className="text-[10px] font-black text-emerald-700 uppercase tracking-widest cursor-pointer">Sẵn sàng phục vụ</label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-gray-100 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest">Hủy bỏ</button>
               <button type="submit" className="flex-1 bg-[#4B3621] text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#4B3621]/20 active:scale-95 transition-transform">Lưu thông tin</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Category Management */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
          <div className="relative bg-white rounded-[48px] p-10 w-full max-w-lg shadow-2xl space-y-8 animate-slide-up">
            <h3 className="text-2xl font-black text-[#4B3621]">Quản lý Hàng mục</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              <div className="p-2 border-2 border-[#C2A383]/20 bg-[#FAF9F6] rounded-3xl flex gap-2">
                <input placeholder="Tên hàng mục mới..." className="flex-1 bg-transparent outline-none text-xs font-black p-3" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <button onClick={handleCreateCategory} className="bg-[#4B3621] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">TẠO</button>
              </div>
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  {editingCategory?.id === c.id ? (
                    <form onSubmit={handleSaveCategoryEdit} className="flex-1 flex gap-2">
                      <input autoFocus className="flex-1 bg-white border border-[#C2A383] rounded-xl px-3 py-1 outline-none font-black text-xs" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} />
                      <button type="submit" className="text-emerald-500 font-black text-[10px]">Lưu</button>
                    </form>
                  ) : <span className="font-black text-[#4B3621] uppercase text-xs">{c.name}</span>}
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCategory(c)} className="w-8 h-8 rounded-xl bg-white text-gray-400 shadow-sm"><i className="fas fa-pen text-[10px]"></i></button>
                    <button onClick={() => onDeleteCategory(c.id)} className="w-8 h-8 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm"><i className="fas fa-trash text-[10px]"></i></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setIsCategoryModalOpen(false)} className="w-full bg-gray-100 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px]">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
