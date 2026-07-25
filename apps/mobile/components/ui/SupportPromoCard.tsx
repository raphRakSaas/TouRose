import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { enterFadeInUp, useReducedMotion } from '@/src/lib/motion';
import { SUPPORT_AMOUNT_OPTIONS, type SupportAmountCents } from '@/src/lib/support-amounts';

const CARD_RADIUS = 24;

type SupportPromoCardProps = {
  onAmountPress: (amountCents: SupportAmountCents) => void;
  onLearnMorePress: () => void;
  isProcessing?: boolean;
};

export function SupportPromoCard({
  onAmountPress,
  onLearnMorePress,
  isProcessing = false,
}: SupportPromoCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      testID="support-promo-card"
      entering={enterFadeInUp(0, reduceMotion)}
      className="mx-5 mb-6"
      style={{
        borderRadius: CARD_RADIUS,
        borderWidth: 1,
        borderColor: 'rgba(196, 92, 62, 0.18)',
        shadowColor: '#8B3D2E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['#F3D5C8', '#FBF1EC', '#FBF8F4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: CARD_RADIUS,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 18,
        }}
      >
        <View className="mb-4 flex-row items-start gap-3.5">
          <Animated.View
            entering={enterFadeInUp(1, reduceMotion)}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-brick-500"
          >
            <FontAwesome name="heart" size={18} color="#FBF1EC" />
          </Animated.View>
          <Animated.View entering={enterFadeInUp(2, reduceMotion)} className="min-w-0 flex-1">
            <Text className="font-display text-[20px] leading-tight text-brick-900">
              Envie de poser une brique ?
            </Text>
            <Text className="mt-1.5 text-[14px] leading-[1.55] font-body text-ink-600">
              TouRose est gratuit et sans pub. Un petit coup de pouce aide à faire vivre l’app.
            </Text>
          </Animated.View>
        </View>

        <View className="flex-row gap-3">
          {SUPPORT_AMOUNT_OPTIONS.map((option, optionIndex) => (
            <Animated.View
              key={option.amountCents}
              entering={enterFadeInUp(optionIndex + 3, reduceMotion)}
              className="min-w-0 flex-1"
            >
              <PressableScale
                testID={`support-amount-${option.amountCents}`}
                accessibilityRole="button"
                accessibilityLabel={`Soutenir ${option.amount}`}
                disabled={isProcessing}
                onPress={() => onAmountPress(option.amountCents)}
                className={`items-center rounded-[18px] bg-white px-2 py-3.5 ${
                  isProcessing ? 'opacity-60' : ''
                }`}
                style={{
                  shadowColor: '#1F1C19',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Text className="font-display text-[18px] text-brick-900">{option.amount}</Text>
                <Text className="mt-1 text-center text-[10px] leading-tight font-body text-ink-500">
                  {option.amountCents === 100
                    ? 'Café'
                    : option.amountCents === 500
                      ? 'Chocolatine'
                      : 'Brique'}
                </Text>
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={enterFadeInUp(6, reduceMotion)}>
          <Pressable
            accessibilityRole="button"
            testID="support-learn-more"
            onPress={onLearnMorePress}
            className="mt-4 self-center px-2 py-1.5"
          >
            <Text className="text-[13px] font-body-semibold text-brick-700">
              Pourquoi soutenir ? →
            </Text>
          </Pressable>

          <Text className="mt-1 text-center text-[11px] leading-[1.5] font-body text-ink-400">
            Aucun avantage débloqué — juste un merci sincère.
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}
