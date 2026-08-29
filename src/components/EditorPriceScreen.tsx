import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { estimateEditorProject } from '../domain/editorPricing';
import { estimatePrice } from '../domain/pricing';
import { KitchenDesign, RoomModel } from '../domain/types';
import { colors, PrimaryButton, Screen, StepHeader } from './UI';

const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
type Props={room:RoomModel;design:KitchenDesign;project?:EditorProject;back:()=>void;home:()=>void};

export function EditorPriceScreen({room,design,project,back,home}:Props){
  const editorEstimate=project?estimateEditorProject(project):undefined;
  const fallback=editorEstimate?undefined:estimatePrice(room,design);
  const low=editorEstimate?.low??fallback?.low??0,high=editorEstimate?.high??fallback?.high??0;
  const rows=editorEstimate?.categories.map(item=>({label:item.label,low:item.low,high:item.high,basis:item.basis}))??[
    {label:'Gabinetes',low:fallback?.cabinets??0,high:fallback?.cabinets??0,basis:'Diseño inicial'},
    {label:'Cubiertas',low:fallback?.countertops??0,high:fallback?.countertops??0,basis:'Diseño inicial'},
    {label:'Accesorios',low:fallback?.fixtures??0,high:fallback?.fixtures??0,basis:'Diseño inicial'},
    {label:'Instalación',low:fallback?.installation??0,high:fallback?.installation??0,basis:'Diseño inicial'},
  ];
  return <Screen><StepHeader step="Paso 5 de 5" title="Estimado del proyecto" onBack={back}/><ScrollView contentContainerStyle={s.content}>
    <View style={s.heroCard}><Text style={s.eyebrow}>{editorEstimate?'Basado en el editor':'Basado en el diseño inicial'}</Text><Text style={s.range}>{money(low)} – {money(high)}</Text><Text style={s.caption}>Rango preliminar para la cocina modelada</Text></View>
    <View style={s.card}><Text style={s.title}>Desglose</Text>{rows.map(row=><View key={row.label} style={s.row}><View style={s.rowCopy}><Text style={s.rowLabel}>{row.label}</Text><Text style={s.basis}>{row.basis}</Text></View><Text style={s.rowValue}>{row.low===row.high?money(row.low):`${money(row.low)} – ${money(row.high)}`}</Text></View>)}</View>
    {editorEstimate&&editorEstimate.excludedApplianceCount>0&&<View style={s.exclusion}><Text style={s.exclusionTitle}>Electrodomésticos no incluidos</Text><Text style={s.exclusionText}>{editorEstimate.excludedApplianceCount} appliance{editorEstimate.excludedApplianceCount===1?'':'s'} aparecen en el plano para coordinación, pero su compra no está incluida en el precio.</Text></View>}
    <View style={s.card}><Text style={s.title}>Suposiciones importantes</Text>{(editorEstimate?.assumptions??['Estimación inicial, no es una cotización.','No incluye electrodomésticos, permisos ni impuestos.']).map(item=><View key={item} style={s.assumption}><Text style={s.bullet}>•</Text><Text style={s.assumptionText}>{item}</Text></View>)}</View>
    <Text style={s.note}>Confirme medidas de campo, selección de materiales, precios locales, permisos y condiciones ocultas antes de comprar o contratar.</Text><PrimaryButton label="Guardar y terminar" onPress={home}/>
  </ScrollView></Screen>;
}

const s=StyleSheet.create({content:{padding:24,paddingTop:6,gap:18,paddingBottom:42},heroCard:{backgroundColor:'#17352E',borderRadius:22,padding:22,alignItems:'center'},eyebrow:{color:'#BEE2D7',fontSize:12,fontWeight:'900',textTransform:'uppercase'},range:{color:'#FFFFFF',fontSize:29,fontWeight:'900',textAlign:'center',marginTop:6},caption:{color:'#DCEBE6',fontSize:14,textAlign:'center',marginTop:4},card:{backgroundColor:colors.white,borderRadius:18,padding:18},title:{color:colors.ink,fontSize:20,fontWeight:'900',marginBottom:8},row:{borderTopWidth:1,borderTopColor:colors.border,paddingVertical:13,flexDirection:'row',alignItems:'center',gap:12},rowCopy:{flex:1},rowLabel:{color:colors.ink,fontSize:16,fontWeight:'800'},basis:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:2},rowValue:{color:colors.ink,fontSize:14,fontWeight:'900',textAlign:'right',maxWidth:'46%'},exclusion:{borderWidth:1,borderColor:'#D6C38F',backgroundColor:'#FFF9E8',borderRadius:16,padding:16},exclusionTitle:{color:'#67501C',fontSize:15,fontWeight:'900'},exclusionText:{color:'#756132',fontSize:13,lineHeight:19,marginTop:3},assumption:{flexDirection:'row',gap:8,paddingVertical:4},bullet:{color:colors.green,fontSize:17,fontWeight:'900'},assumptionText:{flex:1,color:colors.muted,fontSize:13,lineHeight:20},note:{color:colors.muted,fontSize:13,lineHeight:19,textAlign:'center'}});
