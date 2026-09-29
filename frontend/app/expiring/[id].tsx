import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { InfoRow } from "@/components/InfoRow";
import { Text } from "@/components/Text";
import type { ThemeColors } from "@/constants/colors";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getBadgeVariant, getDDayLabel } from "@/lib/deadline";
import { goBack } from "@/lib/navigation";
import { updateEventUsed, type EventListResponse } from "@/lib/api";
import { toExpiringItem } from "@/lib/events";
import { queryKeys } from "@/lib/queryClient";
import { invalidateImageData, useEventsQuery, useImageQuery } from "@/lib/queries";

export default function ExpiringItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite("expiring", id);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  // 캘린더와 같은 "전체 이벤트" 쿼리를 공유한다(만료 임박 창만이 아니라
  // 전체라, 캘린더에서 넘어온 지난 일정도 조회됨). 캐시가 있으면 요청 없이 바로.
  const eventsQuery = useEventsQuery(false);
  const found = (eventsQuery.data?.data ?? []).find((event) => event.id === id) ?? null;
  // 이벤트엔 썸네일이 없어서(이벤트=이미지에서 추출된 정보) 원본 이미지를
  // 따로 받아 signed_url을 붙인다.
  const imageQuery = useImageQuery(found?.image_id ?? "");

  const item = useMemo(() => {
    if (!found) return null;
    const image = imageQuery.data;
    const imageUrlById = image ? new Map([[image.id, image.signed_url]]) : undefined;
    return toExpiringItem(found, imageUrlById);
  }, [found, imageQuery.data]);

  const handleToggleUsed = async () => {
    if (!item) return;
    const nextUsed = !item.isUsed;
    const key = queryKeys.events(false);
    const previous = queryClient.getQueryData<EventListResponse>(key);
    // 낙관적 업데이트 — 공유 캐시를 먼저 바꿔서 바로 눌린 것처럼 보이게.
    queryClient.setQueryData<EventListResponse>(key, (old) =>
      old
        ? {
            data: old.data.map((event) =>
              event.id === item.id ? { ...event, is_used: nextUsed } : event,
            ),
          }
        : old,
    );
    try {
      await updateEventUsed(item.id, nextUsed);
      invalidateImageData();
    } catch (err) {
      queryClient.setQueryData(key, previous); // 실패하면 원래대로 되돌림
      Alert.alert("변경 실패", err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.");
    }
  };

  // 이벤트 목록을 아직 못 받아왔으면 빈 값들로 화면을 그리지 말고 스피너.
  if (eventsQuery.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingScreen}>
          <View style={styles.topRow}>
            <Pressable style={styles.backButton} onPress={() => goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color="#2F6FED" />
            </Pressable>
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2F6FED" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => goBack()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#2F6FED" />
            <Text weight="semiBold" style={styles.backLabel}>
              {item?.category ?? ""}
            </Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => toggleFavorite("expiring", id)}>
            <Ionicons
              name={favorited ? "star" : "star-outline"}
              size={22}
              color={favorited ? "#F5A623" : colors.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.image}>
          {item?.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.imagePicture} resizeMode="contain" />
          ) : null}
          {item ? (
            <View style={styles.imageTag}>
              <Text weight="semiBold" style={styles.imageTagLabel}>
                {item.category}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <Text weight="extraBold" style={styles.title}>
            {item?.title ?? ""}
          </Text>
          {item ? (
            <Badge
              label={getDDayLabel(item.daysLeft)}
              variant={getBadgeVariant(item.daysLeft)}
            />
          ) : null}
        </View>

        <View style={styles.infoList}>
          <InfoRow label="카테고리" value={item?.category ?? ""} />
          <InfoRow label="날짜" value={item?.subtitle ?? ""} divider />
          {item?.location ? (
            <InfoRow label="장소" value={item.location} divider />
          ) : null}
        </View>

        {item ? (
          <Pressable
            style={[styles.usedButton, item.isUsed && styles.usedButtonActive]}
            onPress={handleToggleUsed}
          >
            <Ionicons
              name={item.isUsed ? "checkmark-circle" : "checkmark-circle-outline"}
              size={20}
              color={item.isUsed ? "#16A34A" : "#2F6FED"}
            />
            <Text
              weight="semiBold"
              style={[styles.usedButtonLabel, item.isUsed && styles.usedButtonLabelActive]}
            >
              {item.isUsed ? "사용 완료" : "사용 완료로 표시"}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.calendarButton}
          onPress={() => router.push("/calendar")}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text weight="semiBold" style={styles.calendarButtonLabel}>
            캘린더에서 보기
          </Text>
        </Pressable>
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
    loadingScreen: {
      flex: 1,
      paddingHorizontal: 20,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 80,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 12,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    backLabel: {
      fontSize: 17,
      color: "#2F6FED",
      marginLeft: 2,
    },
    image: {
      height: 320,
      borderRadius: 20,
      backgroundColor: colors.surface,
      padding: 12,
      overflow: "hidden",
    },
    imagePicture: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
    imageTag: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(17, 24, 39, 0.7)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    imageTagLabel: {
      fontSize: 12,
      color: "#FFFFFF",
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
    },
    title: {
      flex: 1,
      fontSize: 22,
      color: colors.text,
      marginRight: 12,
    },
    tagListWrapper: {
      marginTop: 12,
    },
    infoList: {
      marginTop: 20,
    },
    usedButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: "#2F6FED",
      backgroundColor: "#EEF3FF",
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 24,
    },
    usedButtonActive: {
      backgroundColor: "#DCFCE7",
      borderColor: "#DCFCE7",
    },
    usedButtonLabel: {
      fontSize: 15,
      color: "#2F6FED",
    },
    usedButtonLabelActive: {
      color: "#16A34A",
    },
    calendarButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#2F6FED",
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 24,
    },
    calendarButtonLabel: {
      fontSize: 16,
      color: "#FFFFFF",
    },
  });
