import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import type { Category } from '@/types/home';

export function CategoryCard({ category }: { category: Category }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const urls = category.previewImageUrls ?? [];

  return (
    <View style={styles.wrapper}>
      <View style={styles.thumbnail}>
        {urls.length === 0 ? (
          <View style={styles.emptyMosaic}>
            <Ionicons name="images-outline" size={26} color={colors.textPlaceholder} />
          </View>
        ) : urls.length === 1 ? (
          <Image source={{ uri: urls[0] }} style={styles.coverImage} resizeMode="cover" />
        ) : urls.length === 2 ? (
          <View style={styles.row}>
            <Image source={{ uri: urls[0] }} style={styles.flexImage} resizeMode="cover" />
            <Image source={{ uri: urls[1] }} style={styles.flexImage} resizeMode="cover" />
          </View>
        ) : urls.length === 3 ? (
          <View style={styles.row}>
            <Image source={{ uri: urls[0] }} style={styles.flexImage} resizeMode="cover" />
            <View style={styles.column}>
              <Image source={{ uri: urls[1] }} style={styles.flexImage} resizeMode="cover" />
              <Image source={{ uri: urls[2] }} style={styles.flexImage} resizeMode="cover" />
            </View>
          </View>
        ) : (
          <View style={styles.grid2x2}>
            {urls.slice(0, 4).map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.quadrant} resizeMode="cover" />
            ))}
          </View>
        )}
      </View>
      <View style={styles.textRow}>
        <Text weight="bold" style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.count}>{category.count}장</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      width: '100%',
    },
    thumbnail: {
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    emptyMosaic: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    row: {
      flex: 1,
      flexDirection: 'row',
    },
    column: {
      flex: 1,
      flexDirection: 'column',
    },
    flexImage: {
      flex: 1,
    },
    grid2x2: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    quadrant: {
      width: '50%',
      height: '50%',
    },
    textRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 4,
    },
    name: {
      flexShrink: 1,
      fontSize: 13,
      color: colors.text,
    },
    count: {
      fontSize: 11,
      color: colors.textMuted,
    },
  });
