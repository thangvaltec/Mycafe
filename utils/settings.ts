// Hardcoded Bank Settings as requested
export const BANK_INFO = {
  BANK_ID: 'TCB',
  ACCOUNT_NO: '56782888888',
  ACCOUNT_NAME: 'PHAM THI THANH LOAN',
  TEMPLATE: 'compact' // Using 'compact' to match the user's provided image style (with header/logos)
};

export const getBankQrUrl = (amount: number, description: string = 'Thanh toan'): string => {
  // VietQR Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
  let url = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${BANK_INFO.ACCOUNT_NO}-${BANK_INFO.TEMPLATE}.png`;

  const params = new URLSearchParams();
  params.append('amount', amount.toString());
  params.append('addInfo', description);
  params.append('accountName', BANK_INFO.ACCOUNT_NAME);

  return `${url}?${params.toString()}`;
};

// Exporting these for compatibility if needed, though they are static now
export const getBankSettings = () => ({
  bankId: BANK_INFO.BANK_ID,
  accountNo: BANK_INFO.ACCOUNT_NO,
  accountName: BANK_INFO.ACCOUNT_NAME,
  template: BANK_INFO.TEMPLATE
});

export const SUPPORTED_BANKS = [
  { id: 'TCB', name: 'Techcombank', bin: '970407' }
];
