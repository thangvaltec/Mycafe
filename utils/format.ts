
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

export const parseVND = (formattedValue: string): number => {
  // Loại bỏ tất cả ký tự không phải số (bao gồm dấu chấm, phẩy của định dạng cũ)
  return parseInt(formattedValue.replace(/\D/g, '')) || 0;
};

export const handleMoneyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(numericValue));
};

export const getImageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  // Get API URL from env or fallback common patterns
  const apiUrl = ((import.meta as any).env.VITE_API_URL as string) || 'http://192.168.0.30:5238/api';
  const baseUrl = apiUrl.replace('/api', ''); // Remove /api suffix to get host

  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};
