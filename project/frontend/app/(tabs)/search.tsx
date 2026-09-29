import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryItemThumbnail } from '@/components/CategoryItemThumbnail';
import { Text } from '@/components/Text';
import { TextInput } from '@/components/TextInput';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { categoryName, searchImages, type SearchResultItem } from '@/lib/api';
import type { CategoryItem } from '@/types/home';

const SUGGESTED_QUERIES = ['안 쓴 쿠폰', '항공권', '영수증'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchImages(q, 30);
      setResults(res.data);
    } catch (err) {
      // 백엔드가 임베딩 모델 미연동(503) 등 상황을 detail 메시지로 이미
      // 친절하게 내려주므로 그대로 보여주면 됨.
      setResults([]);
      setErrorMessage(err instanceof Error ? err.message : '검색에 실패했어요.');
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const items = useMemo<CategoryItem[]>(
    () =>
      results.map((image) => {
        const savedAt = new Date(image.created_at);
        return {
          id: image.id,
          categoryId: image.category ?? 'other',
          categoryName: categoryName(image.category),
          title: image.caption ?? categoryName(image.category),
          savedAtLabel: `${savedAt.getMonth() + 1}월 ${savedAt.getDate()}일 저장됨`,
          imageUrl: image.signed_url,
        };
      }),
    [results],
  );

  // 3열 grid에서 마지막 줄이 3의 배수로 안 채워지면 space-between이 남은
  // 칸을 양 끝으로 벌려버려서 — 보이지 않는 채움 항목으로 채워둔다.
  const fillerCount = (3 - (items.length % 3)) % 3;
  const gridData: (CategoryItem | { id: string; filler: true })[] = [
    ...items,
    ...Array.from({ length: fillerCount }, (_, index) => ({
      id: `filler-${index}`,
      filler: true as const,
    })),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text weight="extraBold" style={styles.title}>
          검색
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="예: 지난달 카페에서 찍은 영수증"
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          {isSearching ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        </View>

        <View style={styles.suggestions}>
          {SUGGESTED_QUERIES.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={styles.chip}
              onPress={() => {
                setQuery(suggestion);
                runSearch(suggestion);
              }}
            >
              <Text style={styles.chipLabel}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>

        {!hasSearched ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>검색어를 입력하거나</Text>
            <Text style={styles.emptyText}>추천 검색어를 선택해보세요</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{errorMessage}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>"{query}"에 대한 검색 결과가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={gridData}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) =>
              'filler' in item ? (
                <View style={styles.thumbnailWrapper} />
              ) : (
                <Pressable
                  style={styles.thumbnailWrapper}
                  onPress={() => router.push(`/item/${item.id}`)}
                >
                  <CategoryItemThumbnail item={item} />
                </Pressable>
              )
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 32,
      color: colors.text,
      marginTop: 12,
      marginBottom: 20,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    chipLabel: {
      fontSize: 14,
      color: colors.text,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    grid: {
      paddingTop: 20,
      paddingBottom: 32,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    thumbnailWrapper: {
      width: '31%',
    },
  });
