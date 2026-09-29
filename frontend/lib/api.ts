import { API_BASE_URL } from "@/constants/config";
import { emitSessionExpired } from "@/lib/authEvents";
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredRefreshToken,
  updateStoredTokens,
} from "@/lib/authStorage";
import { supabase } from "@/lib/supabase";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Decode(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function utf8BytesToString(byteString: string): string {
  let result = "";
  let i = 0;
  while (i < byteString.length) {
    const byte1 = byteString.charCodeAt(i++);
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc0 && byte1 < 0xe0 && i < byteString.length) {
      const byte2 = byteString.charCodeAt(i++);
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 >= 0xe0 && byte1 < 0xf0 && i + 1 < byteString.length) {
      const byte2 = byteString.charCodeAt(i++);
      const byte3 = byteString.charCodeAt(i++);
      result += String.fromCharCode(
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f),
      );
    } else if (byte1 >= 0xf0 && i + 2 < byteString.length) {
      const byte2 = byteString.charCodeAt(i++);
      const byte3 = byteString.charCodeAt(i++);
      const byte4 = byteString.charCodeAt(i++);
      let codepoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f);
      codepoint -= 0x10000;
      result += String.fromCharCode(
        0xd800 + (codepoint >> 10),
        0xdc00 + (codepoint & 0x3ff),
      );
    } else {
      result += String.fromCharCode(byte1);
    }
  }
  return result;
}

function decodeJwtPayload<T = Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(utf8BytesToString(base64Decode(base64))) as T;
  } catch {
    return null;
  }
}

function decodeJwtExp(token: string): number | null {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  return typeof payload?.exp === "number" ? payload.exp : null;
}

interface SupabaseJwtPayload {
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    nickname?: string;
    preferred_username?: string;
  };
}

export async function getCurrentUserDisplayName(): Promise<string> {
  const token = await getStoredAccessToken();
  if (!token) return "고객";
  const payload = decodeJwtPayload<SupabaseJwtPayload>(token);
  const meta = payload?.user_metadata;
  return (
    meta?.nickname ??
    meta?.name ??
    meta?.full_name ??
    meta?.preferred_username ??
    payload?.email?.split("@")[0] ??
    "고객"
  );
}

const EXPIRY_BUFFER_SECONDS = 30;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken || !supabase) {
    await clearStoredAuth();
    emitSessionExpired();
    return null;
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    await clearStoredAuth();
    emitSessionExpired();
    return null;
  }

  await updateStoredTokens(
    data.session.access_token,
    data.session.refresh_token,
  );
  return data.session.access_token;
}

async function getAccessToken(): Promise<string | null> {
  const accessToken = await getStoredAccessToken();
  if (!accessToken) return null;

  const exp = decodeJwtExp(accessToken);
  const isExpiringSoon =
    exp !== null && exp - EXPIRY_BUFFER_SECONDS <= Date.now() / 1000;
  if (!isExpiringSoon) return accessToken;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function authHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: await authHeaders({
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    }),
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail ??
        `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};

export type ImageCategory =
  | "expiration"
  | "exam"
  | "assignment_due"
  | "reservation"
  | "departure"
  | "check_in"
  | "performance"
  | "meeting"
  | "schedule"
  | "none";

export interface ImageResponse {
  id: string;
  user_id: string | null;
  storage_path: string;
  ocr_text: string | null;
  caption: string | null;
  category: ImageCategory | null;
  search_text: string | null;
  created_at: string;
  signed_url: string | null;
}

export interface ImageListResponse {
  data: ImageResponse[];
}

export async function uploadImage(uri: string): Promise<ImageResponse> {
  const filename = uri.split("/").pop() ?? `upload-${Date.now()}.jpg`;
  const extension = filename.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "heic"
          ? "image/heic"
          : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/images`, {
    method: "POST",
    body: formData,
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `업로드 실패: ${response.status}`);
  }

  return response.json();
}

export function getImage(imageId: string): Promise<ImageResponse> {
  return api.get<ImageResponse>(`/images/${imageId}`);
}

export function listImages(params?: {
  limit?: number;
  offset?: number;
}): Promise<ImageListResponse> {
  const query = new URLSearchParams();
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString();
  return api.get<ImageListResponse>(`/images${qs ? `?${qs}` : ""}`);
}

export function updateImageCategory(
  imageId: string,
  category: ImageCategory,
): Promise<ImageResponse> {
  return api.patch<ImageResponse>(`/images/${imageId}/category`, { category });
}

export function deleteImage(imageId: string): Promise<void> {
  return api.delete(`/images/${imageId}`);
}

export const IMAGE_CATEGORIES: { id: ImageCategory; name: string }[] = [
  { id: "expiration", name: "유효기간/만료" },
  { id: "exam", name: "시험" },
  { id: "assignment_due", name: "과제 마감" },
  { id: "reservation", name: "예약" },
  { id: "departure", name: "출발" },
  { id: "check_in", name: "체크인" },
  { id: "performance", name: "공연/행사" },
  { id: "meeting", name: "회의/약속" },
  { id: "schedule", name: "일정" },
  { id: "none", name: "해당 없음" },
];

export function categoryName(category: ImageCategory | null): string {
  // null은 "카테고리가 아직 없음"이라 "none"(해당 없음)과 의미가 같다 - 둘을
  // 다른 라벨("미분류")로 나눠 보여주면 사용자 입장에서 구분할 이유가 없는
  // 걸 구분해 보여주는 셈이라 헷갈린다. 정말 후보 10개 밖의 값(옛날 스펙
  // 잔재 등)이 온 경우에만 "미분류"로 구분해서 보여준다.
  if (category === null) {
    return IMAGE_CATEGORIES.find((c) => c.id === "none")!.name;
  }
  return IMAGE_CATEGORIES.find((c) => c.id === category)?.name ?? "미분류";
}

export interface EventResponse {
  id: string;
  image_id: string;
  event_type: string;
  title: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  is_used: boolean;
  created_at: string;
}

export interface EventListResponse {
  data: EventResponse[];
}

export function getEventsForImage(imageId: string): Promise<EventListResponse> {
  return api.get<EventListResponse>(`/images/${imageId}/events`);
}

export function listEvents(params?: {
  upcoming?: boolean;
}): Promise<EventListResponse> {
  const qs = params?.upcoming ? "?upcoming=true" : "";
  return api.get<EventListResponse>(`/events${qs}`);
}

export function updateEventUsed(
  eventId: string,
  isUsed: boolean,
): Promise<EventResponse> {
  return api.patch<EventResponse>(`/events/${eventId}/used`, {
    is_used: isUsed,
  });
}

export interface SearchResultItem extends ImageResponse {
  similarity: number;
}

export interface SearchResponse {
  data: SearchResultItem[];
}

export function searchImages(
  q: string,
  limit?: number,
): Promise<SearchResponse> {
  const query = new URLSearchParams({ q });
  if (limit != null) query.set("limit", String(limit));
  return api.get<SearchResponse>(`/search?${query.toString()}`);
}
