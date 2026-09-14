import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { Redirect, Tabs, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetAuthProfile, setAuthTokenGetter } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ErrorState, type } from '@/components/ui';

const tabs = [
  { name: 'index', label: 'Home', sf: 'house', selected: 'house.fill', icon: 'home' },
  { name: 'plan', label: 'Training', sf: 'dumbbell', selected: 'dumbbell', icon: 'activity' },
  { name: 'form', label: 'Form', sf: 'camera', selected: 'camera.fill', icon: 'camera' },
  { name: 'meal', label: 'Meal', sf: 'fork.knife', selected: 'fork.knife', icon: 'pie-chart' },
  { name: 'coach', label: 'Coach', sf: 'message', selected: 'message.fill', icon: 'message-circle' },
  { name: 'profile', label: 'Profile', sf: 'person', selected: 'person.fill', icon: 'user' },
] as const;

type FloatingMenuProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
  };
};

function FloatingMenu({ state, navigation }: FloatingMenuProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const menuProgress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        menuProgress.setValue(open ? 1 : 0);
        return;
      }
      animation = Animated.spring(menuProgress, {
        toValue: open ? 1 : 0,
        damping: 18,
        stiffness: 230,
        mass: 0.72,
        useNativeDriver: true,
      });
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [menuProgress, open]);

  return (
    <View pointerEvents="box-none" style={styles.menuLayer}>
      {open ? <Pressable accessibilityLabel="Close navigation menu" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} /> : null}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.menuPanel,
          {
            top: insets.top + 62,
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: menuProgress,
            transform: [
              { translateY: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const config = tabs.find((tab) => tab.name === route.name);
          if (!config) return null;
          const active = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                navigation.navigate(route.name);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name={config.icon} size={17} strokeWidth={1.5} color={active ? colors.primaryForeground : colors.foreground} />
              <Text style={[type.body, { color: active ? colors.primaryForeground : colors.foreground }]}>{config.label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close menu' : 'Open menu'}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.menuButton,
          {
            top: insets.top + 7,
            backgroundColor: 'transparent',
            opacity: pressed ? 0.55 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{
              rotate: menuProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '90deg'],
              }),
            }],
          }}
        >
          <Feather name="menu" size={24} strokeWidth={1.4} color={colors.foreground} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <FloatingMenu {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          name={tab.name}
          key={tab.name}
          options={{
            title: tab.label,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn, getToken } = useAuth();
  const profile = useGetAuthProfile();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (profile.isError) {
    if ((profile.error as { status?: number }).status === 404) return <Redirect href="/onboarding" />;
    return <ErrorState onRetry={() => profile.refetch()} />;
  }
  if (profile.isPending) return null;
  if (profile.data.role === 'trainer') return <Redirect href={'/trainer' as Href} />;
  return <AppTabs />;
}

const styles = StyleSheet.create({
  menuLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  menuPanel: {
    position: 'absolute',
    right: 18,
    width: 210,
    borderWidth: 1,
    borderRadius: 24,
    padding: 8,
    gap: 3,
  },
  menuItem: {
    minHeight: 43,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    position: 'absolute',
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});