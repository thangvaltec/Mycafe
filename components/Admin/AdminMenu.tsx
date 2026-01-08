
import React, { useState, useRef } from 'react';
import { Product, Category } from '../../types';
import { formatVND, handleMoneyInput, parseVND, getImageUrl } from '../../utils/format';
import { compressImage } from '../../utils/compress';
import { api } from '../../services/api';

interface AdminMenuProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (c: Partial<Category>) => void;
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
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenProductModal = (p?: Product) => {
    const item = p || { categoryId: categories[0]?.id, isActive: true, imageUrl: '' };
    setEditingItem(item);
    setPriceInput(p?.price !== undefined ? formatVND(p.price) : '');
    setSelectedFile(null); // Reset file
    setIsProductModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file); // Store file for upload
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let imageUrl = editingItem.imageUrl || '';

    if (selectedFile) {
      try {
        showToast('Đang xử lý ảnh...', 'success'); // Inform user
        const compressedFile = await compressImage(selectedFile);
        const res = await api.uploadImage(compressedFile);
        imageUrl = res.path;
      } catch (err: any) {
        showToast('Tải ảnh thất bại: ' + (err.message || err), 'error');
        return;
      }
    }

    const finalProduct = {
      ...editingItem as Product,
      imageUrl: imageUrl,
      price: parseVND(priceInput)
    };

    if (finalProduct.id) {
      onUpdateProduct(finalProduct);
      showToast('Đã cập nhật món ăn');
    } else {
      const { id, ...newProduct } = finalProduct;
      onAddProduct(newProduct as Product);
      showToast('Đã thêm món mới');
    }
    setIsProductModalOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory({ name: newCatName.trim() });
    setNewCatName('');
    showToast('Đã thêm danh mục mới');
  };

  const handleSaveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (editingCategory.id) {
      onUpdateCategory(editingCategory as Category);
      showToast('Đã cập nhật danh mục');
    }
    setEditingCategory(null);
  };

  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const scrollToCategory = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white p-2 rounded-[24px] shadow-sm border border-gray-100">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-layer-group text-[#C2A383]"></i>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Duyệt nhanh danh mục</span>
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-1.5 bg-gray-50/50 p-1.5 rounded-3xl border border-gray-100">
            {categories.map(c => (
              <button key={c.id} onClick={() => scrollToCategory(c.id)} className="px-2 py-3 rounded-xl bg-white border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-[#4B3621] hover:border-[#C2A383] hover:shadow-md transition-all flex items-center justify-between group whitespace-normal break-words leading-tight h-full w-full">
                <span className="mr-0.5 text-left line-clamp-2 flex-1">{c.name}</span>
                <span className="bg-gray-100 text-gray-400 group-hover:bg-[#C2A383] group-hover:text-white px-1 py-0.5 rounded-md text-[9px] min-w-[16px] text-center transition-colors shrink-0 ml-1">{products.filter(p => p.categoryId === c.id).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full xl:w-auto shrink-0">
          <button onClick={() => setIsCategoryModalOpen(true)} className="border-2 border-[#C2A383]/30 text-[#4B3621] px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#C2A383]/10 text-center">QUẢN LÝ DANH MỤC</button>
          <button onClick={() => handleOpenProductModal()} className="bg-[#4B3621] text-white px-4 py-4 rounded-2xl font-black text-xs shadow-xl shadow-[#4B3621]/20 text-center uppercase tracking-widest">THÊM MÓN MỚI</button>
        </div>
      </div>

      <div className="space-y-16">
        {categories.map(cat => (
          <section key={cat.id} ref={el => { sectionRefs.current[cat.id] = el; }} className="space-y-8 scroll-mt-6">
            <div className="flex items-center gap-6 px-2">
              <h3 className="text-xl font-black text-[#4B3621] uppercase tracking-tighter whitespace-nowrap flex items-center gap-3">
                <span className="w-2 h-8 bg-[#C2A383] rounded-full"></span>{cat.name}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.filter(p => p.categoryId === cat.id).map(p => (
                <div key={p.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="w-full aspect-square rounded-[24px] overflow-hidden shadow-inner border border-gray-50 relative mb-4">
                    <img src={getImageUrl(p.imageUrl)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    {!p.isActive && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-red-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg transform -rotate-6 border border-white/20">Tạm ngưng</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 backdrop-blur text-[#4B3621] text-[10px] font-black px-2 py-1 rounded-lg shadow-sm border border-[#4B3621]/10">
                        {formatVND(p.price)}đ
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-w-0">
                    <h4 className="font-bold text-[#4B3621] text-sm leading-tight line-clamp-2 min-h-[2.5em] mb-1" title={p.name}>{p.name}</h4>
                    <p className="text-lg font-black text-[#C2A383] tracking-tighter mb-4">{formatVND(p.price)}đ</p>

                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => handleOpenProductModal(p)} className="flex-1 py-2.5 bg-gray-50 text-gray-400 rounded-xl font-black text-[9px] uppercase hover:bg-[#C2A383] hover:text-white transition-all flex items-center justify-center gap-1.5 group/btn">
                        <i className="fas fa-pen"></i> SỬA
                      </button>
                      <button onClick={() => confirm('Xóa món này?') && onDeleteProduct(p.id)} className="flex-1 py-2.5 bg-red-50 text-red-400 rounded-xl font-black text-[9px] uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5 group/btn">
                        <i className="fas fa-trash"></i> XÓA
                      </button>
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
                      <img src={getImageUrl(editingItem.imageUrl)} className="w-full h-full object-cover" alt="Preview" />
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
                  <input required type="text" value={editingItem?.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} placeholder="VD: Cà phê cốt dừa..." className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-[#C2A383] transition-all" />
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
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Danh mục</label>
                    <select value={editingItem?.categoryId} onChange={e => setEditingItem({ ...editingItem, categoryId: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none appearance-none border-2 border-transparent focus:border-[#C2A383] transition-all">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Mô tả ngắn</label>
                  <textarea value={editingItem?.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Mô tả hương vị món ăn..." className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-[#C2A383] transition-all h-24 resize-none"></textarea>
                </div>

                <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <input type="checkbox" id="isActive" checked={editingItem?.isActive ?? true} onChange={e => setEditingItem({ ...editingItem, isActive: e.target.checked })} className="w-5 h-5 accent-emerald-600 rounded-md cursor-pointer" />
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
            <h3 className="text-2xl font-black text-[#4B3621]">Quản lý Danh mục</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              <div className="p-2 border-2 border-[#C2A383]/20 bg-[#FAF9F6] rounded-3xl flex gap-2">
                <input placeholder="Tên danh mục mới..." className="flex-1 bg-transparent outline-none text-xs font-black p-3" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <button onClick={handleCreateCategory} className="bg-[#4B3621] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">TẠO</button>
              </div>
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  {editingCategory?.id === c.id ? (
                    <div className="flex-1">
                      <input
                        autoFocus
                        className="w-full bg-white border-2 border-[#C2A383] rounded-xl px-4 py-2 outline-none font-black text-xs"
                        value={editingCategory.name}
                        onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCategoryEdit(e as any)}
                      />
                    </div>
                  ) : <span className="font-black text-[#4B3621] uppercase text-xs">{c.name}</span>}
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCategory(c)} className="px-3 py-2 rounded-xl bg-white text-gray-400 shadow-sm border border-gray-100 flex items-center gap-1 hover:text-[#C2A383] hover:border-[#C2A383] transition-colors font-black text-[9px] uppercase"><i className="fas fa-pen"></i> Sửa</button>
                    <button onClick={() => onDeleteCategory(c.id)} className="px-3 py-2 rounded-xl bg-white text-gray-400 shadow-sm border border-gray-100 flex items-center gap-1 hover:text-red-500 hover:border-red-200 transition-colors font-black text-[9px] uppercase"><i className="fas fa-trash"></i> Xóa</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              {editingCategory ? (
                <>
                  <button onClick={() => setEditingCategory(null)} className="flex-1 bg-gray-100 text-gray-400 py-6 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-sm">BỎ QUA</button>
                  <button onClick={handleSaveCategoryEdit as any} className="flex-1 bg-emerald-500 text-white py-6 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">LƯU LẠI</button>
                </>
              ) : (
                <button onClick={() => setIsCategoryModalOpen(false)} className="w-full bg-gray-100 text-gray-500 py-6 rounded-[24px] font-black uppercase text-[11px] tracking-widest">ĐÓNG CỬA SỔ</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
