import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  DEFAULT_ESTIMATE_RATES, editorEstimateCsv, estimateKitchenProject, EstimateOptions,
  EstimateRates,
} from '../domain/editorEstimate';
import { EditorProject } from '../domain/editor';

type Props={project:EditorProject};
const currency=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function download(name:string,content:string){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'kitchen';

function RateField({label,value,onChange,suffix}:{label:string;value:number;onChange:(value:number)=>void;suffix:string}){
  return <View style={s.rateField}><Text style={s.rateLabel}>{label}</Text><View style={s.rateInputRow}><Text style={s.currencyPrefix}>$</Text><TextInput accessibilityLabel={label} value={String(value)} keyboardType="decimal-pad" onChangeText={text=>{const next=Number(text.replace(/[^0-9.]/g,''));if(Number.isFinite(next))onChange(next);}} style={s.rateInput}/><Text style={s.rateSuffix}>{suffix}</Text></View></View>;
}

export function EditorEstimatePanel({project}:Props){
  const[rates,setRates]=useState<EstimateRates>(DEFAULT_ESTIMATE_RATES);
  const[options,setOptions]=useState<EstimateOptions>({includeApplianceAllowance:false,includeWallPaint:true,includeInstallation:true,includeContingency:true,includeOverheadProfit:true,regionLabel:'User-configurable rates'});
  const estimate=useMemo(()=>estimateKitchenProject(project,rates,options),[project,rates,options]);
  const patchRate=<K extends keyof EstimateRates>(key:K,value:EstimateRates[K])=>setRates(current=>({...current,[key]:value}));
  const toggle=<K extends keyof EstimateOptions>(key:K)=>setOptions(current=>({...current,[key]:!current[key]}));

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Project Estimate</Text>
    <Text style={s.help}>Calculated from the actual editor objects and Bill of Materials. Rates are editable planning values, not live supplier prices.</Text>
    <View style={s.totalCard}><Text style={s.totalLabel}>Estimated Total</Text><Text style={s.total}>{currency(estimate.total)}</Text><View style={s.range}><Text style={s.rangeText}>Low {currency(estimate.low)}</Text><Text style={s.rangeText}>High {currency(estimate.high)}</Text></View></View>

    <Text style={s.sectionTitle}>Scope</Text>
    <View style={s.wrap}>
      <Button label="Wall Paint" active={options.includeWallPaint!==false} onPress={()=>toggle('includeWallPaint')}/>
      <Button label="Appliance Allowance" active={options.includeApplianceAllowance===true} onPress={()=>toggle('includeApplianceAllowance')}/>
      <Button label="Installation" active={options.includeInstallation!==false} onPress={()=>toggle('includeInstallation')}/>
      <Button label="Contingency" active={options.includeContingency!==false} onPress={()=>toggle('includeContingency')}/>
      <Button label="Overhead & Profit" active={options.includeOverheadProfit!==false} onPress={()=>toggle('includeOverheadProfit')}/>
    </View>

    <Text style={s.sectionTitle}>Configurable Rates</Text>
    <View style={s.rateGrid}>
      <RateField label="Base cabinets" value={rates.baseCabinetPerLinearFt} suffix="/ lin ft" onChange={value=>patchRate('baseCabinetPerLinearFt',value)}/>
      <RateField label="Wall cabinets" value={rates.wallCabinetPerLinearFt} suffix="/ lin ft" onChange={value=>patchRate('wallCabinetPerLinearFt',value)}/>
      <RateField label="Tall cabinet" value={rates.tallCabinetEach} suffix="/ ea" onChange={value=>patchRate('tallCabinetEach',value)}/>
      <RateField label="Island cabinetry" value={rates.islandCabinetPerLinearFt} suffix="/ lin ft" onChange={value=>patchRate('islandCabinetPerLinearFt',value)}/>
      <RateField label="Countertops" value={rates.countertopPerSqFt} suffix="/ sq ft" onChange={value=>patchRate('countertopPerSqFt',value)}/>
      <RateField label="Hardware" value={rates.hardwareEach} suffix="/ ea" onChange={value=>patchRate('hardwareEach',value)}/>
      <RateField label="Toe kick" value={rates.toeKickPerLinearFt} suffix="/ lin ft" onChange={value=>patchRate('toeKickPerLinearFt',value)}/>
      <RateField label="Wall paint" value={rates.wallPaintPerSqFt} suffix="/ sq ft" onChange={value=>patchRate('wallPaintPerSqFt',value)}/>
      <RateField label="Appliance allowance" value={rates.applianceAllowanceEach} suffix="/ ea" onChange={value=>patchRate('applianceAllowanceEach',value)}/>
      <RateField label="Lighting" value={rates.lightingEach} suffix="/ ea" onChange={value=>patchRate('lightingEach',value)}/>
      <RateField label="Installation" value={rates.installationPercent} suffix="%" onChange={value=>patchRate('installationPercent',value)}/>
      <RateField label="Contingency" value={rates.contingencyPercent} suffix="%" onChange={value=>patchRate('contingencyPercent',value)}/>
      <RateField label="Overhead & Profit" value={rates.overheadProfitPercent} suffix="%" onChange={value=>patchRate('overheadProfitPercent',value)}/>
    </View>

    <Text style={s.sectionTitle}>Line Items</Text>
    {estimate.lines.map(item=><View key={item.id} style={s.line}><View style={s.lineCopy}><Text style={s.lineCategory}>{item.category}</Text><Text style={s.lineDescription}>{item.description}</Text><Text style={s.lineQuantity}>{item.quantity} {item.unit} × {currency(item.unitCost)}</Text></View><Text style={s.lineTotal}>{currency(item.subtotal)}</Text></View>)}
    {estimate.salesTax>0&&<View style={s.line}><Text style={s.lineDescription}>Sales tax</Text><Text style={s.lineTotal}>{currency(estimate.salesTax)}</Text></View>}
    <Button label="Download Estimate CSV" onPress={()=>download(`${slug(project.name)}-estimate.csv`,editorEstimateCsv(estimate))}/>
    <Text style={s.disclaimer}>{estimate.disclaimer}</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:28},title:{fontSize:19,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:11},totalCard:{borderWidth:1,borderColor:'#8EAEA4',borderRadius:12,backgroundColor:'#E9F3F0',padding:14,marginBottom:13},totalLabel:{fontSize:11,fontWeight:'900',color:'#4D665E',textTransform:'uppercase'},total:{fontSize:28,fontWeight:'900',color:'#164C3D',marginTop:2},range:{flexDirection:'row',justifyContent:'space-between',marginTop:5},rangeText:{fontSize:11,fontWeight:'800',color:'#536B63'},sectionTitle:{fontSize:13,fontWeight:'900',color:'#263530',textTransform:'uppercase',marginTop:7,marginBottom:7},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},button:{minHeight:42,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},rateGrid:{gap:7},rateField:{borderWidth:1,borderColor:'#D0D8D5',borderRadius:8,backgroundColor:'#FFFFFF',padding:8},rateLabel:{fontSize:10,fontWeight:'800',color:'#53625D',marginBottom:4},rateInputRow:{flexDirection:'row',alignItems:'center'},currencyPrefix:{fontSize:13,fontWeight:'900',color:'#315F55'},rateInput:{flex:1,minHeight:34,fontSize:14,fontWeight:'900',color:'#21312C',paddingHorizontal:5},rateSuffix:{fontSize:10,fontWeight:'800',color:'#65736E'},line:{minHeight:60,borderBottomWidth:1,borderBottomColor:'#D7DEDB',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingVertical:7},lineCopy:{flex:1},lineCategory:{fontSize:9,fontWeight:'900',color:'#507C6E',textTransform:'uppercase'},lineDescription:{fontSize:12,fontWeight:'800',color:'#293833',marginTop:2},lineQuantity:{fontSize:10,color:'#6A7672',marginTop:2},lineTotal:{fontSize:13,fontWeight:'900',color:'#233D35'},disclaimer:{fontSize:10,lineHeight:16,color:'#707B77',marginTop:10}});
