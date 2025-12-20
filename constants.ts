
import { Category, Product, Table } from './types';

export const BANK_QR_IMAGE_URL = "https://img.vietqr.io/image/hdbank-999990-compact.jpg?accountName=HOANG%20THI%20TAM&amount=0&addInfo=Thanh%20toan%20Com%20Cafe";

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cà Phê Truyền Thống' },
  { id: 'c2', name: 'Trà Trái Cây Tươi' },
  { id: 'c3', name: 'Đá Xay Đặc Biệt' },
  { id: 'c4', name: 'Bánh Ngọt & Tráng Miệng' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    categoryId: 'c1',
    name: 'Phin Sữa Đá Đậm Đà',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1544787210-2827255ec394?q=80&w=400&auto=format&fit=crop',
    isActive: true,
    description: 'Cà phê Robusta Buôn Ma Thuột pha phin truyền thống, hòa quyện sữa đặc thơm béo.'
  },
  {
    id: 'p2',
    categoryId: 'c1',
    name: 'Bạc Xỉu Sương Muối',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=400&auto=format&fit=crop',
    isActive: true,
    description: 'Vị cà phê nhẹ nhàng kết hợp sữa tươi và một chút muối hồng tinh tế.'
  },
  {
    id: 'p3',
    categoryId: 'c2',
    name: 'Trà Sen Vàng Macchiato',
    price: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?q=80&w=400&auto=format&fit=crop',
    isActive: true,
    description: 'Cốt trà Ô Long thanh mát, sen vàng giòn ngọt và lớp kem béo ngậy.'
  }
];

export const INITIAL_TABLES: Table[] = [
  { id: '01', name: 'Bàn 01', alias: 'Cạnh cửa sổ', isOccupied: false },
  { id: '02', name: 'Bàn 02', alias: 'Gần quầy bar', isOccupied: false },
  { id: '03', name: 'Bàn 03', alias: 'Khu sofa', isOccupied: false },
  { id: '04', name: 'Bàn 04', alias: 'Ngoài sân', isOccupied: false },
  { id: '05', name: 'Bàn 05', alias: 'Ngoài sân', isOccupied: false },
  { id: '06', name: 'Bàn 06', alias: 'Góc khuất', isOccupied: false },
];
