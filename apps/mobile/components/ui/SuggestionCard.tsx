import { Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { ImagePlaceholder } from './ImagePlaceholder';

type SuggestionCardProps = {
  title: string;
  reason: string;
  badge: string;
  badgeColor: string;
  imageLabel: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
};

export function SuggestionCard({
  title,
  reason,
  badge,
  badgeColor,
  imageLabel,
  imageSource,
  onPress,
}: SuggestionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="overflow-hidden rounded-3xl bg-white"
      style={{
        shadowColor: '#1F1C19',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="relative h-[150px]">
        <ImagePlaceholder
          label={imageLabel}
          source={imageSource}
          className="absolute inset-0"
          height={150}
        />
        <View className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1">
          <Text className="text-[11px] font-body-bold" style={{ color: badgeColor }}>
            {badge}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="mb-1 font-display text-[18px] text-ink-800">{title}</Text>
        <Text className="text-[14px] font-body text-ink-500">{reason}</Text>
      </View>
    </Pressable>
  );
}
