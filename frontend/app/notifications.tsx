import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { goBack } from '@/lib/navigation';

interface DeliveredNotification {
  id: string;
  body: string;
  date: Date;
}

function formatDeliveredDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${month}월 ${day}일 ${period} ${hour12}:${String(minutes).padStart(2, '0')}`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notifications, setNotifications] = useState<DeliveredNotification[]>([]);

  // useFocusEffect — 알림센터에서 새로 오거나(포그라운드 배너 포함) 사라진
  // 것들이 있을 수 있어서, 이 화면 볼 때마다 최신 상태로 다시 불러온다.
  useFocusEffect(
    useCallback(() => {
      Notifications.getPresentedNotificationsAsync()
        .then((presented) => {
          const mapped = presented
            .map((notification) => ({
              id: notification.request.identifier,
              body: notification.request.content.body ?? '',
              date: new Date(notification.date),
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime()); // 최신순
          setNotifications(mapped);
        })
        .catch((err) => console.warn('알림 목록 불러오기 실패', err));
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        backLabel="홈"
        onBack={() => goBack()}
        title="알림"
        subtitle={`${notifications.length}건`}
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <Ionicons name="notifications" size={18} color="#2F6FED" />
            </View>
            <View style={styles.textColumn}>
              <Text weight="semiBold" style={styles.rowBody}>
                {item.body}
              </Text>
              <Text style={styles.rowDate}>{formatDeliveredDate(item.date)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyLabel}>받은 알림이 없어요</Text>
        }
      />
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    iconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    textColumn: {
      flex: 1,
    },
    rowBody: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 20,
    },
    rowDate: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    emptyLabel: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingVertical: 48,
    },
  });
