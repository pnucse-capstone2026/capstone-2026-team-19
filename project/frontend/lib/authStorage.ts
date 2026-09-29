import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const IS_LOGGED_IN_KEY = "izzima:isLoggedIn";
const ACCESS_TOKEN_KEY = "izzima.accessToken";
const REFRESH_TOKEN_KEY = "izzima.refreshToken";

export interface StoredAuth {
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

export async function getStoredAuth(): Promise<StoredAuth> {
  const [isLoggedIn, accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(IS_LOGGED_IN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return { isLoggedIn: isLoggedIn === "true", accessToken, refreshToken };
}

// accessToken/refreshToken은 optional로 남겨둠 — 이메일 로그인 버튼이 나중에
// 다시 mock으로 되돌아갈 일이 있으면(세션 없이) 이 함수는 여전히 로그인 상태
// 플래그만 세팅할 수 있어야 하니까.
export async function setStoredAuth(
  accessToken?: string,
  refreshToken?: string,
): Promise<void> {
  await AsyncStorage.setItem(IS_LOGGED_IN_KEY, "true");
  if (accessToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(IS_LOGGED_IN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

// access_token만 갱신할 때(만료돼서 refreshSession으로 새로 받았을 때) 쓰는
// 좁은 setter — refresh_token은 Supabase가 새로 하나 더 내려주면 같이 갱신한다.
export async function updateStoredTokens(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}
