import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui/theme';

/** Deduction depth (1–3) as filled dots: difficulty's second axis, next to size. */
export function DepthDots({ depth, size = 7 }: { readonly depth: number; readonly size?: number }) {
  const { palette } = useTheme();
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((d) => (
        <View
          key={d}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: d <= depth ? palette.accent : palette.board,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 4 },
});
