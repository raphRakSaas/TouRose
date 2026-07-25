import { router } from 'expo-router';
import { View } from 'react-native';

import { SupportThankYou } from '@/components/ui/SupportThankYou';

export default function SupportSuccessScreen() {
  return (
    <View testID="support-success-screen" style={{ flex: 1, backgroundColor: '#FBF8F4' }}>
      <SupportThankYou onContinuePress={() => router.replace('/(tabs)/for-me')} />
    </View>
  );
}
