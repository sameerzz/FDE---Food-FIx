import { createClient } from "@supabase/supabase-js";

const metaEnv = (import.meta as any).env || {};

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const isSupabaseConfigured = !!(metaEnv.VITE_SUPABASE_URL && metaEnv.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
