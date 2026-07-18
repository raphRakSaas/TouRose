import { Pressable, Text, type PressableProps } from 'react-native';

type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
  tone?: 'solid' | 'cream' | 'white';
};

export function Chip({ label, selected = false, tone = 'cream', ...pressableProps }: ChipProps) {
  const baseClass =
    tone === 'white'
      ? 'bg-white'
      : selected || tone === 'solid'
        ? 'bg-brick-500'
        : 'bg-sand-100';
  const textClass =
    selected || tone === 'solid' ? 'text-white font-body-semibold' : 'text-ink-800 font-body';

  return (
    <Pressable
      accessibilityRole="button"
      className={`shrink-0 rounded-full px-4 py-2 ${baseClass}`}
      {...pressableProps}
    >
      <Text className={`text-[13px] ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
