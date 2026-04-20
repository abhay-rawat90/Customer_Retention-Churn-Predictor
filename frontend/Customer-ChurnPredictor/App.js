import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
  UIManager, LayoutAnimation, ScrollView, FlatList
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const triggerAnimation = () => {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
};

const BACKEND_URL = 'https://abhayr90-customer-churn-predictor.hf.space'; 

const QUESTIONNAIRE_STEPS = [
  { id: 'tenure', type: 'numeric', title: 'Customer Tenure', subtitle: 'How long has this customer been with the company?', explanation: 'Enter total months. Higher tenure generally correlates with higher baseline loyalty.', placeholder: 'e.g., 24' },
  { id: 'Contract', type: 'select', title: 'Contract Type', subtitle: 'What is their current commitment?', explanation: 'Month-to-month contracts are highly volatile and indicate immediate flight risk.', options: [{ label: 'Month-to-Month', value: 0 }, { label: 'One Year', value: 1 }, { label: 'Two Year', value: 2 }] },
  { id: 'MonthlyCharges', type: 'numeric', title: 'Monthly Bill', subtitle: 'How much do they pay every month?', explanation: 'Enter the exact recurring dollar amount.', placeholder: 'e.g., 65.50' },
  { id: 'TotalCharges', type: 'numeric', title: 'Lifetime Value (Total Charges)', subtitle: 'What is the total amount they have paid us?', explanation: 'Calculated as Tenure × Monthly Bill. Indicates total historical revenue.', placeholder: 'e.g., 1572.00' },
  { id: 'InternetService', type: 'select', title: 'Internet Provider Type', subtitle: 'What kind of internet infrastructure do they use?', explanation: 'Fiber Optic customers often have distinct churn profiles compared to DSL users.', options: [{ label: 'DSL', value: 0 }, { label: 'Fiber Optic', value: 1 }, { label: 'No Internet', value: 2 }] },
  { id: 'OnlineSecurity', type: 'select', title: 'Online Security Add-on', subtitle: 'Do they subscribe to network protection?', explanation: 'Customers with multiple integrated services exhibit higher retention rates.', options: [{ label: 'No Security', value: 0 }, { label: 'No Internet', value: 1 }, { label: 'Has Security', value: 2 }] },
  { id: 'TechSupport', type: 'select', title: 'Premium Tech Support', subtitle: 'Do they have dedicated technical assistance?', explanation: 'Supported customers are significantly less likely to churn due to friction.', options: [{ label: 'No Support', value: 0 }, { label: 'No Internet', value: 1 }, { label: 'Has Support', value: 2 }] },
  { id: 'PaperlessBilling', type: 'select', title: 'Billing Preferences', subtitle: 'Have they opted for digital statements?', explanation: 'Paperless billing is a minor indicator of account engagement.', options: [{ label: 'Paper Statements', value: 0 }, { label: 'Paperless (Digital)', value: 1 }] },
  { id: 'PaymentMethod', type: 'select', title: 'Payment Method', subtitle: 'How do they settle their invoice?', explanation: 'Automatic payments drastically reduce the psychological friction of billing.', options: [{ label: 'Bank Transfer (Auto)', value: 0 }, { label: 'Credit Card (Auto)', value: 1 }, { label: 'Electronic Check', value: 2 }, { label: 'Mailed Check', value: 3 }] }
];

