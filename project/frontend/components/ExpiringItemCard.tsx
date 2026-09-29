import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { getBadgeVariant, getDDayLabel } from '@/lib/deadline';
import type { ExpiringItem } from '@/types/home';

export function ExpiringItemCard({ item }: { item: ExpiringItem }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{item.category}</Text>
        {item.isUsed ? (
          <Badge label="사용완료" variant="used" />
        ) : (
          <Badge label={getDDayLabel(item.daysLeft)} variant={getBadgeVariant(item.daysLeft)} />
        )}
      </View>
      <View style={styles.thumbnail}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnailImage} resizeMode="cover" />
        ) : null}
      </View>
      <Text weight="bold" style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: 180,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    category: {
      fontSize: 13,
      color: colors.textMuted,
    },
    thumbnail: {
      height: 110,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginVertical: 10,
      overflow: 'hidden',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    title: {
      fontSize: 15,
      lineHeight: 19,
      height: 38, // lineHeight * 2 — 제목이 1줄이든 2줄이든 카드 높이가 항상 같도록 고정
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
