import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

// 뒤로가기 + 큰 제목 + (선택) 설명 한 줄로 이뤄진, 목록형 화면(카테고리 상세/
// 만료임박 목록/즐겨찾기 등)에서 반복되던 헤더를 하나로 뽑은 것. extraBold +
// 좁은 여백이 너무 무거워 보인다는 피드백으로 weight를 낮추고 위아래 여백을
// 넉넉하게 잡음 — 화면마다 따로 스타일을 복붙하지 않도록 여기서만 고치면 됨.
export function ScreenHeader({
  backLabel,
  onBack,
  title,
  subtitle,
  rightAccessory,
}: {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  rightAccessory?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color="#2F6FED" />
          <Text weight="semiBold" style={styles.backLabel}>
            {backLabel}
          </Text>
        </Pressable>
        {rightAccessory}
      </View>
      <Text weight="bold" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backLabel: {
      fontSize: 17,
      color: '#2F6FED',
      marginLeft: 2,
    },
    title: {
      fontSize: 26,
      color: colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      marginBottom: 20,
    },
  });
