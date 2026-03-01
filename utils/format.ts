
import { API_URL } from '../services/api';

export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Luôn hiển thị giờ theo múi giờ Việt Nam (UTC+7) – bất kể máy chủ hay máy ở đâu
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const formatTime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '--:--';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: VN_TIMEZONE });
};

export const formatDateVN = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '--/--/----';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '--/--/----';
  return d.toLocaleDateString('vi-VN', { timeZone: VN_TIMEZONE });
};

export const formatDateTimeVN = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '--:-- --/--/----';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '--:-- --/--/----';
  return `${formatTime(d)} ${formatDateVN(d)}`;
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

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  // Normalize path separators and ensure leading slash
  const normalizedPath = path.replace(/\\/g, '/');
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

  // Clean API_URL (remove /api suffix if we are appending a root-relative static file path?)
  // Wait, API_URL is .../api. Static files are usually at root .../
  // Backend standard: static files at root. API at /api.
  // So we need BASE_URL, not API_URL.

  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}${cleanPath}`;
};
