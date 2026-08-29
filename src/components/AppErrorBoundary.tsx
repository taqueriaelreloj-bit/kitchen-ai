import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props={children:ReactNode};
type State={error?:Error;resetKey:number};

export class AppErrorBoundary extends Component<Props,State>{
  state:State={resetKey:0};

  static getDerivedStateFromError(error:Error):Partial<State>{
    return{error};
  }

  componentDidCatch(error:Error,info:ErrorInfo){
    console.error('Kitchen AI render error',error,info.componentStack);
  }

  private recover=()=>{
    this.setState(state=>({error:undefined,resetKey:state.resetKey+1}));
  };

  render(){
    if(!this.state.error)return <View key={this.state.resetKey} style={s.app}>{this.props.children}</View>;
    const message=this.state.error.message||'Unknown application error';
    return <View accessibilityRole="alert" style={s.page}>
      <View style={s.brand}><Text style={s.logo}>K</Text><Text style={s.brandName}>Kitchen AI</Text></View>
      <Text style={s.title}>Kitchen AI encontró un problema</Text>
      <Text style={s.body}>Su proyecto guardado no se borró. Intente volver a abrir la aplicación. Si el problema continúa, exporte o conserve el archivo del proyecto antes de restablecer datos.</Text>
      <Pressable accessibilityRole="button" onPress={this.recover} style={s.primary}><Text style={s.primaryText}>Volver a intentar</Text></Pressable>
      <ScrollView style={s.details} contentContainerStyle={s.detailsContent}><Text selectable style={s.detailsTitle}>Detalles técnicos</Text><Text selectable style={s.code}>{message}</Text></ScrollView>
    </View>;
  }
}

const s=StyleSheet.create({
  app:{flex:1},
  page:{flex:1,backgroundColor:'#F1F4F2',padding:28,justifyContent:'center'},
  brand:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:22},
  logo:{width:42,height:42,borderRadius:12,backgroundColor:'#5EA38F',color:'#FFFFFF',fontSize:22,fontWeight:'900',textAlign:'center',textAlignVertical:'center'},
  brandName:{fontSize:20,fontWeight:'900',color:'#1E2B27'},
  title:{fontSize:28,lineHeight:34,fontWeight:'900',color:'#1E2B27'},
  body:{fontSize:16,lineHeight:24,color:'#596963',marginTop:10,marginBottom:22},
  primary:{minHeight:52,borderRadius:12,backgroundColor:'#245C4C',alignItems:'center',justifyContent:'center',paddingHorizontal:18},
  primaryText:{color:'#FFFFFF',fontSize:16,fontWeight:'900'},
  details:{maxHeight:150,marginTop:18,borderWidth:1,borderColor:'#C6D0CD',borderRadius:10,backgroundColor:'#FFFFFF'},
  detailsContent:{padding:12},
  detailsTitle:{fontSize:11,fontWeight:'900',color:'#52615C',textTransform:'uppercase'},
  code:{fontSize:11,lineHeight:17,color:'#6B3C37',marginTop:6},
});
