import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";

import {
  getEventsForImage,
  getImage,
  listEvents,
  listImages,
  type EventListResponse,
  type EventResponse,
  type ImageListResponse,
  type ImageResponse,
} from "@/lib/api";
import { queryClient, queryKeys } from "@/lib/queryClient";

// 홈/카테고리/만료임박/캘린더가 전부 이 훅을 통해 같은 이미지 목록을
// 공유한다 — limit이 같으면 queryKey가 같아 한 번만 요청되고 캐시된다.
export function useImagesQuery(limit = 100): UseQueryResult<ImageListResponse> {
  return useQuery({
    queryKey: queryKeys.images(limit),
    queryFn: () => listImages({ limit }),
  });
}

export function useEventsQuery(upcoming: boolean): UseQueryResult<EventListResponse> {
  return useQuery({
    queryKey: queryKeys.events(upcoming),
    queryFn: () => listEvents(upcoming ? { upcoming: true } : {}),
  });
}

export function useImageQuery(id: string): UseQueryResult<ImageResponse> {
  return useQuery({
    queryKey: queryKeys.image(id),
    queryFn: () => getImage(id),
    enabled: !!id,
  });
}

export function useImageEventsQuery(id: string): UseQueryResult<EventResponse[]> {
  return useQuery({
    queryKey: queryKeys.imageEvents(id),
    queryFn: () => getEventsForImage(id).then((res) => res.data),
    enabled: !!id,
  });
}

// 탭 화면은 한 번 마운트되면 계속 살아 있어서, 시간이 지나 캐시가 오래돼도
// 스스로 다시 안 받아온다. 화면에 다시 포커스될 때 "이미 stale이면"만
// refetch한다 — staleTime(30초) 안이면 아무 것도 안 하고, 넘었으면 캐시된
// 값을 보여주는 채로 뒤에서 갱신한다(빈 화면 없음). 뮤테이션 직후 최신화는
// 이게 아니라 invalidateImageData()가 담당.
export function useRefetchStaleOnFocus(query: {
  isStale: boolean;
  refetch: () => void;
}): void {
  const { isStale, refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (isStale) refetch();
    }, [isStale, refetch]),
  );
}

// 이미지/이벤트를 바꾸는 동작(업로드·삭제·카테고리 변경·사용완료 토글) 뒤에
// 호출한다. 관련 목록 쿼리를 전부 무효화해서, 지금 화면에 떠 있는(마운트된)
// 홈·카테고리·캘린더 등이 알아서 다시 받아오게 한다.
export function invalidateImageData(): void {
  queryClient.invalidateQueries({ queryKey: ["images"] });
  queryClient.invalidateQueries({ queryKey: ["events"] });
}
