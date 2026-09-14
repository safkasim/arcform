import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function Brand({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.brandRow}>
      <Image
        source={require('@/assets/images/brand-mark.png')}
        resizeMode="contain"
        style={{ width: compact ? 24 : 34, height: compact ? 24 : 34 }}
        accessibilityLabel="Arcform"
      />
      <Text style={[styles.brand, { color: colors.foreground, fontSize: compact ? 20 : 30 }]}>
        arcform
      </Text>
    </View>
  );
}

export function Screen({
  children,
  refresh,
  contentContainerStyle,
  onScroll,
  showHeader = true,
  ...props
}: ScrollViewProps & {
  refresh?: { refreshing: boolean; onRefresh: () => void };
  showHeader?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [1, 0.68],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        entrance.setValue(1);
        return;
      }
      animation = Animated.spring(entrance, {
        toValue: 1,
        damping: 20,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      });
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [entrance]);

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        style={[
          styles.screenScroll,
          {
            opacity: entrance,
            transform: [{
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
          },
        ]}
        contentContainerStyle={[
          styles.screen,
          {
            paddingTop: showHeader ? insets.top + 70 : insets.top + 18,
            paddingBottom: insets.bottom + 110,
          },
          contentContainerStyle,
        ]}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: onScroll },
        )}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={refresh.refreshing}
              onRefresh={refresh.onRefresh}
              tintColor={colors.foreground}
            />
          ) : undefined
        }
        {...props}
      >
        {children}
      </Animated.ScrollView>
      {showHeader ? (
        <Animated.View
          style={[
            styles.floatingHeader,
            {
              height: insets.top + 56,
              opacity: headerOpacity,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Brand compact />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function Eyebrow({ children }: React.PropsWithChildren) {
  const colors = useColors();
  return <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function Title({
  children,
  light = false,
}: React.PropsWithChildren<{ light?: boolean }>) {
  const colors = useColors();
  return (
    <Text
      style={[
        styles.title,
        light && styles.titleLight,
        { color: colors.foreground },
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  icon,
  variant = 'primary',
  borderless = false,
  compact = false,
  translucent = false,
  loading,
  disabled,
  ...props
}: PressableProps & {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary';
    borderless?: boolean;
    compact?: boolean;
    translucent?: boolean;
  loading?: boolean;
}) {
  const colors = useColors();
  const isDisabled = !!disabled || !!loading;
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: primary ? colors.primary : colors.secondary,
          borderColor: primary ? colors.primary : colors.border,
          borderWidth: borderless ? 0 : 1,
          opacity: isDisabled ? 0.45 : pressed ? 0.68 : translucent ? 0.84 : 1,
        },
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryForeground : colors.foreground} />
      ) : (
        <>
          {icon ? (
            <Feather
              name={icon}
              size={17}
              color={primary ? colors.primaryForeground : colors.foreground}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: primary ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function LoadingState() {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.foreground} />
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading Arcform</Text>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={24} color={colors.foreground} />
      <Text style={[styles.body, { color: colors.foreground }]}>We couldn’t load this yet.</Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export const type = StyleSheet.create({
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  metric: { fontFamily: 'Inter_500Medium', fontSize: 34, letterSpacing: -1.2 },
  heading: { fontFamily: 'Inter_500Medium', fontSize: 20, letterSpacing: -0.4 },
});

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  screenScroll: { flex: 1 },
  screen: { paddingHorizontal: 18, gap: 16 },
  floatingHeader: {
    position: 'absolute',
    pointerEvents: 'none',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 10,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontFamily: 'Inter_400Regular', letterSpacing: -1.5 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: 'Inter_500Medium', fontSize: 32, lineHeight: 37, letterSpacing: -1.1 },
  titleLight: { fontFamily: 'Inter_300Light' },
  card: { borderWidth: 1, borderRadius: 16, padding: 18 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 18,
  },
  buttonCompact: {
    alignSelf: 'center',
    minHeight: 42,
    paddingHorizontal: 24,
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  center: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});