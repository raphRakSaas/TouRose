import { forwardRef } from 'react';
import { Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { ImagePlaceholder } from './ImagePlaceholder';

type EventCompactCardProps = {
  title: string;
  reason: string;
  badge: string;
  badgeColor: string;
  imageLabel: string;
  imageSource?: ImageSourcePropType;
  imageAttribution?: string | null;
  onPress?: () => void;
  width?: number;
};

export const EventCompactCard = forwardRef<View, EventCompactCardProps>(function EventCompactCard(
  {
    title,
    reason,
    badge,
    badgeColor,
    imageLabel,
    imageSource,
    imageAttribution,
    onPress,
    width = 160,
  },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        width,
        shadowColor: '#1F1C19',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View className="relative" style={{ height: 110 }}>
        <ImagePlaceholder label={imageLabel} source={imageSource} height={110} width={width} />
        <View className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5">
          <Text className="text-[10px] font-body-bold" style={{ color: badgeColor }}>
            {badge}
          </Text>
        </View>
      </View>
      <View className="gap-0.5 p-2.5">
        <Text className="font-display text-[15px] text-ink-800" numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-[12px] font-body text-ink-500" numberOfLines={2}>
          {reason}
        </Text>
        {imageAttribution ? (
          <Text className="mt-1 text-[9px] font-body text-ink-300" numberOfLines={1}>
            {imageAttribution}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
