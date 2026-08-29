import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';
import { EditorProject } from '../domain/editor';
import { EditorShell } from './EditorShell';

function createReviewProject():EditorProject{
  const project=createLuisTenByElevenKitchen();
  return{
    ...project,
    name:'Kitchen AI — Professional 3D Review',
    selectedId:undefined,
    viewMode:'3d',
  };
}

export function LuisKitchenReviewApp() {
  const [project, setProject] = useState<EditorProject>(createReviewProject);
  return <SafeAreaProvider>
    <StatusBar style="light" />
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <EditorShell
        initialProject={project}
        onProjectChange={setProject}
        onExit={() => undefined}
      />
    </SafeAreaView>
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#17211F' },
});
