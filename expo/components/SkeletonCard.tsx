// Skeleton loading card for better perceived performance
// Uses shimmer gradient effect for loading states

import { memo, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { theme } from "@/constants/theme";

type Props = {
  style?: any;
};

function SkeletonCardBase({ style }: Props) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const AnimatedView = Animated.View;

  return (
    <Pressable style={[styles.card, style]} disabled>
      {/* Image skeleton */}
      <AnimatedView style={[styles.imageWrap, { opacity }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Title skeleton */}
        <AnimatedView style={[styles.titleSkeleton, { opacity }]} />
        <AnimatedView style={[styles.titleSkeletonShort, { opacity }]} />

        {/* Specs skeleton */}
        <View style={styles.specsRow}>
          <AnimatedView style={[styles.specSkeleton, { opacity }]} />
          <AnimatedView style={[styles.specSkeleton, { opacity }]} />
          <AnimatedView style={[styles.specSkeleton, { opacity }]} />
        </View>

        {/* Footer skeleton */}
        <View style={styles.footerRow}>
          <AnimatedView style={[styles.footerSkeleton, { opacity }]} />
          <AnimatedView style={[styles.footerSkeletonShort, { opacity }]} />
        </View>
      </View>
    </Pressable>
  );
}

export const SkeletonCard = memo(SkeletonCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  imageWrap: {
    height: 180,
    backgroundColor: theme.bgElevated,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  titleSkeleton: {
    height: 14,
    borderRadius: 4,
    backgroundColor: theme.bgElevated,
  },
  titleSkeletonShort: {
    height: 14,
    width: "60%",
    borderRadius: 4,
    backgroundColor: theme.bgElevated,
  },
  specsRow: {
    flexDirection: "row",
    gap: 10,
  },
  specSkeleton: {
    height: 12,
    width: 50,
    borderRadius: 3,
    backgroundColor: theme.bgElevated,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  footerSkeleton: {
    height: 10,
    width: "40%",
    borderRadius: 3,
    backgroundColor: theme.bgElevated,
  },
  footerSkeletonShort: {
    height: 10,
    width: "25%",
    borderRadius: 3,
    backgroundColor: theme.bgElevated,
  },
});
