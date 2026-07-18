import { forwardRef } from 'react';
import { Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { ImagePlaceholder } from './ImagePlaceholder';

type SuggestionCardProps = {
  title: string;
  reason: string;
  badge: string;
  badgeColor: string;
  imageLabel: string;
  imageSource?: ImageSourcePropType;
  imageAttribution?: string | null;
  onPress?: () => void;
};

export const SuggestionCard = forwardRef<View, SuggestionCardProps>(function SuggestionCard(
  { title, reason, badge, badgeColor, imageLabel, imageSource, imageAttribution, onPress },
  ref,
) {
  return (
    <Pressable
      ref={ref}
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
      <View className="relative h-[170px]">
        <ImagePlaceholder
          label={imageLabel}
          source={imageSource}
          className="absolute inset-0"
          height={170}
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
        {imageAttribution ? (
          <Text className="mt-1.5 text-[10px] font-body text-ink-300" numberOfLines={1}>
            {imageAttribution}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
