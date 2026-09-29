import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressRing } from "@/components/ProgressRing";
import { Text } from "@/components/Text";
import {
  UploadThumbnail,
  type UploadThumbnailStatus,
} from "@/components/UploadThumbnail";
import type { ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { uploadImage, type ImageResponse } from "@/lib/api";
import { goBack } from "@/lib/navigation";
import { invalidateImageData } from "@/lib/queries";
import { getAssetDedupeKey, markAssetsUploaded } from "@/lib/uploadHistory";

export default function UploadModalScreen() {
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const uris = useMemo(() => assets.map((asset) => asset.uri), [assets]);
  const [completed, setCompleted] = useState(0);
  // 업로드 성공한 항목의 실제 서버 응답(진짜 id·AI 분류 카테고리) — 실패한
  // 항목은 null로 자리만 채워서 uris와 인덱스가 계속 맞도록 한다. 완료 버튼을
  // 누를 때 이 배열에서 성공한 것만 골라 upload-review로 넘긴다.
  const [uploaded, setUploaded] = useState<(ImageResponse | null)[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalScreenshots = uris.length;
  const hasStarted = totalScreenshots > 0;
  const isDone = hasStarted && completed >= totalScreenshots;

  useEffect(() => {
    if (!hasStarted) return;
    let cancelled = false;

    (async () => {
      const results: (ImageResponse | null)[] = [];
      for (let i = 0; i < assets.length; i++) {
        if (cancelled) return;
        try {
          const image = await uploadImage(assets[i].uri);
          results.push(image);
          // 업로드 성공한 사진을 기억해둬서, 나중에 같은 사진을 다시 고르면
          // 미리 걸러낼 수 있게 한다.
          const dedupeKey = getAssetDedupeKey(assets[i]);
          if (dedupeKey) {
            await markAssetsUploaded([dedupeKey]);
          }
        } catch (err) {
          console.warn("업로드 실패", assets[i].uri, err);
          // 실패한 항목을 어떻게 표시할지는 UploadThumbnailStatus에 'error' 상태를
          // 추가할지 말지 포함해서 정하시면 돼요 — 지금은 일단 넘어가는 것도 방법
          results.push(null);
        }
        if (!cancelled) {
          setCompleted((prev) => prev + 1);
          setUploaded([...results]);
        }
      }
      // 업로드된 이미지가 홈·카테고리 목록에 바로 보이도록 캐시 무효화.
      if (!cancelled && results.some((image) => image !== null)) {
        invalidateImageData();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasStarted]);

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "갤러리 접근 권한이 필요해요",
        "설정에서 사진 보관함 접근을 허용해주세요.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    // TODO: 중복 업로드 방지 잠깐 꺼둠 - 다시 켤 땐 아래 필터링을 복구하면 됨.
    // const uploadedKeys = await getUploadedAssetKeys();
    // const newAssets = result.assets.filter((asset) => {
    //   const dedupeKey = getAssetDedupeKey(asset);
    //   // 식별 불가능한(둘 다 unavailable) 자산은 중복 체크를 포기하고 통과시킨다.
    //   return !dedupeKey || !uploadedKeys.has(dedupeKey);
    // });
    // const duplicateCount = result.assets.length - newAssets.length;
    //
    // if (newAssets.length === 0) {
    //   Alert.alert(
    //     "이미 업로드한 사진이에요",
    //     "선택한 사진이 전부 예전에 업로드한 스크린샷이라 다시 올리지 않았어요.",
    //   );
    //   return;
    // }
    //
    // if (duplicateCount > 0) {
    //   Alert.alert(
    //     "이미 업로드한 사진은 제외했어요",
    //     `${duplicateCount}장은 예전에 이미 올린 스크린샷이라 빼고, 나머지 ${newAssets.length}장만 업로드할게요.`,
    //   );
    // }
    const newAssets = result.assets;

    setCompleted(0);
    setAssets(newAssets);
  };

  const progress = hasStarted ? completed / totalScreenshots : 0;
  const percent = Math.round(progress * 100);

  // 이미지 하나당 서버 응답이 순식간에 끝나버리면(AI 파이프라인 지연이 없을
  // 때) completed가 0에서 total까지 한 프레임 만에 뛰어버려서, 그냥
  // width: `${percent}%`로 바로 스냅하면 진행바가 게이지 없이 0->100으로
  // 점프한 것처럼 보인다. Animated로 매 목표값까지 부드럽게 채워지도록 한다 -
  // 목표값이 애니메이션 도중에 또 바뀌어도 그 지점부터 이어서 자연스럽게
  // 이어진다.
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false, // width는 native driver 미지원
    }).start();
  }, [progress, progressAnim]);

  const thumbnails = uris.map((uri, index) => {
    const status: UploadThumbnailStatus =
      index < completed
        ? "done"
        : index === completed && !isDone
          ? "processing"
          : "pending";
    return { id: `upload-${index}`, uri, status };
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} hitSlop={8}>
          <Text style={styles.cancelLabel}>취소</Text>
        </Pressable>
        <Text weight="semiBold" style={styles.headerTitle}>
          가져오기
        </Text>
        <Pressable
          disabled={!isDone}
          onPress={() => {
            const images = uris
              .map((uri, index) => {
                const image = uploaded[index];
                return image ? { id: image.id, uri, category: image.category } : null;
              })
              .filter((item): item is { id: string; uri: string; category: ImageResponse["category"] } => item !== null);
            router.push({
              pathname: "/upload-review",
              params: { images: JSON.stringify(images) },
            });
          }}
          hitSlop={8}
        >
          <Text
            weight="semiBold"
            style={[styles.doneLabel, !isDone && styles.doneLabelDisabled]}
          >
            완료
          </Text>
        </Pressable>
      </View>

      {!hasStarted ? (
        <View style={styles.pickerSection}>
          <View style={styles.pickerIconWrapper}>
            <Ionicons name="images-outline" size={40} color="#2F6FED" />
          </View>
          <Text weight="bold" style={styles.pickerTitle}>
            갤러리에서 스크린샷을 가져와보세요
          </Text>
          <Text style={styles.pickerSubtitle}>
            쿠폰, 티켓, 영수증 등을 자동으로{"\n"}인식하고 정리해드려요
          </Text>
          <Pressable
            style={styles.pickerButton}
            onPress={handlePickFromGallery}
          >
            <Ionicons name="images" size={18} color="#fff" />
            <Text weight="semiBold" style={styles.pickerButtonLabel}>
              갤러리에서 선택
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusSection}>
              <ProgressRing progress={progress} />
              <Text weight="bold" style={styles.statusTitle}>
                {isDone ? "분석 완료!" : "분석 중..."}
              </Text>
              {!isDone && (
                <Text style={styles.statusSubtitle}>
                  텍스트 인식 · 카테고리 분류{"\n"}만료일 추출 중
                </Text>
              )}
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.progressStatsRow}>
              <View style={styles.progressStatsPill}>
                <Text weight="semiBold" style={styles.progressStatsPillLabel}>
                  {completed} / {totalScreenshots}장 완료
                </Text>
              </View>
              <Text weight="bold" style={styles.progressStatsPercent}>
                {percent}%
              </Text>
            </View>
          </View>

          <Text weight="semiBold" style={styles.gridLabel}>
            가져온 사진
          </Text>

          <FlatList
            data={thumbnails}
            keyExtractor={(item) => item.id}
            numColumns={4}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <View style={styles.thumbnailWrapper}>
                <UploadThumbnail uri={item.uri} status={item.status} />
              </View>
            )}
          />
        </>
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
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 12,
      paddingBottom: 8,
    },
    cancelLabel: {
      fontSize: 16,
      color: "#2F6FED",
    },
    headerTitle: {
      fontSize: 16,
      color: colors.text,
    },
    doneLabel: {
      fontSize: 16,
      color: "#2F6FED",
    },
    doneLabelDisabled: {
      color: colors.textPlaceholder,
    },
    pickerSection: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      marginTop: -40,
    },
    pickerIconWrapper: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: "#DBEAFE",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    pickerTitle: {
      fontSize: 18,
      color: colors.text,
      textAlign: "center",
    },
    pickerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 18,
    },
    pickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#2F6FED",
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 28,
      marginTop: 28,
    },
    pickerButtonLabel: {
      fontSize: 16,
      color: "#FFFFFF",
    },
    statusCard: {
      backgroundColor: "#EEF3FF",
      borderRadius: 24,
      marginHorizontal: 20,
      marginTop: 28,
      marginBottom: 28,
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    statusSection: {
      alignItems: "center",
      marginBottom: 28,
    },
    statusTitle: {
      fontSize: 18,
      color: colors.text,
      marginTop: 18,
    },
    statusSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 18,
    },
    progressBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(47, 111, 237, 0.14)",
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: "#2F6FED",
    },
    progressStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 14,
    },
    progressStatsPill: {
      backgroundColor: colors.background,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    progressStatsPillLabel: {
      fontSize: 12.5,
      color: colors.text,
    },
    progressStatsPercent: {
      fontSize: 15,
      color: "#2F6FED",
    },
    gridLabel: {
      fontSize: 15,
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    grid: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    row: {
      justifyContent: "flex-start",
      gap: 10,
      marginBottom: 14,
    },
    thumbnailWrapper: {
      width: "22%",
    },
  });
