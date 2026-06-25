import { SpreadsheetConfig } from '../types';

// We use a dedicated, unique bucket ID for GOOOAL CUP
const BUCKET_ID = 'gc_goldgi_v3_9a2f7c';

// Helper to get a safe, unique key based on the current domain name
function getStorageKey(): string {
  const hostname = window.location.hostname || 'localhost';
  // Replace dots or special characters to make a clean key
  return `config_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Fetch tournament configuration from the zero-setup cloud database
 */
export async function fetchConfigFromZeroDb(): Promise<SpreadsheetConfig | null> {
  const key = getStorageKey();
  const url = `https://kvdb.io/${BUCKET_ID}/${key}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Chưa có cấu hình lưu trên Cloud Database cho tên miền này.');
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.spreadsheetId) {
      console.log('Đã tải cấu hình thành công từ Zero-Setup Cloud Database cho tên miền:', window.location.hostname);
      return data as SpreadsheetConfig;
    }
  } catch (error) {
    console.warn('Không thể tải cấu hình từ Cloud Database, sử dụng LocalStorage làm dự phòng:', error);
  }
  return null;
}

/**
 * Save tournament configuration to the zero-setup cloud database
 */
export async function saveConfigToZeroDb(config: SpreadsheetConfig): Promise<{ success: boolean; error?: string }> {
  const key = getStorageKey();
  const url = `https://kvdb.io/${BUCKET_ID}/${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST', // kvdb.io accepts POST or PUT to write keys
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Mã lỗi HTTP: ${response.status}`);
    }

    console.log('Đã đồng bộ cấu hình thành công lên Cloud Database cho tên miền:', window.location.hostname);
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi đồng bộ lên Cloud Database:', error);
    return { 
      success: false, 
      error: error.message || 'Không thể kết nối tới máy chủ lưu trữ cấu hình.' 
    };
  }
}
