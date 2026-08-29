import { StyleSheet, View } from 'react-native';
import { isGasRangeObject } from '../domain/applianceCatalog';
import { EditorObject } from '../domain/editor';

const burnerPositions = [
  { left: '13%', top: '16%' },
  { left: '13%', top: '56%' },
  { right: '13%', top: '16%' },
  { right: '13%', top: '56%' },
] as const;

export function GasRangePlanGraphic({ object }: { object: EditorObject }) {
  if (!isGasRangeObject(object)) return null;
  return <View pointerEvents="none" style={styles.root}>
    <View style={styles.cooktop}>
      {burnerPositions.map((position, index) => <View key={index} style={[styles.burner, position]}><View style={styles.burnerCore}/></View>)}
      {object.hasCenterGriddle && <View style={styles.griddle}><View style={styles.griddleHandle}/></View>}
    </View>
    <View style={styles.front}><View style={styles.frontHandle}/></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 2, opacity: .92 },
  cooktop: { flex: 1, borderRadius: 2, borderWidth: 1, borderColor: '#454D4B', backgroundColor: '#B8BDBB', overflow: 'hidden' },
  burner: { position: 'absolute', width: '20%', aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: '#1D2221', backgroundColor: '#555D5B', alignItems: 'center', justifyContent: 'center' },
  burnerCore: { width: '35%', aspectRatio: 1, borderRadius: 999, backgroundColor: '#A47A34' },
  griddle: { position: 'absolute', left: '39%', top: '10%', width: '22%', height: '72%', borderRadius: 2, borderWidth: 1, borderColor: '#171B1A', backgroundColor: '#3B4140' },
  griddleHandle: { position: 'absolute', left: '18%', right: '18%', bottom: 2, height: 2, borderRadius: 2, backgroundColor: '#D8DCDB' },
  front: { position: 'absolute', left: 4, right: 4, bottom: 2, height: 3, backgroundColor: '#252B29' },
  frontHandle: { position: 'absolute', left: '20%', right: '20%', bottom: -1, height: 2, borderRadius: 2, backgroundColor: '#E1E4E3' },
});
