import { router } from 'expo-router';
import Head from 'expo-router/head';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useHydrated } from '@/platform/use-hydrated';
import { useSettingsStore, type LanguageSetting, type ThemeSetting } from '@/state/settings-store';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { Screen } from '@/ui/components/Screen';
import { radius, spacing, useTheme } from '@/ui/theme';

/** Vibration only exists in the native app: Safari and other browsers cannot vibrate. */
const HAS_VIBRATION = Platform.OS === 'ios' || Platform.OS === 'android';

/** Language names in their own language, as players look for them. */
const LANGUAGE_NAMES = { es: 'Español', en: 'English', fr: 'Français' } as const;

export default function SettingsScreen() {
  const t = useStrings();
  const hydrated = useHydrated();
  const settings = useSettingsStore();
  // Stored values only after hydration, so the static web render matches.
  const { vibration, showTimer, theme, language } = hydrated
    ? settings
    : { vibration: true, showTimer: false, theme: 'system' as const, language: 'system' as const };

  return (
    <Screen>
      <Head>
        <title>{`${t.settings.title} · ${t.appName}`}</title>
      </Head>
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label={t.actions.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <AppText variant="heading" accessibilityRole="header" style={styles.title}>
          {t.settings.title}
        </AppText>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title={t.settings.game}>
          {HAS_VIBRATION && (
            <SwitchRow
              label={t.settings.vibration}
              value={vibration}
              onChange={(value) => settings.update({ vibration: value })}
            />
          )}
          <SwitchRow
            label={t.settings.showTimer}
            value={showTimer}
            onChange={(value) => settings.update({ showTimer: value })}
          />
        </Section>

        <Section title={t.settings.theme}>
          <Choice<ThemeSetting>
            label={t.settings.theme}
            value={theme}
            options={[
              { value: 'system', label: t.settings.themes.system },
              { value: 'light', label: t.settings.themes.light },
              { value: 'dark', label: t.settings.themes.dark },
            ]}
            onChange={(value) => settings.update({ theme: value })}
          />
        </Section>

        <Section title={t.settings.language}>
          <Choice<LanguageSetting>
            label={t.settings.language}
            value={language}
            options={[
              { value: 'system', label: t.settings.languageSystem },
              { value: 'es', label: LANGUAGE_NAMES.es },
              { value: 'en', label: LANGUAGE_NAMES.en },
              { value: 'fr', label: LANGUAGE_NAMES.fr },
            ]}
            onChange={(value) => settings.update({ language: value })}
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.section}>
      <AppText variant="caption" tone="secondary" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.tileBorder }]}>
        {children}
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: palette.board, true: palette.success }}
        thumbColor={palette.tile}
      />
    </View>
  );
}

/** Segmented choice, announced as a group of radio buttons. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choice}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked }}
            aria-checked={checked}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: checked ? palette.text : pressed ? palette.surfacePressed : palette.cell,
                borderColor: checked ? palette.text : palette.tileBorder,
              },
            ]}>
            <AppText
              variant="label"
              maxFontSizeMultiplier={1.4}
              style={{ color: checked ? palette.background : palette.text }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  title: { flex: 1, textAlign: 'center' },
  topBarSpacer: { minWidth: 64 },
  content: { paddingVertical: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  rowLabel: { flex: 1 },
  choice: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
