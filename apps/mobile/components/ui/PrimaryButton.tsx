import { Pressable, Text, type PressableProps } from 'react-native';

type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: 'solid' | 'outline';
};

export function PrimaryButton({
  label,
  variant = 'solid',
  disabled,
  ...pressableProps
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center rounded-lg px-[26px] py-[13px] ${
        isOutline ? 'border-[1.5px] border-brick-500 bg-transparent' : 'bg-brick-500'
      } ${disabled ? 'opacity-50' : ''}`}
      {...pressableProps}
    >
      <Text
        className={`text-[15px] font-body-semibold ${
          isOutline ? 'text-brick-700' : 'text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
