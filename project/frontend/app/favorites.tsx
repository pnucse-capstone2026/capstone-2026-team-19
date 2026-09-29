import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FavoriteRow } from '@/components/FavoriteRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useTheme } from '@/contexts/ThemeContext';
import { categoryName, getImage, listEvents, listImages } from '@/lib/api';
import { toExpiringItem } from '@/lib/events';
import { goBack } from '@/lib/navigation';

interface FavoriteRowData {
  key: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  onPress: () => void;
}

export default function FavoritesScreen() {
  const { favorites } = useFavorites();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<FavoriteRowData[]>([]);

  // useFocusEffect — 다른 화면에서 즐겨찾기 해제하거나 이미지를 삭제하고
  // 돌아왔을 때도 목록이 최신 상태로 반영되도록.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const imageFavorites = favorites.filter((entry) => entry.kind === 'category-item');
        const eventFavorites = favorites.filter((entry) => entry.kind === 'expiring');
        const eventFavoriteIds = new Set(eventFavorites.map((entry) => entry.id));

        const [imageRows, eventsRes, imagesRes] = await Promise.all([
          Promise.all(
            imageFavorites.map(async (entry): Promise<FavoriteRowData | null> => {
              try {
                const image = await getImage(entry.id);
                return {
                  key: `item-${image.id}`,
                  title: categoryName(image.category),
                  // caption은 AI Pipeline이 만드는 이미지 설명 — 파이프라인이
                  // 아직 안 돌고 있으면 대부분 비어있는 게 정상.
                  subtitle: image.caption ?? '설명이 아직 없어요',
                  imageUrl: image.signed_url,
                  onPress: () => router.push(`/item/${image.id}`),
                };
              } catch {
                // 삭제된 이미지처럼 더 이상 존재하지 않는 즐겨찾기는 조용히 건너뜀.
                return null;
              }
            }),
          ),
          eventFavoriteIds.size > 0 ? listEvents({}) : Promise.resolve({ data: [] }),
          eventFavoriteIds.size > 0 ? listImages({ limit: 100 }) : Promise.resolve({ data: [] }),
        ]);

        const imageUrlById = new Map(imagesRes.data.map((image) => [image.id, image.signed_url]));
        const eventRows: FavoriteRowData[] = eventsRes.data
          .filter((event) => eventFavoriteIds.has(event.id))
          .map((event) => toExpiringItem(event, imageUrlById))
          .flatMap((item) =>
            item
              ? [
                  {
                    key: `expiring-${item.id}`,
                    title: item.title,
                    subtitle: `${item.category} · ${item.subtitle}`,
                    imageUrl: item.imageUrl,
                    onPress: () => router.push(`/expiring/${item.id}`),
                  },
                ]
              : [],
          );

        if (!cancelled) {
          setRows([...imageRows.filter((row): row is FavoriteRowData => row !== null), ...eventRows]);
        }
      })().catch((err) => console.warn('즐겨찾기 목록 불러오기 실패', err));

      return () => {
        cancelled = true;
      };
    }, [favorites]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        backLabel="설정"
        onBack={() => goBack()}
        title="즐겨찾기"
        subtitle={`${rows.length}건`}
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => (
          <FavoriteRow
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.imageUrl}
            onPress={item.onPress}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyLabel}>
            즐겨찾기한 이미지가 없어요{'\n'}상세 화면에서 별표를 눌러 추가해보세요
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    emptyLabel: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingVertical: 48,
    },
  });
