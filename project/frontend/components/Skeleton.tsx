import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type DimensionValue, type ViewStyle } from "react-native";

import { useTheme } from "@/contexts/ThemeContext";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

// 데이터를 기다리는 동안 빈 화면 대신 깔던 회색 placeholder. 천천히
// 밝아졌다 어두워지길 반복해서 "불러오는 중"인 걸 알린다. 화면마다 이
// 조각을 조합해서 실제 레이아웃과 비슷한 모양을 만든다.
export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, backgroundColor: colors.surface, opacity: pulse },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
