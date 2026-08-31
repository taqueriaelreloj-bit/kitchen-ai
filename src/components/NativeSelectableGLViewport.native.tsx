import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { pickNativeGlObject } from '../domain/nativeGlPicking';
import { NativeGLViewport } from './NativeGLViewport.native';

export function NativeSelectableGLViewport({project,camera,onSelect}:{project:EditorProject;camera:Camera3DState;onSelect:(id?:string)=>void}){
  const[size,setSize]=useState({width:1,height:1});
  const boxes=useMemo(()=>buildSceneBoxes(project.objects),[project.objects]);
  const selected=project.objects.find(object=>object.id===project.selectedId);
  const onLayout=(event:LayoutChangeEvent)=>{const{width,height}=event.nativeEvent.layout;if(width>0&&height>0)setSize({width,height});};
  return <View style={s.root} onLayout={onLayout}>
    <NativeGLViewport project={project} camera={camera}/>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap a 3D kitchen object to select it"
      onPress={event=>{
        const picked=pickNativeGlObject(boxes,camera,size.width,size.height,event.nativeEvent.locationX,event.nativeEvent.locationY,project.selectedId,10);
        onSelect(picked?.id);
      }}
      onLongPress={()=>onSelect(undefined)}
      delayLongPress={450}
      style={StyleSheet.absoluteFill}
    />
    <View pointerEvents="none" style={s.hint}><Text style={s.hintText}>{selected?`Selected: ${selected.name}`:'Tap an object to select · Hold to clear'}</Text></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,overflow:'hidden'},hint:{position:'absolute',left:10,right:10,bottom:9,alignItems:'center'},hintText:{overflow:'hidden',borderRadius:8,backgroundColor:'#17211FDD',paddingHorizontal:9,paddingVertical:6,fontSize:10,fontWeight:'800',color:'#E6EFEC',textAlign:'center'}});
