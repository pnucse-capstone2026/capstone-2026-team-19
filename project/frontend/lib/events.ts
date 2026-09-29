import type { EventResponse } from "@/lib/api";
import { daysUntil } from "@/lib/date";
import type { ExpiringItem } from "@/types/home";

const EVENT_TYPE_LABELS: Record<string, string> = {
  expiration: "만료",
  exam: "시험",
  assignment_due: "과제 마감",
  reservation: "예약",
  departure: "출발",
  check_in: "체크인",
  performance: "공연·행사",
  meeting: "미팅",
  schedule: "일정",
};

export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function formatEventSubtitle(date: string, time: string | null): string {
  const [, month, day] = date.split("-");
  const dateLabel = `${Number(month)}월 ${Number(day)}일`;
  return time ? `${dateLabel} ${time}` : dateLabel;
}

// event_date가 없는 이벤트는 D-day를 계산할 수 없어 카드/캘린더에 올릴 수
// 없음 — 호출부에서 null을 걸러내고 쓰기.
//
// EventResponse엔 썸네일이 없어서(이벤트는 이미지 자체가 아니라 이미지에서
// 추출된 정보라) 실제 썸네일을 보여주려면 원본 이미지의 signed_url이 따로
// 필요하다 — 호출부가 listImages()로 미리 받아온 image_id -> signed_url
// 맵을 넘겨주면 여기서 붙여준다 (이벤트 하나마다 getImage()를 따로 부르는
// N+1 호출을 피하려고 맵으로 한 번에 처리).
export function toExpiringItem(
  event: EventResponse,
  imageUrlById?: Map<string, string | null | undefined>,
): ExpiringItem | null {
  if (!event.event_date) return null;
  return {
    id: event.id,
    imageId: event.image_id,
    category: eventTypeLabel(event.event_type),
    title: event.title ?? eventTypeLabel(event.event_type),
    subtitle: formatEventSubtitle(event.event_date, event.event_time),
    date: event.event_date,
    daysLeft: daysUntil(event.event_date),
    location: event.location ?? undefined,
    isUsed: event.is_used,
    imageUrl: imageUrlById?.get(event.image_id) ?? undefined,
  };
}
