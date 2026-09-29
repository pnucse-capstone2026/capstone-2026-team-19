import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeadlineListRow } from "@/components/DeadlineListRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Skeleton } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import type { ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { goBack } from "@/lib/navigation";
import { toExpiringItem } from "@/lib/events";
import { useEventsQuery, useImagesQuery, useRefetchStaleOnFocus } from "@/lib/queries";
import type { ExpiringItem } from "@/types/home";

export default function ExpiringListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const eventsQuery = useEventsQuery(true);
  const imagesQuery = useImagesQuery(100);
  useRefetchStaleOnFocus(eventsQuery);
  useRefetchStaleOnFocus(imagesQuery);
  const isLoading = eventsQuery.isPending || imagesQuery.isPending;

  const items = useMemo<ExpiringItem[]>(() => {
    const imageUrlById = new Map(
      (imagesQuery.data?.data ?? []).map((image) => [image.id, image.signed_url]),
    );
    return (eventsQuery.data?.data ?? [])
      .map((event) => toExpiringItem(event, imageUrlById))
      .filter((item): item is ExpiringItem => item !== null);
  }, [eventsQuery.data, imagesQuery.data]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader
        backLabel="홈"
        onBack={() => goBack()}
        title="만료 임박"
        subtitle={isLoading ? "불러오는 중…" : `${items.length}건 · 임박순`}
      />

      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} height={72} radius={16} style={styles.rowSkeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/expiring/${item.id}`)}>
              <DeadlineListRow item={item} />
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyLabel}>다가오는 일정이 없어요</Text>
          }
        />
      )}
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
    rowSkeleton: {
      marginBottom: 12,
    },
    emptyLabel: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: 32,
    },
  });
