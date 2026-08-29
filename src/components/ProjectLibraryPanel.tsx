import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import {
  deleteProjectFromLibrary,
  duplicateProjectInLibrary,
  loadProjectLibrary,
  openProjectFromLibrary,
  ProjectLibraryEntry,
  ProjectStorage,
  renameProjectInLibrary,
  repairProjectLibrary,
  saveProjectToLibrary,
} from '../domain/projectLibrary';
import { asyncStorageProjectLibrary } from '../services/projectLibraryStorage';

type Props={currentProject:EditorProject;onOpen:(project:EditorProject)=>void;onSaved?:(project:EditorProject)=>void;storage?:ProjectStorage;compact?:boolean};
type Status={kind:'idle'|'working'|'success'|'error';message:string};

function Button({label,onPress,disabled=false,active=false}:{label:string;onPress:()=>void;disabled?:boolean;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled,selected:active}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}

export function ProjectLibraryPanel({currentProject,onOpen,onSaved,storage=asyncStorageProjectLibrary,compact=false}:Props){
  const[entries,setEntries]=useState<ProjectLibraryEntry[]>([]),[status,setStatus]=useState<Status>({kind:'idle',message:''}),[renameId,setRenameId]=useState<string>(),[renameText,setRenameText]=useState('');
  const refresh=async()=>setEntries(await loadProjectLibrary(storage));
  useEffect(()=>{refresh().catch(()=>setStatus({kind:'error',message:'Could not load the local project library.'}));},[storage]);
  const work=async<T,>(operation:()=>Promise<{ok:true;value:T}|{ok:false;message:string}>,success:string,after?:(value:T)=>void)=>{
    setStatus({kind:'working',message:'Working…'});
    const result=await operation();
    if(!result.ok){setStatus({kind:'error',message:result.message});return;}
    after?.(result.value);await refresh();setStatus({kind:'success',message:success});
  };
  const saveCurrent=()=>work(()=>saveProjectToLibrary(storage,currentProject),'Project saved to the local library.',()=>onSaved?.(currentProject));
  const openEntry=(entry:ProjectLibraryEntry)=>work(()=>openProjectFromLibrary(storage,entry.id),'Project opened.',onOpen);
  const duplicate=(entry:ProjectLibraryEntry)=>work(()=>duplicateProjectInLibrary(storage,entry.id),`${entry.name} duplicated.`);
  const rename=()=>{
    if(!renameId||!renameText.trim())return;
    work(()=>renameProjectInLibrary(storage,renameId,renameText),`Project renamed to ${renameText.trim()}.`,()=>{setRenameId(undefined);setRenameText('');});
  };
  const remove=(entry:ProjectLibraryEntry)=>Alert.alert('Delete local project?',`Delete ${entry.name} from this device?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>work(()=>deleteProjectFromLibrary(storage,entry.id),`${entry.name} deleted.`)}]);
  const repair=async()=>{setStatus({kind:'working',message:'Checking local projects…'});const valid=await repairProjectLibrary(storage);setEntries(valid);setStatus({kind:'success',message:`Library checked. ${valid.length} valid project${valid.length===1?'':'s'} available.`});};
  const content=<>
    <Text style={s.title}>Project Library</Text>
    <Text style={s.help}>Save multiple kitchens on this device. Open, duplicate, rename or delete projects without replacing the current design accidentally.</Text>
    <View style={s.current}><Text style={s.currentLabel}>CURRENT PROJECT</Text><Text numberOfLines={1} style={s.currentName}>{currentProject.name}</Text><Text style={s.currentMeta}>{currentProject.objects.length} objects · Updated {new Date(currentProject.updatedAt).toLocaleString()}</Text><Button label="Save Current Project" onPress={saveCurrent} disabled={status.kind==='working'}/></View>
    {status.message?<View accessibilityRole="alert" style={[s.status,status.kind==='error'&&s.statusError,status.kind==='success'&&s.statusSuccess]}><Text style={s.statusText}>{status.message}</Text></View>:null}
    <View style={s.sectionHeader}><Text style={s.section}>Saved Projects ({entries.length})</Text><Button label="Check Library" onPress={repair} disabled={status.kind==='working'}/></View>
    {!entries.length?<Text style={s.empty}>No projects are saved in the library yet.</Text>:entries.map(entry=><View key={entry.id} style={[s.card,entry.id===currentProject.id&&s.cardCurrent]}>
      <View style={s.cardHeader}><View style={s.cardCopy}><Text numberOfLines={1} style={s.cardTitle}>{entry.name}</Text><Text style={s.cardDate}>{new Date(entry.updatedAt).toLocaleString()}</Text></View>{entry.id===currentProject.id&&<Text style={s.currentBadge}>CURRENT</Text>}</View>
      <Text style={s.summary}>{entry.objectCount} objects · {entry.walls} walls · {entry.cabinets} cabinets · {entry.islands} islands</Text>
      <Text style={s.summary}>{entry.openings} openings · {entry.appliances} appliances · {entry.lighting} lights</Text>
      <View style={s.wrap}><Button label="Open" active={entry.id===currentProject.id} disabled={status.kind==='working'} onPress={()=>openEntry(entry)}/><Button label="Duplicate" disabled={status.kind==='working'} onPress={()=>duplicate(entry)}/><Button label="Rename" disabled={status.kind==='working'} onPress={()=>{setRenameId(entry.id);setRenameText(entry.name);}}/><Button label="Delete" disabled={status.kind==='working'} onPress={()=>remove(entry)}/></View>
      {renameId===entry.id&&<View style={s.rename}><TextInput accessibilityLabel="New project name" value={renameText} onChangeText={setRenameText} autoFocus style={s.input}/><View style={s.wrap}><Button label="Save Name" disabled={!renameText.trim()||status.kind==='working'} onPress={rename}/><Button label="Cancel" onPress={()=>{setRenameId(undefined);setRenameText('');}}/></View></View>}
    </View>)}
    <Text style={s.note}>Projects are stored locally on this device. Export a Kitchen AI project file for an additional backup or to move it to another device.</Text>
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:11},current:{borderWidth:1,borderColor:'#8EB1A6',borderRadius:11,backgroundColor:'#EAF3F0',padding:11},currentLabel:{fontSize:9,fontWeight:'900',color:'#3B6F60'},currentName:{fontSize:16,fontWeight:'900',color:'#20312B',marginTop:2},currentMeta:{fontSize:10,lineHeight:15,color:'#5A6B64',marginVertical:5},status:{borderRadius:8,backgroundColor:'#EEF1F0',padding:9,marginTop:9},statusError:{backgroundColor:'#FFF0EE'},statusSuccess:{backgroundColor:'#E8F4EF'},statusText:{fontSize:11,fontWeight:'700',color:'#465750'},sectionHeader:{marginTop:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase'},empty:{fontSize:12,lineHeight:18,color:'#68766F',paddingVertical:15,textAlign:'center'},card:{borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#FFFFFF',padding:10,marginTop:8},cardCurrent:{borderColor:'#5A917F',backgroundColor:'#F2F8F5'},cardHeader:{flexDirection:'row',alignItems:'flex-start',gap:7},cardCopy:{flex:1},cardTitle:{fontSize:14,fontWeight:'900',color:'#25342F'},cardDate:{fontSize:9,color:'#6A7772',marginTop:2},currentBadge:{overflow:'hidden',borderRadius:999,backgroundColor:'#DDEEE8',paddingHorizontal:6,paddingVertical:3,fontSize:8,fontWeight:'900',color:'#24614F'},summary:{fontSize:10,lineHeight:15,color:'#5E6D67',marginTop:3},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:7},button:{minHeight:38,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginBottom:3},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},rename:{marginTop:8,borderTopWidth:1,borderTopColor:'#D5DEDB',paddingTop:8},input:{minHeight:42,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:9,backgroundColor:'#FFFFFF',fontSize:13,fontWeight:'700',color:'#24332E'},note:{fontSize:11,lineHeight:17,color:'#68766F',marginTop:13,textAlign:'center'}});
