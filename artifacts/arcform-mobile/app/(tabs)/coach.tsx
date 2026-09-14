import React, { useRef, useState } from 'react';
import { useChatWithCoach } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

type Message = { id: string; role: 'coach' | 'athlete'; text: string };

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'coach', text: 'What do you need help with today? Ask about your plan, a lift, recovery, or how a session felt.' },
  ]);
  const chat = useChatWithCoach();

  const send = () => {
    const message = text.trim();
    if (!message || chat.isPending) return;
    const athleteMessage: Message = { id: `${Date.now()}-a`, role: 'athlete', text: message };
    setMessages((current) => [athleteMessage, ...current]);
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    chat.mutate(
      { data: { message } },
      {
        onSuccess: (reply) => setMessages((current) => [{ id: `${Date.now()}-c`, role: 'coach', text: reply.message }, ...current]),
        onError: () => setMessages((current) => [{ id: `${Date.now()}-e`, role: 'coach', text: 'I couldn’t reach your training data. Try sending that again.' }, ...current]),
      },
    );
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 10) }]}>
        <Brand compact />
      </View>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={chat.isPending ? <Text style={[type.muted, styles.typing, { color: colors.mutedForeground }]}>Coach is thinking…</Text> : null}
        renderItem={({ item }) => (
          <View style={[styles.message, item.role === 'athlete' ? styles.athleteMessage : styles.coachMessage, { backgroundColor: item.role === 'athlete' ? colors.primary : colors.card, borderColor: colors.border }]}>
            <Text style={[type.body, { color: item.role === 'athlete' ? colors.primaryForeground : colors.foreground }]}>{item.text}</Text>
          </View>
        )}
      />
      <View style={[styles.composerWrap, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8), borderTopColor: colors.border }]}>
        <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Ask your coach"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={1200}
            style={[styles.input, { color: colors.foreground }]}
            testID="coach-input"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || chat.isPending}
            accessibilityLabel="Send message"
            testID="coach-send"
            style={({ pressed }) => [{ opacity: !text.trim() || chat.isPending ? 0.35 : pressed ? 0.65 : 1 }]}
          >
            <Feather name="arrow-up-circle" size={31} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 90, paddingHorizontal: 18, paddingBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  messages: { padding: 16, gap: 12 },
  message: { maxWidth: '88%', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18 },
  athleteMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  coachMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  typing: { paddingVertical: 8, paddingHorizontal: 4 },
  composerWrap: { borderTopWidth: 1, paddingHorizontal: 13, paddingTop: 10 },
  composer: { minHeight: 54, maxHeight: 130, borderWidth: 1, borderRadius: 18, paddingLeft: 15, paddingRight: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 34, maxHeight: 104, fontFamily: 'Inter_400Regular', fontSize: 16, paddingTop: 7, paddingBottom: 7 },
});