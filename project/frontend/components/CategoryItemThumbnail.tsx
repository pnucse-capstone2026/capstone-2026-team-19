import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Image, View } from "react-native";

import type { ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import type { CategoryItem } from "@/types/home";

export function CategoryItemThumbnail({
  item,
  selectionMode = false,
  selected = false,
}: {
  item: CategoryItem;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.thumbnail, selected && styles.thumbnailSelected]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : null}
      {item.status === "used" && (
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
      {selected ? <View style={styles.selectedOverlay} /> : null}
      {selectionMode ? (
        <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    thumbnail: {
      width: "100%",
      aspectRatio: 3 / 4,
      borderRadius: 16,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    thumbnailSelected: {
      borderWidth: 2,
      borderColor: "#2F6FED",
    },
    badge: {
      position: "absolute",
      right: 8,
      bottom: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(17, 24, 39, 0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    image: {
      width: "100%",
      height: "100%",
      borderRadius: 16,
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(47, 111, 237, 0.16)",
    },
    checkCircle: {
      position: "absolute",
      top: 8,
      left: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255, 255, 255, 0.85)",
      borderWidth: 1.5,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleSelected: {
      backgroundColor: "#2F6FED",
      borderColor: "#2F6FED",
    },
  });
