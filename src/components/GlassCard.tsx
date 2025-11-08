// Glass Card Component with Animations
import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
// import { BlurView } from '@react-native-community/blur'; // Native module - Expo Go'da çalışmaz
import { darkTheme } from '../utils/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'subtle';
  animated?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  animated = true,
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const elevation = useSharedValue(0);

  const handlePressIn = () => {
    if (animated && onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      elevation.value = withTiming(8, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      elevation.value = withTiming(0, { duration: 150 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      elevation: elevation.value,
      shadowOpacity: interpolate(elevation.value, [0, 8], [0, 0.15]),
      shadowRadius: interpolate(elevation.value, [0, 8], [0, 12]),
      shadowOffset: {
        width: 0,
        height: interpolate(elevation.value, [0, 8], [0, 4]),
      },
    };
  });

  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevatedCard;
      case 'subtle':
        return styles.subtleCard;
      default:
        return styles.defaultCard;
    }
  };

  const CardComponent = onPress ? AnimatedTouchableOpacity : AnimatedView;

  return (
    <CardComponent
      style={[getCardStyle(), animatedStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {/* BlurView alternatifi - Expo Go uyumlu */}
      <View style={styles.blurView} />
      {children}
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  defaultCard: {
    backgroundColor: darkTheme.colors.glass,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    overflow: 'hidden',
  },
  elevatedCard: {
    backgroundColor: darkTheme.colors.glassHover,
    borderRadius: darkTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    overflow: 'hidden',
    ...darkTheme.shadows.medium,
  },
  subtleCard: {
    backgroundColor: darkTheme.colors.aiHaze,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    overflow: 'hidden',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkTheme.colors.glass,
    // BlurView alternatifi - şeffaf arka plan
    opacity: 0.8,
  },
});
