import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryCard } from "@/components/CategoryCard";
import { ExpiringItemCard } from "@/components/ExpiringItemCard";
import { Skeleton } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import type { ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { IMAGE_CATEGORIES } from "@/lib/api";
import { toExpiringItem } from "@/lib/events";
import { syncEventReminders } from "@/lib/notifications";
import { useEventsQuery, useImagesQuery, useRefetchStaleOnFocus } from "@/lib/queries";
import type { Category, ExpiringItem } from "@/types/home";

export default function HomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const imagesQuery = useImagesQuery(100);
  const eventsQuery = useEventsQuery(true);
  useRefetchStaleOnFocus(imagesQuery);
  useRefetchStaleOnFocus(eventsQuery);

  const images = useMemo(() => imagesQuery.data?.data ?? [], [imagesQuery.data]);
  const isLoading = imagesQuery.isPending || eventsQuery.isPending;

  const expiringItems = useMemo<ExpiringItem[]>(() => {
    const events = eventsQuery.data?.data ?? [];
    const imageUrlById = new Map(images.map((image) => [image.id, image.signed_url]));
    return events
      .map((event) => toExpiringItem(event, imageUrlById))
      .filter((item): item is ExpiringItem => item !== null);
  }, [eventsQuery.data, images]);

  // 알림 예약 동기화 — 홈 데이터 렌더링과는 무관한 부수효과라, 이벤트가
  // 새로 로드될 때만 조용히 돌린다. 권한 없으면 내부에서 알아서 no-op.
  useEffect(() => {
    const events = eventsQuery.data?.data;
    if (!events) return;
    syncEventReminders(events.filter((event) => !event.is_used)).catch((err) =>
      console.warn("알림 동기화 실패", err),
    );
  }, [eventsQuery.data]);

  const categories = useMemo<Category[]>(() => {
    const counts = new Map<string, number>();
    // 카테고리별 미리보기 칸(최대 4개) 채울 최근 이미지 signed_url — images가
    // 이미 최신순으로 오기 때문에 카테고리당 처음 4개만 모으면 최신 4장이 됨.
    const previews = new Map<string, string[]>();
    for (const image of images) {
      if (!image.category) continue;
      counts.set(image.category, (counts.get(image.category) ?? 0) + 1);
      if (image.signed_url) {
        const existing = previews.get(image.category) ?? [];
        if (existing.length < 4) previews.set(image.category, [...existing, image.signed_url]);
      }
    }
    return IMAGE_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      count: counts.get(category.id) ?? 0,
      previewImageUrls: previews.get(category.id),
    }));
  }, [images]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text weight="bold" style={styles.title}>
              홈
            </Text>
            {isLoading ? (
              <Skeleton width={110} height={14} style={styles.subtitleSkeleton} />
            ) : (
              <Text style={styles.subtitle}>{images.length}개 자동 정리됨</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text weight="bold" style={styles.sectionTitle}>
            만료 임박
          </Text>
          <TouchableOpacity onPress={() => router.push("/expiring")}>
            <Text weight="semiBold" style={styles.sectionLink}>
              전체
            </Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View style={styles.expiringList}>
            {[0, 1].map((key) => (
              <Skeleton key={key} width={160} height={210} radius={16} />
            ))}
          </View>
        ) : expiringItems.length === 0 ? (
          <Text style={styles.emptyLabel}>다가오는 일정이 없어요</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.expiringList}
          >
            {expiringItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/expiring/${item.id}`)}
              >
                <ExpiringItemCard item={item} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text
          weight="bold"
          style={[styles.sectionTitle, styles.categorySectionTitle]}
        >
          카테고리
        </Text>
        <View style={styles.categoryGrid}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <View key={`skeleton-${index}`} style={styles.categoryItem}>
                  <Skeleton height={104} radius={16} />
                  <Skeleton width="60%" height={13} style={styles.categoryLabelSkeleton} />
                </View>
              ))
            : categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/category/${category.id}`)}
                >
                  <CategoryCard category={category} />
                </TouchableOpacity>
              ))}
          {/* 3열 grid에서 마지막 줄이 3의 배수로 안 채워지면 justifyContent:
              'space-between'이 남은 칸을 양 끝으로 벌려버린다 — 보이지 않는
              칸으로 채워서 항상 왼쪽부터 채워지게 한다. */}
          {!isLoading &&
            Array.from({ length: (3 - (categories.length % 3)) % 3 }).map(
              (_, index) => (
                <View key={`filler-${index}`} style={styles.categoryItem} />
              ),
            )}
        </View>
      </ScrollView>
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
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: 12,
    },
    headerActions: {
      flexDirection: "row",
      gap: 10,
    },
    title: {
      fontSize: 32,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    subtitleSkeleton: {
      marginTop: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 28,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 20,
      color: colors.text,
    },
    sectionLink: {
      fontSize: 15,
      color: "#2F6FED",
    },
    expiringList: {
      flexDirection: "row",
      gap: 12,
    },
    emptyLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    categorySectionTitle: {
      marginTop: 28,
      marginBottom: 14,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 20,
    },
    categoryItem: {
      width: "31%",
    },
    categoryLabelSkeleton: {
      marginTop: 8,
    },
  });
