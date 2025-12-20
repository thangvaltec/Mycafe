import { Category, Expense, Product, Order, PaymentMethod, Table } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string) || '/api'; // Use env var for Prod, fallback to proxy for Dev

// --- Helper ---
const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
};

export const api = {
    login: (username: string, pass: string) => fetchApi<{ token: string, role: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username, Password: pass })
    }),

    // Tables
    getTables: () => fetchApi<Table[]>('/table'),
    createTable: (table: Partial<Table>) => fetchApi<Table>('/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table)
    }),
    updateTable: (table: Table) => fetchApi<Table>(`/table/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table)
    }),
    deleteTable: (id: number | string) => fetchApi(`/table/${id}`, { method: 'DELETE' }),

    // Categories
    getCategories: () => fetchApi<Category[]>('/menu/categories'),
    createCategory: (category: Partial<Category>) => fetchApi<Category>('/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
    }),
    updateCategory: (category: Category) => fetchApi<Category>(`/menu/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
    }),
    deleteCategory: (id: string) => fetchApi(`/menu/categories/${id}`, { method: 'DELETE' }),

    // Products (Menu Items) - Map backend 'imagePath' to frontend 'imageUrl'
    getProducts: async () => {
        const items = await fetchApi<any[]>('/menu/items');
        return items.map(mapToProduct);
    },
    createProduct: async (product: Partial<Product>) => {
        const mapped = { ...product, imagePath: product.imageUrl };
        const res = await fetchApi<any>('/menu/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapped)
        });
        return mapToProduct(res);
    },
    updateProduct: async (product: Product) => {
        const mapped = { ...product, imagePath: product.imageUrl };
        const res = await fetchApi<any>(`/menu/items/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapped)
        });
        return mapToProduct(res);
    },
    deleteProduct: (id: string) => fetchApi(`/menu/items/${id}`, { method: 'DELETE' }),
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/menu/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json(); // { path: "..." }
    },

    // Orders
    getOrders: () => fetchApi<Order[]>('/order'),
    getOrderForTable: (tableId: string) => fetchApi<Order>(`/order/table/${tableId}`).catch(() => null),
    placeOrder: (tableId: string | number, items: { productId: string, productName: string, price: number, quantity: number }[]) =>
        fetchApi<Order>('/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId: Number(tableId), items })
        }),

    // Payment
    checkout: (tableIdOrOrderId: string | number, paymentMethod: PaymentMethod, receivedAmount: number, isOrderId: boolean = false) => {
        const body: any = {
            paymentMethod,
            receivedAmount
        };

        if (isOrderId) {
            body.orderId = tableIdOrOrderId;
        } else {
            body.tableId = Number(tableIdOrOrderId);
        }

        return fetchApi('/payment/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    },

    // Reports & Expenses
    getStats: (period = 'daily') => fetchApi(`/report/stats?period=${period}`),
    getExpenses: () => fetchApi<Expense[]>('/report/expenses'),
    addExpense: (expense: Partial<Expense>) => fetchApi<Expense>('/report/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
    }),
    exportCsv: () => {
        window.location.href = `${API_URL}/report/export`;
    }
};

const mapToProduct = (item: any): Product => ({
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    price: item.price,
    imageUrl: item.imagePath || '',
    isActive: item.isActive,
    description: item.description
});
