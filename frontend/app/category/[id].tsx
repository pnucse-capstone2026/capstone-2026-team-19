import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryItemThumbnail } from "@/components/CategoryItemThumbnail";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Skeleton } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import type { ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { goBack } from "@/lib/navigation";
import {
  categoryName,
  deleteImage,
  type ImageCategory,
} from "@/lib/api";
import { invalidateImageData, useImagesQuery, useRefetchStaleOnFocus } from "@/lib/queries";
import type { CategoryItem } from "@/types/home";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 홈·만료임박·캘린더와 같은 useImagesQuery 캐시를 공유한다 — 홈에서 이미
  // 받아왔으면 이 화면은 요청 없이 즉시 그려지고, 여기 카테고리에서만
  // 필터링한다. 삭제 후 최신화는 invalidateImageData()가 담당.
  const imagesQuery = useImagesQuery(100);
  useRefetchStaleOnFocus(imagesQuery);
  const isLoading = imagesQuery.isPending;

  const items = useMemo<CategoryItem[]>(
    () =>
      (imagesQuery.data?.data ?? [])
        .filter((image) => image.category === id)
        .map((image) => {
        const savedAt = new Date(image.created_at);
        return {
          id: image.id,
          categoryId: image.category ?? "other",
          categoryName: categoryName(image.category),
          title: image.caption ?? categoryName(image.category),
          savedAtLabel: `${savedAt.getMonth() + 1}월 ${savedAt.getDate()}일 저장됨`,
          imageUrl: image.signed_url,
        };
      }),
    [imagesQuery.data, id],
  );

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  const handleDeleteSelected = () => {
    const targetIds = Array.from(selectedIds);
    if (targetIds.length === 0) return;

    Alert.alert(
      "이미지 삭제",
      `선택한 ${targetIds.length}장을 삭제할까요? 되돌릴 수 없어요.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const results = await Promise.allSettled(
              targetIds.map((imageId) => deleteImage(imageId)),
            );
            const failedCount = results.filter((r) => r.status === "rejected").length;

            invalidateImageData();
            setSelectedIds(new Set());
            setSelectionMode(false);
            setIsDeleting(false);

            if (failedCount > 0) {
              Alert.alert("일부 삭제 실패", `${failedCount}장은 삭제하지 못했어요.`);
            }
          },
        },
      ],
    );
  };

  // 3열 grid에서 마지막 줄이 3의 배수로 안 채워지면 columnWrapperStyle의
  // justifyContent: 'space-between'이 남은 칸을 양 끝으로 벌려버린다 —
  // 보이지 않는 채움 항목으로 채워서 항상 왼쪽부터 채워지게 한다.
  const fillerCount = (3 - (items.length % 3)) % 3;
  const gridData: (CategoryItem | { id: string; filler: true })[] = [
    ...items,
    ...Array.from({ length: fillerCount }, (_, index) => ({
      id: `filler-${index}`,
      filler: true as const,
    })),
  ];

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader
        backLabel="홈"
        onBack={() => goBack()}
        title={categoryName(id as ImageCategory)}
        subtitle={`${items.length}장 · 최근순`}
        rightAccessory={
          selectionMode ? (
            <View style={styles.headerActions}>
              <Pressable hitSlop={8} onPress={handleSelectAll}>
                <Text weight="semiBold" style={styles.selectLabel}>
                  {allSelected ? "선택 해제" : "전체 선택"}
                </Text>
              </Pressable>
              <Pressable hitSlop={8} onPress={exitSelectionMode}>
                <Text weight="semiBold" style={styles.selectLabel}>
                  취소
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable hitSlop={8} onPress={() => setSelectionMode(true)}>
              <Text weight="semiBold" style={styles.selectLabel}>
                선택
              </Text>
            </Pressable>
          )
        }
      />

      {isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2].map((rowKey) => (
            <View key={rowKey} style={styles.row}>
              {[0, 1, 2].map((colKey) => (
                <View key={colKey} style={styles.thumbnailWrapper}>
                  <Skeleton height={110} radius={12} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) =>
            "filler" in item ? (
              <View style={styles.thumbnailWrapper} />
            ) : (
              <Pressable
                style={styles.thumbnailWrapper}
                onPress={() =>
                  selectionMode ? toggleSelected(item.id) : router.push(`/item/${item.id}`)
                }
                onLongPress={() => {
                  if (!selectionMode) setSelectionMode(true);
                  toggleSelected(item.id);
                }}
              >
                <CategoryItemThumbnail
                  item={item}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                />
              </Pressable>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectionMode && selectedIds.size > 0 ? (
        <View style={styles.actionBar}>
          <Text weight="semiBold" style={styles.actionBarLabel}>
            {selectedIds.size}장 선택됨
          </Text>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDeleteSelected}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text weight="semiBold" style={styles.deleteButtonLabel}>
                  삭제
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    selectLabel: {
      fontSize: 15,
      color: "#2F6FED",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    grid: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    row: {
      justifyContent: "space-between",
      marginBottom: 12,
    },
    thumbnailWrapper: {
      width: "31%",
    },
    actionBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    actionBarLabel: {
      fontSize: 14,
      color: colors.text,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#EF4444",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    deleteButtonLabel: {
      fontSize: 14,
      color: "#FFFFFF",
    },
  });
