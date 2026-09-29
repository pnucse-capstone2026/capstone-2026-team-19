import { QueryClient } from "@tanstack/react-query";

// 앱 전역에서 공유하는 단일 QueryClient. 화면마다 useFocusEffect로
// 매번 재요청하던 걸 이 캐시로 대체한다 — 같은 queryKey면 화면을 오가도
// 요청이 안 나가고 캐시된 값이 즉시 그려진다.
//
// staleTime 30초: 30초 안에 같은 데이터를 다시 보면 네트워크를 아예 안 탄다.
//   그 이후 재방문은 캐시된 값을 바로 보여주면서 뒤에서 조용히 갱신(깜빡임 없음).
// gcTime 5분: 화면을 떠나도 5분간은 캐시를 들고 있다가 그 후 폐기.
// retry 1 + 지연: Render 콜드스타트로 첫 요청이 죽는 경우가 있어 한 번은 재시도.
// refetchOnWindowFocus는 RN에서 의미가 없어 끄고, 포커스 갱신은 화면별
//   useRefetchOnFocus로 명시적으로 처리한다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      retryDelay: 1500,
      refetchOnWindowFocus: false,
    },
  },
});

// queryKey 중앙 관리 — 여러 화면(홈/카테고리/만료임박/캘린더)이 같은
// listImages 응답을 공유하려면 키가 정확히 같아야 한다. 문자열을 여기저기
// 흩어놓지 말고 전부 이 객체를 거쳐서 만든다.
export const queryKeys = {
  images: (limit: number) => ["images", { limit }] as const,
  events: (upcoming: boolean) => ["events", { upcoming }] as const,
  image: (id: string) => ["image", id] as const,
  imageEvents: (id: string) => ["imageEvents", id] as const,
};
