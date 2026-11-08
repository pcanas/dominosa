import { StyleSheet, View, type ViewStyle } from 'react-native';

import { pipDiameter, pipLayout } from './pips';

interface PipFaceProps {
  readonly value: number;
  /** Where the face goes; the dots sit in the largest square centred in it. */
  readonly style: Pick<ViewStyle, 'left' | 'top' | 'position'> & {
    readonly width: number;
    readonly height: number;
  };
  readonly color: string;
  /** Share of the box the square face takes (1 fills the shorter side). */
  readonly scale?: number;
}

/** A value drawn as domino pips. Purely visual: whoever shows it also says the number. */
export function PipFace({ value, style, color, scale = 1 }: PipFaceProps) {
  const face = Math.min(style.width, style.height) * scale;
  const dot = pipDiameter(face);
  const left = (style.width - face) / 2;
  const top = (style.height - face) / 2;
  return (
    <View pointerEvents="none" aria-hidden style={[styles.face, style]}>
      {pipLayout(value).map(([x, y], i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: left + x * face - dot / 2,
              top: top + y * face - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { overflow: 'visible' },
  dot: { position: 'absolute' },
});
