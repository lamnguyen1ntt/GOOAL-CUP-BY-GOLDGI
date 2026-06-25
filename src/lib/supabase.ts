import { createClient } from '@supabase/supabase-js';
import { SpreadsheetConfig } from '../types';

// Helper to get Supabase credentials from Env or LocalStorage
export function getSupabaseCredentials() {
  // 1. Try to get from localStorage (manual input override in Admin Panel)
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');

  if (localUrl && localKey) {
    return {
      url: localUrl,
      anonKey: localKey,
      source: 'localStorage',
    };
  }

  // 2. Fall back to Vite environment variables
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'environment',
    };
  }

  return null;
}

// Initialize Supabase Client
export function getSupabaseClient() {
  const creds = getSupabaseCredentials();
  if (!creds) return null;
  try {
    return createClient(creds.url, creds.anonKey, {
      auth: {
        persistSession: false,
      },
    });
  } catch (error) {
    console.error('Lỗi khởi tạo Supabase client:', error);
    return null;
  }
}

// Fetch Tournament Config from Supabase
export async function fetchTournamentConfigFromDb(): Promise<SpreadsheetConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('Chưa cấu hình Supabase Database. Sử dụng cấu hình mặc định.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('tournament_config')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      // If the table doesn't exist, log a helpful message but don't crash
      if (error.code === '42P01') {
        console.warn('Bảng tournament_config chưa được tạo trong Supabase. Hãy chạy lệnh SQL trong Admin Panel.');
      } else {
        console.error('Lỗi khi tải cấu hình từ Supabase:', error);
      }
      return null;
    }

    if (data && data.config) {
      return data.config as SpreadsheetConfig;
    }
  } catch (err) {
    console.error('Lỗi kết nối database Supabase:', err);
  }

  return null;
}

// Save Tournament Config to Supabase
export async function saveTournamentConfigToDb(config: SpreadsheetConfig): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { 
      success: false, 
      error: 'Chưa cấu hình thông tin Supabase Database (URL hoặc Anon Key).' 
    };
  }

  try {
    const { error } = await supabase
      .from('tournament_config')
      .upsert({ 
        id: 'default', 
        config: config,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Lỗi khi lưu cấu hình lên Supabase:', error);
      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Bảng "tournament_config" chưa tồn tại trong Supabase Database. Bạn cần chạy câu lệnh SQL khởi tạo bảng trong trang quản trị.'
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Lỗi kết nối khi lưu cấu hình:', err);
    return { success: false, error: err.message || 'Lỗi kết nối mạng đến Supabase.' };
  }
}
