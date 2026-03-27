import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';

export default function PredictTab({ route, navigation, setIsDarkMode, isDarkMode }) {
  const theme = {
    background: isDarkMode ? Colors.dark.background : Colors.light.background,
    card: isDarkMode ? Colors.dark.card : Colors.light.card, 
    text: isDarkMode ? Colors.dark.text : Colors.light.text,
    textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
    secondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    error: isDarkMode ? Colors.dark.error : Colors.light.error,
    success: isDarkMode ? (Colors.dark.success) : (Colors.light.success),
    iconBg: isDarkMode ? Colors.dark.iconBg : Colors.light.iconBg,
    iconPlaceholder: isDarkMode ? Colors.dark.iconPlaceholder : Colors.light.iconPlaceholder,
    destructiveBg: isDarkMode ? Colors.dark.destructiveBg : Colors.light.destructiveBg,
    destructiveBorder: isDarkMode ? Colors.dark.destructiveBorder : Colors.light.destructiveBorder,
    separator: isDarkMode ? Colors.dark.separator : Colors.light.separator,
    borderColor: isDarkMode ? Colors.dark.borderColor : Colors.light.borderColor,
    footer: isDarkMode ? Colors.dark.footer : Colors.light.footer,
  };

  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('theory'); // 'theory' or 'practical'
  
  // Predictor Inputs
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  // UI State
  const [showDropdown, setShowDropdown] = useState(false);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const fetchLocal = async () => {
      try {
        const rawData = await AsyncStorage.getItem('ATTENDANCE_DATA');
        if (rawData) {
          const data = JSON.parse(rawData);
          setFullData(data);

          // Extract Unique Subjects from BOTH theory and practical
          const theorySubjects = data.theory ? Object.keys(data.theory) : [];
          const tutorialSubjects = data.practical ? Object.keys(data.practical) : (data.tutorial ? Object.keys(data.tutorial) : []);
          
          const uniqueSubjects = [...new Set([...theorySubjects, ...tutorialSubjects])];
          setSubjects(uniqueSubjects);
          
          if (uniqueSubjects.length > 0) {
            setSelectedSubject(uniqueSubjects[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load attendance for predictor:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocal();
  }, []);

  // Reset counters when subject or type changes
  useEffect(() => {
      setAttendCount(0);
      setBunkCount(0);
  }, [selectedSubject, selectedType]);

  // Helper to extract values safely
  const getVal = (row, ...keys) => {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
            return parseInt(row[key], 10) || 0;
        }
    }
    return 0;
  };

  // --- 2. CALCULATE CURRENT STATS ---
  const currentStats = useMemo(() => {
      if (!fullData || !selectedSubject) return { attended: 0, held: 0, percentage: 0 };

      const targetObject = selectedType === 'theory' ? fullData.theory : (fullData.practical || fullData.tutorial);
      const rows = targetObject?.[selectedSubject] || [];

      let attended = 0;
      let held = 0;

      rows.forEach(row => {
          attended += getVal(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
          held += getVal(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
      });

      const percentage = held === 0 ? 0 : (attended / held) * 100;

      return { attended, held, percentage: percentage.toFixed(1) };
  }, [fullData, selectedSubject, selectedType]);

  // --- 3. CALCULATE PREDICTIONS ---
  const prediction = useMemo(() => {
      const { attended, held } = currentStats;
      const newAttended = attended + attendCount;
      const newHeld = held + attendCount + bunkCount;
      
      const newPercentage = newHeld === 0 ? 0 : (newAttended / newHeld) * 100;
      
      // (Target 67%)
      let insight = "";
      let insightColor = theme.secondary;

      if (held > 0) {
          const target = 0.67;
          const currentDecimal = attended / held;

          if (currentDecimal >= target) {
              // Calculate Safe Bunks: M = (A - 0.67H) / 0.67
              const safeBunks = Math.floor((attended - (target * held)) / target);
              if (safeBunks > 0) {
                  insight = `You can safely bunk ${safeBunks} more class${safeBunks > 1 ? 'es' : ''} and stay above 67%.`;
                  insightColor = theme.success;
              } else {
                  insight = `You are exactly at the border! Don't bunk the next class.`;
                  insightColor = theme.secondary;
              }
          } else {
              // Calculate Required Classes: R = (0.67H - A) / 0.33
              const reqClasses = Math.ceil(((target * held) - attended) / 0.33);
              insight = `You need to attend ${reqClasses} more class(es) to reach 67%.`;
              insightColor = theme.error;
          }
      }

      return { 
          newPercentage: newPercentage.toFixed(1), 
          insight, 
          insightColor,
          isLow: newPercentage < 67 
      };
  }, [currentStats, attendCount, bunkCount, theme]);


  if (loading) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Loading predictor data" />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Header */}
      <View style={styles.headerRow} accessible={false}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
          accessibilityHint="Returns to the previous screen"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Ionicons name="caret-back" size={27} color={theme.primary} importantForAccessibility="no" />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">PREDICTOR</Text>
        
        <TouchableOpacity 
          style={[styles.themeButton, { backgroundColor: theme.card }]} 
          onPress={() => setIsDarkMode(!isDarkMode)}
          accessibilityRole="button"
          accessibilityLabel="Toggle Theme"
          accessibilityHint={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
             <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} importantForAccessibility="no" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Step 1: Selection Controls */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>1. Select Subject</Text>
        <View style={{ zIndex: 10, marginBottom: 20 }}>
            <TouchableOpacity 
                style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.borderColor }]} 
                onPress={() => setShowDropdown(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Selected subject: ${selectedSubject || "None"}. Open subject list.`}
                accessibilityHint="Opens a modal to select a different subject"
            >
                <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1} importantForAccessibility="no">
                    {selectedSubject || "No Subjects Found"}
                </Text>
                <Ionicons name={'chevron-down'} size={18} color={theme.textSecondary} importantForAccessibility="no" />
            </TouchableOpacity>

            <Modal 
              visible={showDropdown} 
              transparent={true} 
              animationType="fade" 
              onRequestClose={() => setShowDropdown(false)}
              accessibilityViewIsModal={true}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPressOut={() => setShowDropdown(false)} accessibilityLabel="Close subject list" accessibilityRole="button">
                    <View style={[styles.modalListContainer, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
                        <Text style={[styles.modalListHeader, { color: theme.text, backgroundColor: theme.iconBg, borderBottomWidth: .5, borderColor:theme.primary}]} accessibilityRole="header">Select a Subject</Text>
                        <ScrollView style={{maxHeight: 350}} showsVerticalScrollIndicator={true}>
                            {subjects.map((sub) => (
                                <TouchableOpacity 
                                    key={sub} 
                                    style={[styles.dropdownItem, { borderBottomColor: theme.borderColor }]} 
                                    onPress={() => {
                                        setSelectedSubject(sub);
                                        setShowDropdown(false);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={sub}
                                    accessibilityState={{ selected: selectedSubject === sub }}
                                >
                                    <Text style={[styles.dropdownItemText, { color: theme.textSecondary }, selectedSubject === sub && { color: theme.primary, fontWeight: '700' }]} importantForAccessibility="no">
                                        {sub}
                                    </Text>
                                    {selectedSubject === sub && <Ionicons name="checkmark" size={16} color={theme.primary} importantForAccessibility="no" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>

        {/* Toggle Theory/Practical */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.card }]} accessible={true} accessibilityRole="radiogroup">
            <TouchableOpacity 
                style={[styles.toggleButton, selectedType === 'theory' && [styles.toggleActive, { backgroundColor: theme.primary }]]}
                onPress={() => setSelectedType('theory')}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedType === 'theory' }}
                accessibilityLabel="Theory Classes"
            >
                <Text style={[styles.toggleText, { color: theme.text }]} importantForAccessibility="no">Theory</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.toggleButton, selectedType === 'practical' && [styles.toggleActive, { backgroundColor: theme.primary }]]}
                onPress={() => setSelectedType('practical')}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedType === 'practical' }}
                accessibilityLabel="Practical Classes"
            >
                <Text style={[styles.toggleText, { color: theme.text }]} importantForAccessibility="no">Practical</Text>
            </TouchableOpacity>
        </View>

        {currentStats.held === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]} accessible={true} accessibilityLabel="No data found for this selection. Try switching between Theory and Practical.">
                <Ionicons name="information-circle-outline" size={32} color={theme.textSecondary} style={{marginBottom: 10}} importantForAccessibility="no" />
                <Text style={{color: theme.text, textAlign: 'center', fontWeight: '500'}} importantForAccessibility="no">No data found for this selection.</Text>
                <Text style={{color: theme.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 5}} importantForAccessibility="no">Try switching between Theory and Practical.</Text>
            </View>
        ) : (
            <>

                {/* Step 2: Current Status */}
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>2. CURRENT STATS</Text>

                {/* Step 3: Calculation */}
                <View 
                  style={[styles.statusCard, { backgroundColor: theme.card }]} 
                  accessible={true} 
                  accessibilityLabel={`Current Stats: You have attended ${currentStats.attended} out of ${currentStats.held} classes. Current total is ${currentStats.percentage} percent.`}
                >
                    <View style={styles.statusCol} importantForAccessibility="no-hide-descendants">
                        <Text style={[styles.statusVal, { color: theme.text }]}>{currentStats.attended}/{currentStats.held}</Text>
                        <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Classes Attended</Text>
                    </View>
                    <View style={[styles.statusDivider, { backgroundColor: theme.borderColor }]} />
                    <View style={styles.statusCol} importantForAccessibility="no-hide-descendants">
                        <Text style={[styles.statusVal, { color: Number(currentStats.percentage) < 67 ? theme.error : theme.success }]}>
                            {currentStats.percentage}%
                        </Text>
                        <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Current Total</Text>
                    </View>
                </View>

                {/* Smart Insight */}
                <View style={[{backgroundColor: theme.card}]} accessible={true} accessibilityLabel={`Insight: ${prediction.insight}. Reminder: A 2-hour class gives you 2 points worth of attendance!`}>
                  <View style={[styles.insightBox]} importantForAccessibility="no-hide-descendants">
                      <Ionicons name="bulb-outline" size={25} color={prediction.insightColor} />
                      <Text style={[styles.insightText, { color: prediction.insightColor }]}>{prediction.insight}</Text>
                  </View>
                  <Text style={ { color: theme.primary, padding:16, paddingTop:0, fontSize:13 }} importantForAccessibility="no">Reminder: A 2-hour class gives you 2 points worth of attendance!</Text>
                </View>

                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>3. Plan Future Classes</Text>
                
                <View style={styles.controlsGrid}>
                    {/* Attend Control */}
                    <View style={[styles.controlBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.controlLabel, { color: theme.success }]} accessibilityRole="header">To Attend</Text>
                        <View style={styles.counterRow}>
                            <TouchableOpacity 
                              style={[styles.counterBtn, { backgroundColor: theme.background }]} 
                              onPress={() => setAttendCount(Math.max(0, attendCount - 1))}
                              accessibilityRole="button"
                              accessibilityLabel="Decrease classes to attend"
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="remove" size={25} color={theme.primary} importantForAccessibility="no" />
                            </TouchableOpacity>
                            <Text style={[styles.counterVal, { color: theme.text }]} accessibilityLabel={`${attendCount} classes planned to attend`}>{attendCount}</Text>
                            <TouchableOpacity 
                              style={[styles.counterBtn, { backgroundColor: theme.background }]} 
                              onPress={() => setAttendCount(attendCount + 1)}
                              accessibilityRole="button"
                              accessibilityLabel="Increase classes to attend"
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="add" size={25} color={theme.primary} importantForAccessibility="no" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Miss Control */}
                    <View style={[styles.controlBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.controlLabel, { color: theme.error }]} accessibilityRole="header">To Miss</Text>
                        <View style={styles.counterRow}>
                            <TouchableOpacity 
                              style={[styles.counterBtn, { backgroundColor: theme.background }]} 
                              onPress={() => setBunkCount(Math.max(0, bunkCount - 1))}
                              accessibilityRole="button"
                              accessibilityLabel="Decrease classes to miss"
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="remove" size={25} color={theme.primary} importantForAccessibility="no" />
                            </TouchableOpacity>
                            <Text style={[styles.counterVal, { color: theme.text }]} accessibilityLabel={`${bunkCount} classes planned to miss`}>{bunkCount}</Text>
                            <TouchableOpacity 
                              style={[styles.counterBtn, { backgroundColor: theme.background }]} 
                              onPress={() => {if (bunkCount < 15) setBunkCount(Math.max(0, bunkCount + 1))}}
                              accessibilityRole="button"
                              accessibilityLabel="Increase classes to miss"
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="add" size={25} color={theme.primary} importantForAccessibility="no" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Result Card */}
                <View 
                  style={[styles.resultCard, { backgroundColor: prediction.isLow ? theme.error : theme.primary }]}
                  accessible={true}
                  accessibilityLabel={`Predicted Attendance: ${prediction.newPercentage} percent. Based on ${currentStats.attended + attendCount} out of ${currentStats.held + attendCount + bunkCount} total classes.`}
                >
                    <Text style={styles.resultLabel} importantForAccessibility="no">Predicted Attendance (x)</Text>
                    <Text style={styles.resultVal} importantForAccessibility="no">{prediction.newPercentage}%</Text>
                    <Text style={styles.resultSub} importantForAccessibility="no">
                        ({currentStats.attended + attendCount} / {currentStats.held + attendCount + bunkCount} classes)
                    </Text>
                </View>
            </>
        )}

        {/* MARKS INFO */}
        <View style={{padding:10}}>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontSize:18, marginTop:10, textAlign:'justify' }]} accessibilityRole="header" accessibilityLabel="Marks Reward System">MARKS REWARD SYSTEM</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify'}]} accessibilityLabel="85 and above % of attendance gives you 6 marks">x &lt; 85% = 6 marks</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify'}]} accessibilityLabel="Between 80 and 85% of attendance gives you 4.8 marks">85% &lt; x &lt; 80%  = 4.8 marks</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify'}]} accessibilityLabel="Between 75 and 80% of attendance gives you 3.6 marks">75% &lt; x &lt; 80%  = 3.6 marks</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify'}]} accessibilityLabel="Between 70 and 75% of attendance gives you 2.4 marks">70% &lt; x &lt; 75%  = 2.4 marks</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify'}]} accessibilityLabel="Between 67 and 70% of attendance gives you 1.2 marks">67% &lt; x &lt; 70%  = 1.2 marks</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign:'justify', fontStyle:'italic'}]} accessibilityLabel="No marks are awarded to attendance below 67%">No marks are awarded to attendance below 67%</Text>
        </View>

        {/* INSTRUCTIONS */}
        <View 
            style={{padding:10}} 
            accessible={true}
        >
          <Text style={[styles.infoText, { color: theme.textSecondary, fontSize:18, marginTop:10 }]}>HOW IT WORKS?</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontWeight:"normal", textAlign:'justify'}]}>1. The formula assumes that the next class would be of one hour and will be held with 100% surity.</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontWeight:"normal", textAlign:'justify'}]}>2. It uses the student&apos;s current attendance status for each month and sums them up.</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontWeight:"normal", textAlign:'justify'}]}>3. The minimum requirement of 67% of attendance for each subject is used to compare and print the final result.</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontWeight:"normal", textAlign:'justify'}]}>4. Both practical and theory classes are calculated independently.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    
    sectionLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    infoText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5, textAlign: 'center' },
    
    // Modal Dropdown
    dropdown: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dropdownText: { fontSize: 15, fontWeight: '600', flex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalListContainer: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalListHeader: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', padding: 16 },
    dropdownItem: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5 },
    dropdownItemText: { fontSize: 15 },

    // Toggle
    toggleContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 25 },
    toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    toggleText: { fontSize: 14, fontWeight: '600' },

    // Status Card
    emptyCard: { padding: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    statusCard: { flexDirection: 'row', borderRadius: 16, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    statusCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statusDivider: { width: 1, height: '80%', alignSelf: 'center' },
    statusVal: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
    statusLabel: { fontSize: 12, fontWeight: '500' },

    // Insight Box
    insightBox: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10, gap: 10 },
    insightText: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },

    // Controls
    controlsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 25 },
    controlBox: { flex: 1, borderRadius: 16, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    controlLabel: { fontSize: 15, fontWeight: '700', marginBottom: 15 },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
    counterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    counterVal: { fontSize: 22, fontWeight: 'bold', width: 30, textAlign: 'center' },

    // Result Card
    resultCard: { marginBottom: 20, borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    resultLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
    resultVal: { fontSize: 48, color: '#FFF', fontWeight: '900', marginBottom: 5 },
    resultSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
});