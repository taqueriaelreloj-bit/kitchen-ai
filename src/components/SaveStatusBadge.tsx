import { StyleSheet, Text, View } from 'react-native';
import { ProjectSaveStatus } from '../hooks/useProjectPersistence';

export function SaveStatusBadge({status,compact=false}:{status:ProjectSaveStatus;compact?:boolean}){
  const symbol=status.state==='saved'?'✓':status.state==='saving'?'↻':'!';
  const accessibilityLabel=status.state==='error'&&status.error?`${status.label}. ${status.error}`:status.label;
  return <View accessibilityRole="status" accessibilityLabel={accessibilityLabel} style={[s.badge,status.state==='saved'&&s.saved,status.state==='saving'&&s.saving,status.state==='error'&&s.error,compact&&s.compact]}>
    <Text style={[s.symbol,status.state==='error'&&s.errorText]}>{symbol}</Text>
    <Text numberOfLines={1} style={[s.label,status.state==='error'&&s.errorText]}>{status.label}</Text>
  </View>;
}

const s=StyleSheet.create({
  badge:{minHeight:28,maxWidth:170,borderWidth:1,borderColor:'#667A73',borderRadius:8,backgroundColor:'#24312D',paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5},
  saved:{borderColor:'#6FA58F',backgroundColor:'#1E3A31'},
  saving:{borderColor:'#A58D55',backgroundColor:'#3A3322'},
  error:{borderColor:'#C57972',backgroundColor:'#472925'},
  compact:{minHeight:24,paddingHorizontal:6},
  symbol:{fontSize:11,fontWeight:'900',color:'#DCE9E4'},
  label:{flexShrink:1,fontSize:10,fontWeight:'800',color:'#DCE9E4'},
  errorText:{color:'#FFDAD5'},
});
