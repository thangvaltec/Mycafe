
export enum OrderStatus {
  NEW = 'Mới',
  PROCESSING = 'Đang làm',
  COMPLETED = 'Hoàn thành',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy'
}

export enum PaymentMethod {
  CASH = 'Tiền mặt',
  BANK_TRANSFER = 'Chuyển khoản'
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  description?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  paymentAmount?: number;
  changeAmount?: number;
}

export interface Table {
  id: string;
  name: string;
  alias?: string;     // Tên gợi nhớ vị trí: Cửa sổ, Ngoài trời...
  guestName?: string; // Tên khách hiện tại
  isOccupied: boolean;
  currentOrderId?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export type UserRole = 'CUSTOMER' | 'ADMIN';
