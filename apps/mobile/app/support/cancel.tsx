import { Stack, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

export default function SupportCancelScreen() {
  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-3 text-center font-display text-2xl text-ink-800">
          Paiement annulé
        </Text>
        <Text className="mb-6 text-center text-[15px] leading-[1.7] font-body text-ink-500">
          Aucun montant n’a été débité. Tu pourras soutenir TouRose quand tu veux.
        </Text>
        <View className="w-full">
          <PrimaryButton
            label="Retour"
            variant="outline"
            onPress={() => router.replace('/(tabs)/for-me')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
