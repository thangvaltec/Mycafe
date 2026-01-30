import { Category, Expense, Product, Order, PaymentMethod, Table, BilliardSession } from '../types';

// AUTO-DETECT IP: Uses the same IP that the user is currently accessing the web from.
// Assuming Backend runs on the same machine but on port 5238.
export const API_URL = ((import.meta as any).env.VITE_API_URL as string) || `http://${window.location.hostname}:5238/api`;

// --- Helper with Timeout ---
const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    // CRITICAL FIX: Add 30-second timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const text = await res.text();
            // Translate common HTTP errors if backend returns raw status
            if (res.status === 404) throw new Error('Không tìm thấy dữ liệu (404)');
            if (res.status === 401) throw new Error('Phiên đăng nhập hết hạn (401)');
            if (res.status === 500) throw new Error('Lỗi máy chủ (500)');
            if (res.status === 400) throw new Error(text || 'Yêu cầu không hợp lệ (400)');

            throw new Error(text || `Lỗi không xác định (${res.status})`);
        }
        return res.json();
    } catch (err: any) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (err.name === 'AbortError') {
            throw new Error('Yêu cầu quá lâu (timeout 30s). Vui lòng thử lại.');
        }

        // Translate Network Errors
        const msg = err.message || err.toString();
        if (
            msg.includes('Failed to fetch') ||
            msg.includes('NetworkError') ||
            msg.includes('TypeError: Failed') ||
            err.name === 'TypeError'
        ) {
            throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc thử lại.');
        }
        throw err;
    }
};

export const api = {
    login: (username: string, pass: string) => fetchApi<{ token: string, role: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username, Password: pass })
    }),

    // Tables
    getTables: () => fetchApi<Table[]>('/table'),
    addTable: (table: Partial<Table>) => fetchApi<Table>('/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table)
    }),
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
    checkout: (tableIdOrOrderId: string | number, paymentMethod: PaymentMethod, receivedAmount: number, isOrderId: boolean = false, discount: number = 0) => {
        const body: any = {
            paymentMethod,
            receivedAmount,
            discount
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
    // Alias for explicit order checkout
    checkoutOrder: (orderId: string | number, paymentMethod: PaymentMethod, receivedAmount: number, discount: number = 0) => {
        return api.checkout(orderId, paymentMethod, receivedAmount, true, discount);
    },

    // Reports & Expenses
    getStats: (period = 'daily') => fetchApi(`/report/stats?period=${period}`),
    getExpenses: () => fetchApi<Expense[]>('/report/expenses'),
    addExpense: (expense: Partial<Expense>) => fetchApi<Expense>('/report/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
    }),
    deleteOrderItem: (orderId: string, itemId: string) => fetchApi(`/order/${orderId}/items/${itemId}`, {
        method: 'DELETE',
    }),
    updateOrderItem: (orderId: string, itemId: string, quantity: number) => fetchApi<Order>(`/order/${orderId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
    }),
    updateExpense: (expense: Expense) => fetchApi<Expense>(`/report/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
    }),
    deleteExpense: (id: string) => fetchApi(`/report/expenses/${id}`, { method: 'DELETE' }),
    exportCsv: () => {
        window.location.href = `${API_URL}/report/export`;
    },

    // Billiard Management
    getBilliardSessions: () => fetchApi<BilliardSession[]>('/billiard'),
    startBilliardSession: (session: { tableId: number, guestName: string, numPeople: number, pricePerHour: number, startTime?: string }) => fetchApi<BilliardSession>('/billiard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
    }),
    stopBilliardSession: (id: string) => fetchApi<BilliardSession>(`/billiard/${id}/stop`, { method: 'PUT' }),
    payBilliardSession: (id: string, totalAmount: number, endTime?: string) => fetchApi<BilliardSession>(`/billiard/${id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalAmount, endTime })
    }),

    // Unified Billing
    getBill: (tableId: number) => fetchApi<any>(`/billiard/${tableId}/bill`),
    // Unified Checkout with Manual Adjustment Support
    billiardCheckout: async (tableId: number, paymentMethod: string, paymentAmount?: number, finalStartTime?: string, finalEndTime?: string, discount?: number) => {
        const res = await fetch(`${API_URL}/billiard/${tableId}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod, paymentAmount, finalStartTime, finalEndTime, discount })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
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
