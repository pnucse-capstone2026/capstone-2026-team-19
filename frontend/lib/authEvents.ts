// lib/api.ts가 refresh_token까지 무효라 세션을 되살릴 방법이 없을 때(주로
// 로그아웃하지 않고 오래 방치했거나, 이번처럼 refresh_token이 없던 옛 세션)
// contexts/AuthContext.tsx에게 "isLoggedIn을 즉시 false로 내려라"라고 알리는
// 용도. api.ts는 React 트리 밖에 있는 순수 모듈이라 useAuth()를 직접 쓸 수
// 없어서, 이런 작은 pub/sub으로 우회한다 — 이게 없으면 저장소는 로그아웃
// 상태인데 화면은 계속 로그인된 것처럼 남아있다가, 다음 API 요청이 "토큰
// 없음"으로 실패하는 걸로만 간접적으로 드러난다(사용자 입장에선 원인불명
// 에러로 보임).
type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => listener());
}
