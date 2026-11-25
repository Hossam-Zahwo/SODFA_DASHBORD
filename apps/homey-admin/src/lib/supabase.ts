import { createClient } from '@supabase/supabase-js';
const url = "https://tzbckxumztwwyytryarw.supabase.co";
const key = "sb_publishable_JPrfFhOBpEg5eLjXQ1Pd0w_wTcYK0rP";
export const configured = Boolean(url && key);

export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'not-configured', { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sodfa-homey-admin-session' } });
export function requireConnection() { if (!configured)
    throw new Error('أضف إعدادات Supabase الصحيحة في ملف .env.local. لا يتم عرض أو حفظ بيانات محلية.'); }
