import { useState } from 'react';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getListTrainerClientsQueryKey,
  useLinkTrainerClient,
  useListTrainerClients,
} from '@workspace/api-client-react';
import { Button, Card, ErrorState, LoadingState, Screen, Title, type } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

function apiMessage(error: unknown) {
  return (error as { data?: { error?: string } }).data?.error
    ?? 'That code could not be linked. Check the six digits and try again.';
}

export default function TrainerRoster() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const clients = useListTrainerClients();
  const linkClient = useLinkTrainerClient();
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const count = clients.data?.length ?? 0;
  const atCapacity = count >= 25;

  const link = async () => {
    setMessage('');
    try {
      const linked = await linkClient.mutateAsync({ data: { code } });
      await queryClient.invalidateQueries({ queryKey: getListTrainerClientsQueryKey() });
      setCode('');
      setAdding(false);
      setMessage(`${linked.name} is now one of your athletes.`);
    } catch (error) {
      setMessage(apiMessage(error));
    }
  };

  if (clients.isPending) return <LoadingState />;
  if (clients.isError) return <ErrorState onRetry={() => clients.refetch()} />;

  return (
    <Screen showHeader={false} refresh={{ refreshing: clients.isRefetching, onRefresh: clients.refetch }}>
      <View style={styles.header}>
        <Text style={[type.muted, { color: colors.mutedForeground }]}>Trainer workspace</Text>
        <Pressable accessibilityLabel="Sign out" onPress={() => signOut()} hitSlop={12}>
          <Feather name="log-out" size={21} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Title>Athletes</Title>
          <Text style={[type.body, { color: colors.mutedForeground }]}>{count} / 25 athletes managed</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add athlete invite code"
          disabled={atCapacity}
          onPress={() => setAdding((value) => !value)}
          style={{ opacity: atCapacity ? 0.35 : 1 }}
        >
          <Feather name={adding ? 'x' : 'user-plus'} size={24} color={colors.foreground} />
        </Pressable>
      </View>
      {atCapacity ? <Text style={[type.muted, { color: colors.mutedForeground }]}>Athlete capacity reached. Existing athletes remain fully manageable.</Text> : null}
      {adding ? (
        <Card style={styles.inviteCard}>
          <Text style={[type.heading, { color: colors.foreground }]}>Link an athlete</Text>
          <Text style={[type.muted, { color: colors.mutedForeground }]}>Enter the six-digit code generated in the athlete’s profile.</Text>
          <TextInput
            testID="trainer-invite-code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.codeInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
          />
          <Button testID="link-athlete" title="Link athlete" loading={linkClient.isPending} disabled={code.length !== 6} onPress={link} />
        </Card>
      ) : null}
      {message ? <Text accessibilityLiveRegion="polite" style={[type.muted, { color: colors.foreground }]}>{message}</Text> : null}
      <View style={styles.list}>
        {clients.data?.map((client) => (
          <Pressable key={client.id} onPress={() => router.push(`/trainer/${client.id}` as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card style={styles.clientCard}>
              <View style={styles.clientTop}>
                <View style={styles.clientIdentity}>
                  <Text style={[type.heading, { color: colors.foreground }]}>{client.name}</Text>
                  <Text numberOfLines={1} style={[type.muted, { color: colors.mutedForeground }]}>{client.email}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
              </View>
              <View style={styles.metrics}>
                <Text style={[type.label, { color: colors.foreground }]}>{client.adherence}% adherence</Text>
                <Text style={[type.label, { color: colors.success }]}>{client.streak} week streak</Text>
              </View>
            </Card>
          </Pressable>
        ))}
        {count === 0 ? (
          <Card style={styles.empty}>
            <Feather name="users" size={25} color={colors.mutedForeground} />
            <Text style={[type.body, { color: colors.foreground }]}>Your athlete list is empty.</Text>
            <Text style={[type.muted, { color: colors.mutedForeground }]}>Link your first athlete with their invite code.</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleCopy: { gap: 5 },
  inviteCard: { gap: 14 },
  codeInput: { height: 62, borderWidth: 1, borderRadius: 16, textAlign: 'center', fontFamily: 'Inter_500Medium', fontSize: 25, letterSpacing: 10 },
  list: { gap: 10 },
  clientCard: { gap: 16 },
  clientTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientIdentity: { flex: 1, gap: 3 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 8 },
});