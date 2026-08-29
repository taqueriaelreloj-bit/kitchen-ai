import { StyleSheet, Text, View } from 'react-native';
import { autosaveStatusLabel, AutosaveStatus } from '../domain/projectAutosave';

export function AutosaveStatusBadge({status}:{status:AutosaveStatus}){
  const tone=status.phase==='error'?'error':status.phase==='dirty'?'dirty':status.phase==='saving'?'saving':status.phase==='saved'?'saved':'idle';
  return <View accessibilityRole="status" accessibilityLabel={autosaveStatusLabel(status)} style={[s.badge,s[tone]]}><View style={[s.dot,s[`${tone}Dot`]]}/><Text numberOfLines={1} style={[s.text,tone==='error'&&s.errorText]}>{autosaveStatusLabel(status)}</Text></View>;
}

const s=StyleSheet.create({badge:{minHeight:28,maxWidth:220,borderWidth:1,borderRadius:14,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#F3F6F5',borderColor:'#C6D0CC'},dot:{width:7,height:7,borderRadius:4,backgroundColor:'#899691'},text:{fontSize:10,fontWeight:'800',color:'#42524C'},idle:{},idleDot:{backgroundColor:'#899691'},dirty:{backgroundColor:'#FFF8E8',borderColor:'#D9C48A'},dirtyDot:{backgroundColor:'#B88720'},saving:{backgroundColor:'#EDF4FA',borderColor:'#AFC5D7'},savingDot:{backgroundColor:'#3978A8'},saved:{backgroundColor:'#EAF4F0',borderColor:'#9DBBAD'},savedDot:{backgroundColor:'#2E7B63'},error:{backgroundColor:'#FFF0EF',borderColor:'#D4A19D'},errorDot:{backgroundColor:'#AF3E36'},errorText:{color:'#8E302A'}});
