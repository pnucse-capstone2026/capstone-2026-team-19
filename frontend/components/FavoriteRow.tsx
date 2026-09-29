import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

export function FavoriteRow({
  title,
  subtitle,
  imageUrl,
  onPress,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.thumbnail}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} resizeMode="cover" /> : null}
      </View>
      <View style={styles.textColumn}>
        <Text weight="semiBold" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="star" size={18} color="#F5A623" />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    thumbnail: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.border,
      marginRight: 12,
      overflow: 'hidden',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    textColumn: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
