import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { InfoRow } from '@/components/InfoRow';
import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  categoryName,
  deleteImage,
  updateEventUsed,
  type EventResponse,
} from '@/lib/api';
import { daysUntil } from '@/lib/date';
import { getBadgeVariant, getDDayLabel } from '@/lib/deadline';
import { goBack } from '@/lib/navigation';
import { queryKeys } from '@/lib/queryClient';
import { invalidateImageData, useImageEventsQuery, useImageQuery } from '@/lib/queries';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite('category-item', id);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  // 이미지·이벤트를 react-query로 받아온다. 캐시가 있으면(카테고리 목록에서
  // 넘어온 경우 등) 즉시 그려지고, 없으면 아래 로딩 게이트가 스피너를 보여준다.
  // 예전엔 데이터 오기 전에 categoryName(null)="미분류" 같은 폴백값이 잠깐
  // 번쩍였는데, 게이트로 그 깜빡임을 없앴다.
  const imageQuery = useImageQuery(id);
  const imageEventsQuery = useImageEventsQuery(id);
  const image = imageQuery.data ?? null;
  const events: EventResponse[] = imageEventsQuery.data ?? [];
  const loadFailed = imageQuery.isError;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleUsed = async () => {
    const firstEvent = events[0];
    if (!firstEvent) return;
    const nextUsed = !firstEvent.is_used;
    const key = queryKeys.imageEvents(id);
    const previous = queryClient.getQueryData<EventResponse[]>(key);
    // 낙관적 업데이트 — 캐시를 먼저 바꿔서 바로 눌린 것처럼 보이게.
    queryClient.setQueryData<EventResponse[]>(key, (old) =>
      (old ?? []).map((event) =>
        event.id === firstEvent.id ? { ...event, is_used: nextUsed } : event,
      ),
    );
    try {
      await updateEventUsed(firstEvent.id, nextUsed);
      invalidateImageData(); // 홈/만료임박/캘린더의 사용완료 뱃지도 갱신
    } catch (err) {
      queryClient.setQueryData(key, previous);
      Alert.alert('변경 실패', err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.');
    }
  };

  const handleDelete = () => {
    Alert.alert('이미지 삭제', '이 이미지를 삭제할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteImage(id);
            invalidateImageData();
            goBack();
          } catch (err) {
            Alert.alert('삭제 실패', err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.');
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const backLabel = image ? categoryName(image.category) : '';

  if (loadFailed || !image || imageEventsQuery.isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.stateScreen}>
          <View style={styles.topRow}>
            <Pressable style={styles.backButton} onPress={() => goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color="#2F6FED" />
              <Text weight="semiBold" style={styles.backLabel}>
                {backLabel}
              </Text>
            </Pressable>
          </View>
          <View style={styles.stateBox}>
            {loadFailed ? (
              <Text style={styles.stateText}>이미지를 불러오지 못했어요.</Text>
            ) : (
              <ActivityIndicator size="large" color="#2F6FED" />
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const category = categoryName(image?.category ?? null);
  // 이벤트 제목("스타벅스 쿠폰")이 카테고리 이름("쿠폰")보다 훨씬 구체적이라
  // 있으면 그걸 큰 제목으로 쓰고, 없으면 caption, 그것도 없으면 카테고리로.
  const firstEvent = events[0];
  const title = firstEvent?.title ?? image?.caption ?? category;
  const expiryLabel = firstEvent?.event_date
    ? (() => {
        const [, month, day] = firstEvent.event_date!.split('-');
        const dateLabel = `${Number(month)}월 ${Number(day)}일`;
        return firstEvent.event_time ? `${dateLabel} ${firstEvent.event_time}` : dateLabel;
      })()
    : null;
  const daysLeft = firstEvent?.event_date ? daysUntil(firstEvent.event_date) : null;
  const description = image?.caption ?? '설명이 아직 없어요';
  const savedAtLabel = image
    ? `${new Date(image.created_at).getMonth() + 1}월 ${new Date(image.created_at).getDate()}일 저장됨`
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.backButton} onPress={() => goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#2F6FED" />
            <Text weight="semiBold" style={styles.backLabel}>
              {category}
            </Text>
          </Pressable>
          <View style={styles.actionRow}>
            <Pressable hitSlop={8} onPress={() => toggleFavorite('category-item', id)}>
              <Ionicons
                name={favorited ? 'star' : 'star-outline'}
                size={22}
                color={favorited ? '#F5A623' : colors.textMuted}
              />
            </Pressable>
            <Pressable hitSlop={8} onPress={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.image}>
          {image?.signed_url ? (
            <Image source={{ uri: image.signed_url }} style={styles.imagePicture} resizeMode="contain" />
          ) : null}
          {image ? (
            <View style={styles.imageTag}>
              <Text weight="semiBold" style={styles.imageTagLabel}>
                {category}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <Text weight="extraBold" style={styles.title}>
            {title}
          </Text>
          {daysLeft !== null ? (
            firstEvent?.is_used ? (
              <Badge label="사용완료" variant="used" />
            ) : (
              <Badge label={getDDayLabel(daysLeft)} variant={getBadgeVariant(daysLeft)} />
            )
          ) : null}
        </View>

        <View style={styles.infoList}>
          <InfoRow label="카테고리" value={category} />
          {expiryLabel ? <InfoRow label="만료일" value={expiryLabel} divider /> : null}
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionLabel}>설명</Text>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>

        {firstEvent ? (
          <Pressable
            style={[styles.usedButton, firstEvent.is_used && styles.usedButtonActive]}
            onPress={handleToggleUsed}
          >
            <Ionicons
              name={firstEvent.is_used ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={firstEvent.is_used ? '#16A34A' : '#2F6FED'}
            />
            <Text
              weight="semiBold"
              style={[styles.usedButtonLabel, firstEvent.is_used && styles.usedButtonLabelActive]}
            >
              {firstEvent.is_used ? '사용 완료' : '사용 완료로 표시'}
            </Text>
          </Pressable>
        ) : null}

        {daysLeft !== null ? (
          <Pressable style={styles.calendarButton} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text weight="semiBold" style={styles.calendarButtonLabel}>
              캘린더에서 보기
            </Text>
          </Pressable>
        ) : null}

        {daysLeft !== null ? <Text style={styles.savedAtFooter}>{savedAtLabel}</Text> : null}
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
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 12,
    },
    stateScreen: {
      flex: 1,
      paddingHorizontal: 20,
    },
    stateBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    stateText: {
      fontSize: 15,
      color: colors.textMuted,
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
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    image: {
      height: 320,
      borderRadius: 20,
      backgroundColor: colors.surface,
      padding: 12,
      overflow: 'hidden',
    },
    imagePicture: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
    imageTag: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(17, 24, 39, 0.7)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    imageTagLabel: {
      fontSize: 12,
      color: '#FFFFFF',
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    title: {
      flex: 1,
      fontSize: 22,
      color: colors.text,
      marginRight: 12,
    },
    infoList: {
      marginTop: 20,
    },
    descriptionSection: {
      marginTop: 24,
    },
    descriptionLabel: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 6,
    },
    descriptionText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    usedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: '#2F6FED',
      backgroundColor: '#EEF3FF',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 24,
    },
    usedButtonActive: {
      backgroundColor: '#DCFCE7',
      borderColor: '#DCFCE7',
    },
    usedButtonLabel: {
      fontSize: 15,
      color: '#2F6FED',
    },
    usedButtonLabelActive: {
      color: '#16A34A',
    },
    calendarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#2F6FED',
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 12,
    },
    calendarButtonLabel: {
      fontSize: 16,
      color: '#FFFFFF',
    },
    savedAtFooter: {
      marginTop: 28,
      fontSize: 12,
      color: colors.textPlaceholder,
      textAlign: 'center',
    },
  });
