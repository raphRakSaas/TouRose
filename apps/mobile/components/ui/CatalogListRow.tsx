import { Pressable, Text, View } from 'react-native';

import { ImagePlaceholder } from './ImagePlaceholder';

type CatalogListRowProps = {
  title: string;
  subtitle: string;
  imageLabel: string;
  onPress?: () => void;
  showDivider?: boolean;
  thumbSize?: number;
};

export function CatalogListRow({
  title,
  subtitle,
  imageLabel,
  onPress,
  showDivider = true,
  thumbSize = 64,
}: CatalogListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row gap-3.5 py-3 ${showDivider ? 'border-b border-sand-200' : ''}`}
    >
      <ImagePlaceholder
        label={imageLabel}
        className="shrink-0 rounded-xl"
        height={thumbSize}
        width={thumbSize}
      />
      <View className="flex-1 justify-center">
        <Text className="mb-0.5 text-[15px] font-body-semibold text-ink-800">{title}</Text>
        <Text className="text-[13px] font-body text-ink-500">{subtitle}</Text>
      </View>
    </Pressable>
  );
}
