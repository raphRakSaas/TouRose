import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

export default function MapScreen() {
  return (
    <View className="flex-1 bg-garonne-100">
      <View className="absolute inset-0 bg-garonne-200/60" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row gap-2 px-5 pt-3.5">
          <Chip label="Ce week-end" tone="white" />
          <Chip label="Gratuit" tone="white" />
        </View>

        <View className="relative flex-1">
          <View className="absolute left-[120px] top-[120px] h-4 w-4">
            <View className="absolute -inset-3.5 rounded-full bg-brick-500/40" />
            <View className="h-4 w-4 rounded-full border-[3px] border-white bg-brick-500" />
          </View>
          <View className="absolute left-[220px] top-[220px] h-[34px] w-[34px] items-center justify-center rounded-full border-[3px] border-white bg-garonne-700">
            <Text className="text-[12px] font-body-bold text-white">+5</Text>
          </View>
          <View className="absolute left-[70px] top-[340px]">
            <FontAwesome name="map-marker" size={28} color="#8B5EAD" />
          </View>

          <View className="absolute bottom-[140px] right-5 h-11 w-11 items-center justify-center rounded-full bg-white">
            <FontAwesome name="crosshairs" size={18} color="#1F1C19" />
          </View>
        </View>

        <Link href="/place/jardin-fictif-des-briques" asChild>
          <Pressable className="rounded-t-3xl bg-sand-50 px-5 pb-5 pt-4">
            <View className="flex-row gap-3">
              <ImagePlaceholder
                label="Place du Capitole"
                className="rounded-xl"
                height={56}
                width={56}
              />
              <View className="justify-center">
                <Text className="text-[15px] font-body-semibold text-ink-800">
                  Place du Capitole
                </Text>
                <Text className="text-[13px] font-body text-ink-500">
                  Monument · à 8 min à pied
                </Text>
              </View>
            </View>
          </Pressable>
        </Link>
      </SafeAreaView>
    </View>
  );
}
