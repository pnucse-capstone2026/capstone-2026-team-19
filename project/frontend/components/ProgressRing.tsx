import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 6,
  color = '#2F6FED',
  trackColor = '#E5E7EB',
  showLabel = true,
  labelColor,
}: {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** 링 가운데에 퍼센트 숫자를 보여줄지 — 빈 링만 있으면 허전해 보여서 기본으로 켜둠. */
  showLabel?: boolean;
  labelColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  // progress가 (특히 항목이 적거나 서버 응답이 빠를 때) 0에서 1로 한 프레임 만에
  // 뛰어버릴 수 있어서, dashoffset을 바로 스냅하면 링이 안 차오르고 순간이동한
  // 것처럼 보인다. Animated로 매번 새 목표값까지 부드럽게 이어서 채운다.
  const animatedClamped = useRef(new Animated.Value(clamped)).current;
  const [displayPercent, setDisplayPercent] = useState(Math.round(clamped * 100));
  useEffect(() => {
    const id = animatedClamped.addListener(({ value }) => setDisplayPercent(Math.round(value * 100)));
    return () => animatedClamped.removeListener(id);
  }, [animatedClamped]);
  useEffect(() => {
    Animated.timing(animatedClamped, {
      toValue: clamped,
      duration: 350,
      useNativeDriver: false, // strokeDashoffset은 native driver 미지원
    }).start();
  }, [clamped, animatedClamped]);
  const dashOffset = animatedClamped.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showLabel ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.labelWrapper}>
            <Text weight="bold" style={[styles.label, labelColor ? { color: labelColor } : { color }]}>
              {displayPercent}%
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
  },
});
