
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
