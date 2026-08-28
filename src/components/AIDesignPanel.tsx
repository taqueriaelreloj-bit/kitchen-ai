import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { EditorProject } from '../domain/editor';

function Button({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.button}><Text style={s.buttonText}>{label}</Text></Pressable>;
}

export function AIDesignPanel({project,apply}:{project:EditorProject;apply:(project:EditorProject)=>void}){
  const suggestions=aiDesignSuggestions(project);
  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>AI Design</Text>
    <Text style={s.help}>Create room-aware layouts from the same scanned kitchen model used on desktop. Walls, doors, windows and lighting stay in place.</Text>
    {suggestions.map((suggestion,index)=><View key={suggestion.id} style={s.card}>
      <Text style={s.option}>OPTION {index+1}</Text>
      <Text style={s.name}>{suggestion.name}</Text>
      <Text style={s.description}>{suggestion.description}</Text>
      <Text style={s.meta}>{suggestion.layout} · {suggestion.style} · {suggestion.includesIsland?'Island when clearance allows':'No island'}</Text>
      <Button label="Apply This Design" onPress={()=>apply(applyAIDesignSuggestion(project,suggestion))}/>
    </View>)}
    <Text style={s.note}>After applying a layout you can move cabinets, change finishes and use Undo to restore the previous design.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:24},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:12},card:{borderWidth:1,borderColor:'#CBD5D1',backgroundColor:'#fff',borderRadius:12,padding:12,marginBottom:10},option:{fontSize:10,fontWeight:'900',color:'#507C6E'},name:{fontSize:15,fontWeight:'900',color:'#1F2E29',marginTop:3},description:{fontSize:12,lineHeight:18,color:'#596963',marginVertical:6},meta:{fontSize:11,fontWeight:'800',color:'#3E514A',marginBottom:9,textTransform:'capitalize'},button:{minHeight:46,borderWidth:1,borderColor:'#91AAA2',borderRadius:10,backgroundColor:'#fff',paddingHorizontal:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:13,fontWeight:'800',color:'#21483D'},note:{fontSize:12,lineHeight:18,color:'#66736E',marginTop:4}});
