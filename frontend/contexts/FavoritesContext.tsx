import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { FavoriteKind } from '@/types/home';

export interface FavoriteEntry {
  kind: FavoriteKind;
  id: string;
}

interface FavoritesContextValue {
  favorites: FavoriteEntry[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function favoriteKey(kind: FavoriteKind, id: string): string {
  return `${kind}:${id}`;
}

// 백엔드에 즐겨찾기 테이블이 없어서 로컬(AsyncStorage)에만 저장한다 — 기기별로
// 따로 관리되고, 재설치하거나 다른 기기로 넘어가면 사라진다. id 자체는
// 민감한 값이 아니라 SecureStore까지는 필요 없음(authStorage.ts와 다른 이유).
const STORAGE_KEY = 'izzima.favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteMap, setFavoriteMap] = useState<Map<string, FavoriteEntry>>(new Map());
  // 저장된 값을 다 불러오기 전에 빈 Map으로 덮어써버리는 걸 막는 플래그.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const entries = JSON.parse(raw) as FavoriteEntry[];
        setFavoriteMap(new Map(entries.map((entry) => [favoriteKey(entry.kind, entry.id), entry])));
      })
      .catch((err) => console.warn('즐겨찾기 불러오기 실패', err))
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favoriteMap.values()))).catch((err) =>
      console.warn('즐겨찾기 저장 실패', err),
    );
  }, [favoriteMap, isLoaded]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites: Array.from(favoriteMap.values()),
      isFavorite: (kind, id) => favoriteMap.has(favoriteKey(kind, id)),
      toggleFavorite: (kind, id) => {
        setFavoriteMap((prev) => {
          const next = new Map(prev);
          const key = favoriteKey(kind, id);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.set(key, { kind, id });
          }
          return next;
        });
      },
    }),
    [favoriteMap],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
