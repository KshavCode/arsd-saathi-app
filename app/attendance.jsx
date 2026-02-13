import { Colors } from '../constants/themeStyle';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function AttendanceTab({ navigation, isDarkMode, setIsDarkMode }) {

    const theme = {
        background: isDarkMode ? Colors.dark.background : Colors.light.background,
        card: isDarkMode ? '#1A2235' : '#FFFFFF',
        text: isDarkMode ? Colors.dark.text : Colors.light.text,
        textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
        primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
        borderColor: isDarkMode ? '#2E3A52' : '#E2E8F0',
        headerBg: isDarkMode ? '#252F45' : '#F8FAFC',
        headerText: isDarkMode ? '#F8FAFC' : '#64748B',
        iconBg: isDarkMode ? '#252F45' : '#F0F4FF',
    };

    const [fullData, setFullData] = useState(null); // The raw JSON
    const [displayList, setDisplayList] = useState([]); // The array of rows (e.g. from "General")
    const [loading, setLoading] = useState(true);
    
    // Selection State
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // UI State
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchLocal = async () => {
            try {
                const rawData = await AsyncStorage.getItem('ATTENDANCE_DATA');
                if (rawData) {
                    const data = JSON.parse(rawData);
                    setFullData(data);

                    // 1. Flatten the data (It might be under "General" or other keys)
                    // We combine all arrays we find into one big list
                    let allRows = [];
                    Object.keys(data).forEach(key => {
                        if (Array.isArray(data[key])) {
                            allRows = [...allRows, ...data[key]];
                        }
                    });
                    
                    setDisplayList(allRows);

                    // 2. Extract Unique Subjects
                    const uniqueSubjects = [...new Set(allRows.map(item => item.PAPER_NAME).filter(Boolean))];
                    setSubjects(uniqueSubjects);
                    
                    if (uniqueSubjects.length > 0) {
                        setSelectedSubject(uniqueSubjects[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLocal();
    }, []);

    // Helper to find value safely
    const getValue = (row, ...keys) => {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
        }
        return '0';
    };

    // Build the grid based on Selected Subject
    const grid = useMemo(() => {
        if (!selectedSubject || displayList.length === 0) return [];

        // 1. Filter rows for the selected subject
        const filteredRows = displayList.filter(row => row.PAPER_NAME === selectedSubject);
        
        let formattedGrid = [];

        // 2. Add Header
        // Note: Your JSON only shows Lecture data. If Tutorial data exists in other rows, it will show up.
        formattedGrid.push(['Month', 'Lec Att.', 'Lec Total']);

        // 3. Map the data
        filteredRows.forEach(row => {
            const rowValues = [
                row.MONTH || row.Month || '-',
                getValue(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended'),
                getValue(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered'),
            ];
            formattedGrid.push(rowValues);
        });

        return formattedGrid;
    }, [selectedSubject, displayList]);

    const COLS = 5; 

    function onSelectSubject(subject) {
        setSelectedSubject(subject);
        setShowDropdown(false);
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
            
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}>
                    <Ionicons name="caret-back" size={27} color={theme.text} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.text }]}>ATTENDANCE</Text>

                <TouchableOpacity 
                    style={[styles.themeButton, { backgroundColor: theme.card }]} 
                    onPress={() => setIsDarkMode(!isDarkMode)}
                >
                     <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
                
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (!fullData || subjects.length === 0) ? (
                    
                    /* EMPTY STATE */
                    <View style={styles.centerContainer}>
                        <View style={[styles.emptyIconCtx, { backgroundColor: theme.iconBg }]}>
                             <Ionicons name="calendar-outline" size={48} color={theme.primary} style={{ opacity: 0.8 }} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Record Found</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                            Attendance data is empty or could not be parsed.
                        </Text>
                    </View>

                ) : (
                    
                    /* DATA VIEW */
                    <>
                        {/* Dropdown Control */}
                        <View style={styles.controlsRow}>
                            <Text style={[styles.selectLabel, { color: theme.textSecondary }]}>Select Subject:</Text>
                            <View style={styles.dropdownRow}>
                                <View style={styles.dropdownWrapper}>
                                    <TouchableOpacity 
                                        style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.borderColor }]} 
                                        onPress={() => setShowDropdown((s) => !s)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>
                                            {selectedSubject}
                                        </Text>
                                        <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                                    </TouchableOpacity>

                                    {showDropdown && (
                                        <View style={[styles.dropdownList, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
                                            <ScrollView style={{maxHeight: 250}} nestedScrollEnabled={true}>
                                                {subjects.map((sub) => (
                                                    <TouchableOpacity key={sub} style={styles.dropdownItem} onPress={() => onSelectSubject(sub)}>
                                                        <Text style={[styles.dropdownItemText, { color: theme.textSecondary }, selectedSubject === sub && { color: theme.primary, fontWeight: '700' }]}>
                                                            {sub}
                                                        </Text>
                                                        {selectedSubject === sub && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Table */}
                        <View style={[styles.tableContainer, { borderColor: theme.borderColor }]}>
                            {grid.map((row, rIdx) => (
                                <View key={`row-${rIdx}`} style={[styles.tableRow, { backgroundColor: theme.card }]}>
                                    {row.map((cell, cIdx) => {
                                        const isHeaderRow = rIdx === 0;
                                        const isRowHeader = cIdx === 0 && !isHeaderRow;
                                        return (
                                            <View 
                                                key={`cell-${rIdx}-${cIdx}`} 
                                                style={[
                                                    styles.tableCell, 
                                                    { borderColor: theme.borderColor },
                                                    isHeaderRow && { backgroundColor: theme.headerBg },
                                                    cIdx === COLS - 1 && styles.tableCellLast
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.cellText, 
                                                    { color: theme.text },
                                                    isHeaderRow && { color: theme.headerText, fontWeight: '700', fontSize: 11 },
                                                    isRowHeader && { fontWeight: '600' }
                                                ]} numberOfLines={1} adjustsFontSizeToFit>
                                                    {cell}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                        
                        {/* Overall Percentage Footer */}
                        {fullData.overall_percentage && (
                             <View style={[styles.footerInfo, { backgroundColor: theme.iconBg }]}>
                                <Ionicons name="pie-chart" size={20} color={theme.primary} />
                                <Text style={[styles.footerText, { color: theme.primary }]}>
                                    Overall Attendance: <Text style={{fontWeight: 'bold'}}>{fullData.overall_percentage}%</Text>
                                </Text>
                             </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    
    // Empty State
    centerContainer: { flex: 1, height: 400, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    emptyIconCtx: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    // Controls
    controlsRow: { marginBottom: 16, zIndex: 10 }, 
    selectLabel: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
    dropdownRow: { flexDirection: 'row', alignItems: 'center' },
    dropdownWrapper: { position: 'relative', flex: 1 },
    dropdown: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' },
    dropdownText: { fontSize: 13, fontWeight: '500', flex: 1 },
    
    dropdownList: { position: 'absolute', top: 50, left: 0, right: 0, borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 999, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownItemText: { fontSize: 13 },
    
    // Table
    tableContainer: { overflow: 'hidden', borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    tableRow: { flexDirection: 'row' },
    tableCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 2, borderRightWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
    tableCellLast: { borderRightWidth: 0 },
    cellText: { fontSize: 12, textAlign: 'center' },

    // Footer
    footerInfo: { padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }
});