export default function App() {
  const [appMode, setAppMode] = useState('home'); 
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    Contract: 0, tenure: '', MonthlyCharges: '', OnlineSecurity: 0,
    TotalCharges: '', TechSupport: 0, PaymentMethod: 2, PaperlessBilling: 1, InternetService: 1
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [aiScript, setAiScript] = useState(null);
  
  const [batchResults, setBatchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigateTo = (mode) => { triggerAnimation(); setAppMode(mode); };
  const handleInputChange = (value) => setFormData({ ...formData, [QUESTIONNAIRE_STEPS[currentStep].id]: value });
  
  const handleNextStep = () => {
    const stepData = QUESTIONNAIRE_STEPS[currentStep];
    if (stepData.type === 'numeric' && (!formData[stepData.id] || isNaN(formData[stepData.id]))) {
      Platform.OS === 'web' ? window.alert("Please enter a valid number.") : Alert.alert("Required", "Please enter a valid number.");
      return;
    }
    triggerAnimation();
    currentStep === QUESTIONNAIRE_STEPS.length - 1 ? submitSinglePrediction() : setCurrentStep(prev => prev + 1);
  };

  const submitSinglePrediction = async () => {
    setIsLoading(true);
    try {
      const payload = {
        Contract: parseInt(formData.Contract), tenure: parseInt(formData.tenure),
        MonthlyCharges: parseFloat(formData.MonthlyCharges), OnlineSecurity: parseInt(formData.OnlineSecurity),
        TotalCharges: parseFloat(formData.TotalCharges), TechSupport: parseInt(formData.TechSupport),
        PaymentMethod: parseInt(formData.PaymentMethod), PaperlessBilling: parseInt(formData.PaperlessBilling),
        InternetService: parseInt(formData.InternetService),
      };
      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Backend error.');
      const data = await response.json();
      triggerAnimation(); setPredictionResult(data);
    } catch (error) { Platform.OS === 'web' ? window.alert(error.message) : Alert.alert("Error", error.message); } 
    finally { setIsLoading(false); }
  };

  const generateScript = async () => {
    setIsLoading(true);
    try {
      const payload = { tenure: parseInt(formData.tenure), MonthlyCharges: parseFloat(formData.MonthlyCharges), Contract: parseInt(formData.Contract), top_drivers: predictionResult.top_drivers };
      const response = await fetch(`${BACKEND_URL}/generate_script`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('AI generation failed.');
      const data = await response.json();
      triggerAnimation(); setAiScript(data.script);
    } catch (error) { Platform.OS === 'web' ? window.alert(error.message) : Alert.alert("Error", error.message); } 
    finally { setIsLoading(false); }
  };

  const resetAgentMode = () => {
    triggerAnimation();
    setPredictionResult(null); setAiScript(null); setCurrentStep(0);
    setFormData({ Contract: 0, tenure: '', MonthlyCharges: '', OnlineSecurity: 0, TotalCharges: '', TechSupport: 0, PaymentMethod: 2, PaperlessBilling: 1, InternetService: 1 });
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];

      setIsLoading(true);
      const uploadData = new FormData();
      if (Platform.OS === 'web') {
        uploadData.append('file', file.file);
      } else {
        uploadData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'text/csv' });
      }

      const response = await fetch(`${BACKEND_URL}/predict_batch`, { method: 'POST', body: uploadData });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): \n${errorText}`);
      }
      
      const data = await response.json();
      triggerAnimation();
      setBatchResults(data);

    } catch (error) {
      Platform.OS === 'web' ? window.alert(error.message) : Alert.alert("Upload Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetManagerMode = () => { triggerAnimation(); setBatchResults(null); };

  if (appMode === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.homeContent}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>RETENTION<Text style={styles.brandHighlight}>AI</Text></Text>
            <Text style={styles.brandSubtitle}>Enterprise Customer Intelligence System</Text>
          </View>
          
          <TouchableOpacity style={styles.modeCard} onPress={() => navigateTo('agent')}>
            <View style={styles.modeCardInner}>
              <Text style={styles.modeNumber}>01</Text>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeTitle}>Agent Workspace</Text>
                <Text style={styles.modeDesc}>Single-user analysis and generative AI retention strategies for active calls.</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeCard} onPress={() => navigateTo('manager')}>
            <View style={styles.modeCardInner}>
              <Text style={styles.modeNumber}>02</Text>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeTitle}>Management Console</Text>
                <Text style={styles.modeDesc}>Batch processing and high-risk account identification via CSV ingestion.</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (appMode === 'manager') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => {resetManagerMode(); navigateTo('home');}} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Overview</Text>
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Management Console</Text>
        </View>
        
        {!batchResults ? (
          <View style={styles.centeredContent}>
            <Text style={styles.sectionTitle}>Batch Ingestion</Text>
            <Text style={styles.sectionDesc}>Select a compliant CSV billing file to process multiple accounts simultaneously.</Text>
            <TouchableOpacity style={styles.primaryButtonLarge} onPress={handleFileUpload} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonLargeText}>Upload Dataset</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultsWrapper}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>ACCOUNTS PROCESSED</Text>
                <Text style={styles.kpiValue}>{batchResults.total_processed}</Text>
              </View>
              <View style={[styles.kpiCard, styles.kpiCardAlert]}>
                <Text style={[styles.kpiLabel, styles.textAlert]}>HIGH RISK FLAG</Text>
                <Text style={[styles.kpiValue, styles.textAlert]}>{batchResults.total_high_risk}</Text>
              </View>
            </View>

            <Text style={styles.listHeader}>Prioritized Intervention List</Text>
            <FlatList
              data={batchResults.high_risk_customers}
              keyExtractor={(item, index) => item.customerID || index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.dataRow}>
                  <View style={styles.dataRowHeader}>
                    <View>
                      <Text style={styles.dataId}>{item.customerID}</Text>
                      <Text style={styles.dataMeta}>Tenure: {item.tenure} mo  |  Rev: ${item.MonthlyCharges.toFixed(2)}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{(item.Risk_Probability * 100).toFixed(0)}% PROBABILITY</Text>
                    </View>
                  </View>
                  <View style={styles.dataDrivers}>
                    <Text style={styles.dataDriversTitle}>PRIMARY DRIVERS</Text>
                    {item.top_drivers.map((driver, idx) => (
                      <Text key={idx} style={styles.dataDriverItem}>
                        <Text style={styles.driverDot}>•</Text> {driver.feature} 
                        <Text style={driver.direction === "Increased Risk" ? styles.textAlert : styles.textSuccess}>
                          {driver.direction === "Increased Risk" ? " (Escalating)" : " (Stabilizing)"}
                        </Text>
                      </Text>
                    ))}
                  </View>
                </View>
              )}
              contentContainerStyle={{paddingBottom: 40}}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={resetManagerMode}>
              <Text style={styles.secondaryButtonText}>Process New Dataset</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (appMode === 'agent') {
    const stepData = QUESTIONNAIRE_STEPS[currentStep];
    if (predictionResult) {
      const isHighRisk = predictionResult.churn_prediction === 1;
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigateTo('home')} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Exit</Text>
            </TouchableOpacity>
            <Text style={styles.headerBarTitle}>Analysis Report</Text>
          </View>
          <ScrollView contentContainerStyle={styles.resultScrollContainer}>
            
            <View style={styles.reportCard}>
              <Text style={styles.reportHeader}>MODEL PREDICTION</Text>
              <View style={[styles.statusBox, isHighRisk ? styles.statusBoxAlert : styles.statusBoxSafe]}>
                <Text style={[styles.statusBoxText, isHighRisk ? styles.textAlert : styles.textSuccess]}>
                  {isHighRisk ? "STATUS: HIGH CHURN RISK" : "STATUS: STABLE ACCOUNT"}
                </Text>
              </View>
              <Text style={styles.reportProbability}>Calculated Probability: {(predictionResult.churn_risk_probability * 100).toFixed(1)}%</Text>
              
              <View style={styles.reportDivider} />
              
              <Text style={styles.reportHeader}>SHAP ANALYSIS: KEY DRIVERS</Text>
              <View style={styles.driverListClean}>
                {predictionResult.top_drivers.map((d, i) => (
                  <View key={i} style={styles.driverRowClean}>
                    <Text style={styles.driverLabelClean}>{d.feature}</Text>
                    <Text style={[styles.driverValueClean, d.direction === "Increased Risk" ? styles.textAlert : styles.textSuccess]}>
                      {d.direction === "Increased Risk" ? "Risk Catalyst" : "Retention Anchor"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {isHighRisk && !aiScript && (
              <TouchableOpacity style={styles.primaryButtonLarge} onPress={generateScript} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonLargeText}>Generate AI Retention Strategy</Text>}
              </TouchableOpacity>
            )}
            
            {aiScript && (
              <View style={styles.aiCard}>
                <Text style={styles.aiCardHeader}>SYSTEM SUGGESTION</Text>
                <Text style={styles.aiCardBody}>{aiScript}</Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.secondaryButton} onPress={resetAgentMode}>
              <Text style={styles.secondaryButtonText}>Initialize New Evaluation</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigateTo('home')} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Abort</Text>
            </TouchableOpacity>
            <Text style={styles.headerBarTitle}>Step {currentStep + 1} / {QUESTIONNAIRE_STEPS.length}</Text>
          </View>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((currentStep + 1) / QUESTIONNAIRE_STEPS.length) * 100}%` }]} />
          </View>
          
          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceTitle}>{stepData.title}</Text>
            <Text style={styles.workspaceDesc}>{stepData.subtitle}</Text>
            
            <View style={styles.infoPanel}>
              <Text style={styles.infoPanelLabel}>CONTEXT</Text>
              <Text style={styles.infoPanelText}>{stepData.explanation}</Text>
            </View>
            
            <View style={styles.inputRegion}>
              {stepData.type === 'numeric' ? (
                <TextInput 
                  style={styles.textInputClean} 
                  placeholder={stepData.placeholder} 
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric" 
                  value={String(formData[stepData.id])} 
                  onChangeText={handleInputChange} 
                  autoFocus={true} 
                />
              ) : (
                <View style={styles.gridContainer}>
                  {stepData.options.map((opt) => {
                    const isSelected = formData[stepData.id] === opt.value;
                    return (
                      <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.gridOption, isSelected && styles.gridOptionSelected]} 
                        onPress={() => handleInputChange(opt.value)}
                      >
                        <Text style={[styles.gridOptionText, isSelected && styles.gridOptionTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionFooter}>
            <TouchableOpacity 
              style={[styles.footerButtonOutline, currentStep === 0 && styles.disabledOutline]} 
              onPress={() => setCurrentStep(prev=>prev-1)} 
              disabled={currentStep === 0}
            >
              <Text style={[styles.footerButtonOutlineText, currentStep === 0 && styles.disabledOutlineText]}>Previous</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.footerButtonSolid} onPress={handleNextStep} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : 
               <Text style={styles.footerButtonSolidText}>{currentStep === QUESTIONNAIRE_STEPS.length - 1 ? "Execute Analysis" : "Continue"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  /* Global Layout */
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  textAlert: { color: '#DC2626' },
  textSuccess: { color: '#059669' },
  
  /* Buttons */
  primaryButtonLarge: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  primaryButtonLargeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginVertical: 8 },
  secondaryButtonText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  
  /* Header Nav */
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { padding: 4 },
  backButtonText: { fontSize: 15, fontWeight: '500', color: '#64748B' },
  headerBarTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: 1, textTransform: 'uppercase' },

  /* Home Screen */
  homeContent: { flex: 1, justifyContent: 'center', padding: 24 },
  brandContainer: { marginBottom: 48, alignItems: 'center' },
  brandTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  brandHighlight: { color: '#2563EB' },
  brandSubtitle: { fontSize: 14, color: '#64748B', marginTop: 8, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
  modeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  modeCardInner: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  modeNumber: { fontSize: 14, fontWeight: '700', color: '#CBD5E1', marginRight: 20 },
  modeTextContainer: { flex: 1 },
  modeTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  modeDesc: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  modeArrow: { fontSize: 24, color: '#94A3B8', marginLeft: 16 },

  /* Manager Dashboard */
  centeredContent: { flex: 1, justifyContent: 'center', padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  sectionDesc: { fontSize: 15, color: '#64748B', marginBottom: 8, lineHeight: 22 },
  resultsWrapper: { flex: 1, padding: 24 },
  kpiRow: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 32 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 20, borderRadius: 8 },
  kpiCardAlert: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 8 },
  kpiValue: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  listHeader: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  dataRow: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 20, marginBottom: 12 },
  dataRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dataId: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  dataMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  statusBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#FECACA' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
  dataDrivers: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  dataDriversTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 },
  dataDriverItem: { fontSize: 14, color: '#334155', marginBottom: 4 },
  driverDot: { color: '#CBD5E1' },

  /* Agent Workspace */
  progressTrack: { height: 4, backgroundColor: '#E2E8F0' },
  progressFill: { height: '100%', backgroundColor: '#0F172A' },
  workspaceCard: { flex: 1, backgroundColor: '#FFFFFF', margin: 24, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  workspaceTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  workspaceDesc: { fontSize: 16, color: '#64748B', marginBottom: 24 },
  infoPanel: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 8, marginBottom: 32 },
  infoPanelLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 6 },
  infoPanelText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  inputRegion: { flex: 1, justifyContent: 'center' },
  textInputClean: { borderBottomWidth: 2, borderBottomColor: '#E2E8F0', fontSize: 32, fontWeight: '600', color: '#0F172A', paddingVertical: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridOption: { flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  gridOptionSelected: { backgroundColor: '#F8FAFC', borderColor: '#0F172A', borderWidth: 2 },
  gridOptionText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  gridOptionTextSelected: { color: '#0F172A' },
  actionFooter: { flexDirection: 'row', padding: 24, gap: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerButtonOutline: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  disabledOutline: { borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  footerButtonOutlineText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  disabledOutlineText: { color: '#94A3B8' },
  footerButtonSolid: { flex: 2, backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  footerButtonSolidText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  /* Results Screen */
  resultScrollContainer: { padding: 24 },
  reportCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 24, marginBottom: 24 },
  reportHeader: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },
  statusBox: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  statusBoxAlert: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusBoxSafe: { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  statusBoxText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  reportProbability: { fontSize: 15, color: '#475569', fontWeight: '500' },
  reportDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },
  driverListClean: { gap: 12 },
  driverRowClean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverLabelClean: { fontSize: 15, color: '#334155', fontWeight: '500' },
  driverValueClean: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  
  /* AI Card */
  aiCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 24, marginBottom: 24 },
  aiCardHeader: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 1, marginBottom: 12 },
  aiCardBody: { fontSize: 16, color: '#0F172A', lineHeight: 26, fontStyle: 'italic' }
});