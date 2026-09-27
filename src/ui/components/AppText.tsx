import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, useTheme } from '@/ui/theme';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';

interface AppTextProps extends TextProps {
  readonly variant?: Variant;
  readonly tone?: 'primary' | 'secondary' | 'accent' | 'success';
}

/** Text with the app's type scale and colours. */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  const { palette } = useTheme();
  const color = {
    primary: palette.text,
    secondary: palette.textSecondary,
    accent: palette.accent,
    success: palette.success,
  }[tone];
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

const styles = StyleSheet.create<Record<Variant, TextStyle>>({
  title: { fontFamily: fonts.title, fontSize: 34, lineHeight: 40, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
});
