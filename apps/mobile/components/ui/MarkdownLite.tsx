import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

type MarkdownLiteProps = {
  content: string;
};

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'link'; label: string; url: string };

const INLINE_PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

function tokenizeInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(INLINE_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({ kind: 'text', value: line.slice(lastIndex, matchIndex) });
    }
    if (match[1] !== undefined) {
      tokens.push({ kind: 'bold', value: match[1] });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      tokens.push({ kind: 'link', label: match[2], url: match[3] });
    }
    lastIndex = matchIndex + match[0].length;
  }
  if (lastIndex < line.length) {
    tokens.push({ kind: 'text', value: line.slice(lastIndex) });
  }
  return tokens;
}

function InlineText({ line, className }: { line: string; className: string }) {
  const tokens = tokenizeInline(line);
  return (
    <Text className={className}>
      {tokens.map((token, tokenIndex) => {
        if (token.kind === 'bold') {
          return (
            <Text key={tokenIndex} className="font-body-semibold text-ink-800">
              {token.value}
            </Text>
          );
        }
        if (token.kind === 'link') {
          return (
            <Text
              key={tokenIndex}
              className="font-body-semibold text-brick-700 underline"
              onPress={() => void WebBrowser.openBrowserAsync(token.url)}
            >
              {token.label}
            </Text>
          );
        }
        return token.value;
      })}
    </Text>
  );
}

/**
 * Rendu minimaliste du markdown OpenAgenda : titres, listes à puces,
 * gras et liens cliquables. Suffisant pour les longDescription d'événements.
 */
export function MarkdownLite({ content }: MarkdownLiteProps) {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return (
    <View className="gap-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const isBulletList = lines.every((line) => /^[-*•]\s+/.test(line));

        if (isBulletList) {
          return (
            <View key={blockIndex} className="gap-1.5">
              {lines.map((line, lineIndex) => (
                <View key={lineIndex} className="flex-row gap-2">
                  <Text className="text-[15px] leading-[1.6] font-body text-brick-500">•</Text>
                  <View className="flex-1">
                    <InlineText
                      line={line.replace(/^[-*•]\s+/, '')}
                      className="text-[15px] leading-[1.6] font-body text-ink-800"
                    />
                  </View>
                </View>
              ))}
            </View>
          );
        }

        const headingMatch = lines.length === 1 ? lines[0].match(/^(#{1,4})\s+(.*)$/) : null;
        if (headingMatch) {
          return (
            <InlineText
              key={blockIndex}
              line={headingMatch[2]}
              className="font-display text-[17px] text-ink-800"
            />
          );
        }

        return (
          <InlineText
            key={blockIndex}
            line={lines.join('\n')}
            className="text-[15px] leading-[1.7] font-body text-ink-800"
          />
        );
      })}
    </View>
  );
}
