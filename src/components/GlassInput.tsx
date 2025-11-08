// Glass Input Component with Animations
import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
// import { BlurView } from '@react-native-community/blur'; // Native module - Expo Go'da çalışmaz
import { darkTheme } from '../utils/theme';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'default' | 'floating';
  showPasswordToggle?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function GlassInput({
  label,
  error,
  variant = 'default',
  value,
  onFocus,
  onBlur,
  showPasswordToggle = false,
  ...props
}: GlassInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const [showPassword, setShowPassword] = useState(false);

  const focusAnimation = useSharedValue(0);
  const labelAnimation = useSharedValue(hasValue ? 1 : 0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnimation.value = withSpring(1, { damping: 15, stiffness: 300 });
    labelAnimation.value = withSpring(1, { damping: 15, stiffness: 300 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnimation.value = withSpring(0, { damping: 15, stiffness: 300 });
    if (!hasValue) {
      labelAnimation.value = withSpring(0, { damping: 15, stiffness: 300 });
    }
    onBlur?.(e);
  };

  const handleTextChange = (text: string) => {
    setHasValue(!!text);
    if (!isFocused) {
      labelAnimation.value = withSpring(!!text ? 1 : 0, { damping: 15, stiffness: 300 });
    }
    props.onChangeText?.(text);
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolate(
      focusAnimation.value,
      [0, 1],
      [0, 1]
    );

    return {
      borderColor: borderColor === 1 ? darkTheme.colors.primary : darkTheme.colors.border,
      borderWidth: withTiming(borderColor === 1 ? 2 : 1, { duration: 200 }),
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      labelAnimation.value,
      [0, 1],
      [0, -20]
    );
    const scale = interpolate(
      labelAnimation.value,
      [0, 1],
      [1, 0.8]
    );
    const color = interpolate(
      labelAnimation.value,
      [0, 1],
      [0, 1]
    );

    return {
      transform: [
        { translateY },
        { scale }
      ],
      color: color === 1 ? darkTheme.colors.primary : darkTheme.colors.textSecondary,
    };
  });

  if (variant === 'floating' && label) {
    return (
      <View style={styles.container}>
        <AnimatedView style={[styles.inputContainer, animatedContainerStyle]}>
          {/* BlurView alternatifi - Expo Go uyumlu */}
          <View style={styles.blurView} />
          <TextInput
            {...props}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={handleTextChange}
            style={[styles.input, props.style]}
            placeholderTextColor={darkTheme.colors.textSecondary}
          />
          <AnimatedView style={[styles.labelContainer, animatedLabelStyle]}>
            <Text style={styles.label}>{label}</Text>
          </AnimatedView>
        </AnimatedView>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedView style={[styles.inputContainer, animatedContainerStyle]}>
        {/* BlurView alternatifi - Expo Go uyumlu */}
        <View style={styles.blurView} />
        <TextInput
          {...props}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleTextChange}
          style={[styles.input, props.style]}
          placeholderTextColor={darkTheme.colors.textSecondary}
          secureTextEntry={showPasswordToggle ? !showPassword : props.secureTextEntry}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={darkTheme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </AnimatedView>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: darkTheme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkTheme.colors.aiHaze,
    // BlurView alternatifi - şeffaf arka plan
    opacity: 0.8,
  },
  input: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingRight: 50, // Space for password toggle
    backgroundColor: 'transparent',
    minHeight: 56,
  },
  labelContainer: {
    position: 'absolute',
    left: 20,
    top: 18,
    backgroundColor: darkTheme.colors.background,
    paddingHorizontal: 4,
  },
  label: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
  errorText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.error,
    marginTop: 4,
    marginLeft: 16,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },
});
