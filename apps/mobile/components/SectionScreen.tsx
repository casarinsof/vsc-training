import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@vsc-training/design-tokens";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

export function SectionScreen({ title, subtitle, icon }: { title: string; subtitle: string; icon: IconName }) {
  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text style={styles.kicker}>VSC TRAINING</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text><View style={styles.card}><View style={styles.icon}><Ionicons name={icon} size={34} color={colors.primary} /></View><Text style={styles.cardTitle}>Tutto sotto controllo</Text><Text style={styles.cardText}>Questa sezione è pronta per i dati reali. Il flusso completo verrà collegato a Supabase nelle prossime iterazioni.</Text></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},container:{flex:1,padding:spacing.lg},kicker:{color:colors.primary,fontSize:10,fontWeight:"800",letterSpacing:1.6,marginTop:spacing.md},title:{fontSize:32,fontWeight:"800",color:colors.text,marginTop:8},subtitle:{fontSize:14,lineHeight:21,color:colors.textMuted,marginTop:6},card:{flex:1,maxHeight:330,marginTop:spacing.xl,borderWidth:1,borderColor:colors.border,borderRadius:radii.lg,backgroundColor:colors.surface,alignItems:"center",justifyContent:"center",padding:spacing.xl},icon:{width:68,height:68,borderRadius:22,backgroundColor:colors.primaryMuted,alignItems:"center",justifyContent:"center"},cardTitle:{color:colors.text,fontSize:19,fontWeight:"800",marginTop:20},cardText:{color:colors.textMuted,fontSize:13,textAlign:"center",lineHeight:20,marginTop:9}});