import * as Notifications from "expo-notifications";

import { getCurrentUserDisplayName, type EventResponse } from "@/lib/api";
import { daysUntil } from "@/lib/date";
import { eventTypeLabel } from "@/lib/events";

// 포그라운드(앱 켜져있을 때)에도 배너로 뜨게 — 기본값은 앱이 켜져있으면
// 조용히 무시하고 안 띄움.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 만료 며칠 전에 알려줄지 — 일주일 전(여유 있게 미리 상기) → 하루 전(마지막
// 기회) → 당일 아침(그날 안에 처리하라는 최종 알림), 3번.
export const REMINDER_CHECKPOINTS_DAYS_BEFORE = [7, 1, 0];

// 알림 뜨는 시각 — 아침 9시 고정. 자기 전이나 새벽에 울리면 안 되니까 특정
// 시간으로 고정하는 게 낫고, 그 중에서도 "오늘 할 일" 확인하기 좋은 시간대.
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

const NOTIFICATION_ID_PREFIX = "event-reminder-";

function notificationIdentifier(eventId: string, daysBefore: number): string {
  return `${NOTIFICATION_ID_PREFIX}${eventId}-d${daysBefore}`;
}

function reminderDateFor(eventDateIso: string, daysBefore: number): Date {
  const [year, month, day] = eventDateIso.split("-").map(Number);
  const date = new Date(year, month - 1, day - daysBefore, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  return date;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export interface ReminderPlanItem {
  id: string;
  eventId: string;
  imageId: string;
  daysBefore: number;
  date: Date;
  body: string;
}

function reminderBody(userName: string, label: string, daysBefore: number): string {
  return daysBefore === 0
    ? `${userName}님, ${label} 일정이 오늘까지예요!`
    : `${userName}님, ${label} 일정이 ${daysBefore}일 남았어요!`;
}

// 지금 시점 기준으로 실제 예약될(될) 알림 목록을 계산한다 — 알림 설정 화면
// 미리보기와 실제 예약(scheduleEventReminders)이 서로 다른 로직을 쓰면
// "화면엔 보이는데 실제로는 안 옴" 같은 괴리가 생기기 쉬워서, 계산 자체를
// 한 곳에 모아 둘 다 이걸 쓰게 한다.
export function buildUpcomingReminders(
  upcomingEvents: EventResponse[],
  userName: string,
): ReminderPlanItem[] {
  const items: ReminderPlanItem[] = [];

  for (const event of upcomingEvents) {
    if (!event.event_date || event.is_used) continue;
    const label = event.title ?? eventTypeLabel(event.event_type);
    const daysLeftNow = daysUntil(event.event_date);

    for (const daysBefore of REMINDER_CHECKPOINTS_DAYS_BEFORE) {
      if (daysBefore > daysLeftNow) continue;
      const date = reminderDateFor(event.event_date, daysBefore);
      if (date.getTime() <= Date.now()) continue;

      items.push({
        id: notificationIdentifier(event.id, daysBefore),
        eventId: event.id,
        imageId: event.image_id,
        daysBefore,
        date,
        body: reminderBody(userName, label, daysBefore),
      });
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// 현재 다가오는 이벤트 목록을 기준으로 "지금 예약돼 있어야 할 알림 전체"
// (plan)를 새로 계산해서 알림을 다시 맞춘다. 이미 예약된 것 중 plan에 없는
// 건 전부 취소하고(사용완료/삭제/날짜지남은 물론, 체크포인트 구성이 바뀌어서
// —예: 예전엔 있었던 "7일 전"을 없앤 경우—더 이상 유효하지 않게 된 것까지
// 한 번에 걸러짐), plan에 있는 건 다시 예약한다(같은 identifier로 부르면
// 덮어써지므로 중복 걱정 없이 "이미 예약된 것도 다시 예약"이 곧 최신화다).
export async function syncEventReminders(upcomingEvents: EventResponse[]): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const userName = await getCurrentUserDisplayName();
  const plan = buildUpcomingReminders(upcomingEvents, userName);
  const planIds = new Set(plan.map((item) => item.id));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const staleIds = scheduled
    .map((notification) => notification.identifier)
    .filter((identifier) => identifier.startsWith(NOTIFICATION_ID_PREFIX) && !planIds.has(identifier));

  await Promise.all(
    staleIds.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );

  await Promise.all(
    plan.map((item) =>
      Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: "izzima",
          body: item.body,
          data: { eventId: item.eventId, imageId: item.imageId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.date,
        },
      }),
    ),
  );
}
