import { useState } from 'react';
import {
  Image,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ImagePlaceholderProps = {
  label: string;
  /** Vraie photo : si fournie, remplace le dégradé placeholder. */
  source?: ImageSourcePropType;
  className?: string;
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
};

const GRADIENTS = [
  ['#D3E6E9', '#6FA9B2'],
  ['#F5E4DC', '#C45C3E'],
  ['#EDE4F4', '#8B5EAD'],
  ['#F5EEE3', '#A88B63'],
];

function GradientPlaceholder({
  label,
  className,
  height,
  width,
  style,
}: Omit<ImagePlaceholderProps, 'source'>) {
  const hash = label.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [fromColor, toColor] = GRADIENTS[hash % GRADIENTS.length];

  return (
    <View
      className={`overflow-hidden ${className}`}
      style={[{ height, width, backgroundColor: fromColor }, style]}
    >
      <View className="absolute inset-0" style={{ backgroundColor: toColor, opacity: 0.35 }} />
      <View className="flex-1 items-center justify-center px-3">
        <Text
          className="text-center text-[11px] font-body-semibold text-ink-800/70"
          numberOfLines={3}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

export function ImagePlaceholder({
  label,
  source,
  className = '',
  height,
  width,
  style,
}: ImagePlaceholderProps) {
  const [hasLoadError, setHasLoadError] = useState(false);

  if (!source || hasLoadError) {
    return (
      <GradientPlaceholder
        label={label}
        className={className}
        height={height}
        width={width}
        style={style}
      />
    );
  }

  return (
    <View className={`overflow-hidden ${className}`} style={[{ height, width }, style]}>
      <Image
        source={source}
        accessibilityLabel={label}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
        onError={() => setHasLoadError(true)}
      />
    </View>
  );
}
