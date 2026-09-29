import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/constants/config";

// autoRefreshToken은 여전히 꺼둔다 — 세션 저장을 우리가 직접 관리하기로
// 했으니(expo-secure-store, lib/authStorage.ts) 자동 갱신도 이 client가
// 아니라 lib/api.ts가 refresh_token으로 명시적으로 처리한다(만료 임박 시
// supabase.auth.refreshSession() 호출). persistSession을 켜지 않은 client가
// 자기 혼자 갱신 타이머를 돌게 두면 우리가 관리하는 저장소랑 어긋날 수 있음.
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
