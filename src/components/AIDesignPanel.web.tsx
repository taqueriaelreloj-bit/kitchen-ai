import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { EditorProject } from '../domain/editor';
import { Button } from './EditorPanels.web';

export function AIDesignPanel({project,apply}:{project:EditorProject;apply:(project:EditorProject)=>void}){
  const suggestions=aiDesignSuggestions(project);
  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>AI Design</Text>
    <Text style={s.help}>Generate kitchen layouts from the scanned room. Walls, doors and windows stay in place. Applying a suggestion is one Undo step.</Text>
    {suggestions.map((suggestion,index)=><View key={suggestion.id} style={s.card}>
      <Text style={s.option}>OPTION {index+1}</Text>
      <Text style={s.name}>{suggestion.name}</Text>
      <Text style={s.description}>{suggestion.description}</Text>
      <Text style={s.meta}>{suggestion.layout} · {suggestion.style} · {suggestion.includesIsland?'Island included':'No island'}</Text>
      <Button label="Apply This Design" onPress={()=>apply(applyAIDesignSuggestion(project,suggestion))}/>
    </View>)}
    <Text style={s.note}>AI suggestions are editable. After applying one, move cabinets, change finishes, adjust the island or use Undo to return to the previous layout.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:20},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:12},card:{borderWidth:1,borderColor:'#CBD5D1',backgroundColor:'#fff',borderRadius:10,padding:11,marginBottom:10},option:{fontSize:10,fontWeight:'900',color:'#507C6E'},name:{fontSize:15,fontWeight:'900',color:'#1F2E29',marginTop:3},description:{fontSize:12,lineHeight:18,color:'#596963',marginVertical:6},meta:{fontSize:11,fontWeight:'800',color:'#3E514A',marginBottom:8,textTransform:'capitalize'},note:{fontSize:12,lineHeight:18,color:'#66736E',marginTop:4}});
