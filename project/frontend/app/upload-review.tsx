import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPickerSheet } from '@/components/CategoryPickerSheet';
import { Text } from '@/components/Text';
import { UploadReviewRow } from '@/components/UploadReviewRow';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { categoryName, IMAGE_CATEGORIES, updateImageCategory, type ImageCategory } from '@/lib/api';
import { invalidateImageData } from '@/lib/queries';
import type { Category } from '@/types/home';

interface UploadedImage {
  id: string;
  uri: string;
  category: ImageCategory | null;
}

// CategoryPickerSheet는 홈 화면 카테고리 카드랑 같은 Category 모양을 받는데
// 여기선 개수(count)가 의미 없어서 0으로 채워 넣는다.
const CATEGORY_OPTIONS: Category[] = IMAGE_CATEGORIES.map((category) => ({
  ...category,
  count: 0,
}));

export default function UploadReviewScreen() {
  const { images: imagesParam } = useLocalSearchParams<{ images?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const uploadedImages = useMemo<UploadedImage[]>(() => {
    if (!imagesParam) return [];
    try {
      return JSON.parse(imagesParam) as UploadedImage[];
    } catch {
      return [];
    }
  }, [imagesParam]);

  const [items, setItems] = useState<UploadedImage[]>(uploadedImages);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingItemId) ?? null;

  // AI Pipeline이 아직 카테고리를 못 채워주는 상태(GPU 서버 이슈)라 지금은
  // 대부분 category가 null로 오고, categoryName(null)은 "해당 없음"으로 뜨는
  // 게 정상 — 그쪽 복구되면 자연히 실제 분류값이 옴.
  const handleSelectCategory = (categoryId: string) => {
    if (!editingItemId) return;
    const category = categoryId as ImageCategory;
    setItems((prev) => prev.map((item) => (item.id === editingItemId ? { ...item, category } : item)));
    updateImageCategory(editingItemId, category)
      .then(() => invalidateImageData())
      .catch((err) => console.warn('카테고리 변경 실패', err));
  };

  // Closes the whole upload flow (picker + analysis + this review screen)
  // and drops the user back on whichever tab they started from.
  const finish = () => router.dismissAll();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={styles.cancelLabel}>취소</Text>
        </Pressable>
        <Text weight="semiBold" style={styles.headerTitle}>
          분류 확인
        </Text>
        <Pressable onPress={finish} hitSlop={8}>
          <Text weight="semiBold" style={styles.doneLabel}>
            완료
          </Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>AI가 분류한 카테고리예요. 잘못됐다면 눌러서 바꿔주세요.</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <UploadReviewRow
            uri={item.uri}
            categoryName={categoryName(item.category)}
            onChangeCategory={() => setEditingItemId(item.id)}
          />
        )}
      />

      <CategoryPickerSheet
        visible={editingItem !== null}
        categories={CATEGORY_OPTIONS}
        selectedCategoryId={editingItem?.category ?? ''}
        onSelect={handleSelectCategory}
        onClose={() => setEditingItemId(null)}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 12,
      paddingBottom: 8,
    },
    cancelLabel: {
      fontSize: 16,
      color: '#2F6FED',
    },
    headerTitle: {
      fontSize: 16,
      color: colors.text,
    },
    doneLabel: {
      fontSize: 16,
      color: '#2F6FED',
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 16,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
  });
