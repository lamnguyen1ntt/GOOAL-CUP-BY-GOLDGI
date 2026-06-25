import { SpreadsheetConfig } from '../types';

/**
 * Fetch tournament configuration from our full-stack Express API backend
 */
export async function fetchConfigFromZeroDb(): Promise<SpreadsheetConfig | null> {
  const url = `/api/config`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.spreadsheetId) {
      console.log('Đã tải cấu hình thành công từ máy chủ backend.');
      return data as SpreadsheetConfig;
    }
  } catch (error) {
    console.warn('Không thể tải cấu hình từ máy chủ, sử dụng LocalStorage làm dự phòng:', error);
  }
  return null;
}

/**
 * Save tournament configuration to our full-stack Express API backend
 */
export async function saveConfigToZeroDb(config: SpreadsheetConfig): Promise<{ success: boolean; error?: string }> {
  const url = `/api/config`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Mã lỗi HTTP: ${response.status}`);
    }

    console.log('Đã đồng bộ cấu hình thành công lên máy chủ backend.');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi đồng bộ lên máy chủ backend:', error);
    return { 
      success: false, 
      error: error.message || 'Không thể kết nối tới máy chủ để lưu cấu hình.' 
    };
  }
}
