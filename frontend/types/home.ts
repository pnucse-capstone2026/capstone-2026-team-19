export type BadgeVariant = "danger" | "info" | "used";

export interface ExpiringItem {
  id: string;
  imageId?: string;
  category: string;
  title: string;
  subtitle: string;
  date: string; // local ISO date, e.g. '2026-07-22', used for calendar dot placement
  daysLeft: number; // D-day and urgency color are derived from this via lib/deadline.ts
  tags?: string[];
  location?: string;
  isUsed?: boolean; // real data only — 백엔드 events.is_used, 사용자가 상세에서 토글
  imageUrl?: string | null; // real data only — 이 이벤트를 뽑아낸 원본 이미지의 signed_url
}

export interface Category {
  id: string;
  name: string;
  count: number;
  // 최근 이미지 최대 4장의 signed_url — 스포티파이 플레이리스트 커버처럼
  // 폴더 미리보기 칸을 실제 이미지로 채우는 용도. 없으면(mock 데이터, 또는
  // 아직 이미지가 없는 카테고리) CategoryCard가 빈 칸으로 대체한다.
  previewImageUrls?: string[];
}

export type CategoryItemStatus = "active" | "expiring" | "used";

export interface CategoryItem {
  id: string;
  categoryId: string;
  categoryName: string;
  status?: CategoryItemStatus;
  title: string;
  tags?: string[];
  savedAtLabel: string;
  scheduleDetected?: boolean;
  imageUrl?: string | null;
}

export type CategoryFilter = "all" | "expiring" | "used";

// One uploaded screenshot going through the post-upload classification
// review step — `categoryId` starts as whatever the (mock) AI pipeline
// guessed and can be corrected by the user before confirming.
export interface UploadReviewItem {
  id: string;
  uri: string;
  categoryId: string;
}

export interface User {
  nickname: string;
}

// The star toggle appears on two unrelated detail screens backed by two
// different mock arrays (ExpiringItem vs CategoryItem) — `kind` says which
// one a favorited id belongs to so the favorites screen knows where to look
// it up and which route to push when it's tapped.
export type FavoriteKind = "expiring" | "category-item";
