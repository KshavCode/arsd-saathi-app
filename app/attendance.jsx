import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AttendanceTab({ navigation }) {
    const {theme} = useTheme()
    const [fullData, setFullData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchLocal = async () => {
            try {
                const rawData = await AsyncStorage.getItem('ATTENDANCE_DATA');
                if (rawData) {
                    const data = JSON.parse(rawData);
                    setFullData(data);

                    // 1. Extract Unique Subjects from BOTH theory and practical
                    const theorySubjects = data.theory ? Object.keys(data.theory) : [];
                    const tutorialSubjects = data.practical ? Object.keys(data.practical) : [];

                    const uniqueSubjects = [...new Set([...theorySubjects, ...tutorialSubjects])];
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

    // Defaults to '-'
    const getValue = (row, ...keys) => {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
        }
        return '-';
    };

    // Build the 5-column grid based on Selected Subject
    const grid = useMemo(() => {
        if (!selectedSubject || !fullData) return [];

        let formattedGrid = [];

        // Headers
        formattedGrid.push(['Month', 'Lec Att.', 'Lec Total', 'Prac Att.', 'Prac Total']);

        // Fetch the arrays for the selected subject
        const theoryRows = fullData.theory?.[selectedSubject] || [];
        const tutorialRows = fullData.practical?.[selectedSubject] || [];

        // Merge Theory and Practical data by Month
        const mergedByMonth = {};

        const addRowsToMap = (rows, type) => {
            if (!Array.isArray(rows)) return;

            rows.forEach(row => {
                const month = row.MONTH || row.Month || 'Unknown';

                // Initialize the month if it doesn't exist
                if (!mergedByMonth[month]) {
                    mergedByMonth[month] = { month, lecAtt: '-', lecTotal: '-', pracAtt: '-', pracTotal: '-' };
                }

                // Populate the correct columns based on the type
                if (type === 'theory') {
                    mergedByMonth[month].lecAtt = getValue(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
                    mergedByMonth[month].lecTotal = getValue(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
                } else if (type === 'practical') {
                    mergedByMonth[month].pracAtt = getValue(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
                    mergedByMonth[month].pracTotal = getValue(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
                }
            });
        };

        addRowsToMap(theoryRows, 'theory');
        addRowsToMap(tutorialRows, 'practical');

        // Convert the merged map back into an array for grid
        Object.values(mergedByMonth).forEach(data => {
            formattedGrid.push([data.month, data.lecAtt, data.lecTotal, data.pracAtt, data.pracTotal]);
        });

        return formattedGrid;
    }, [selectedSubject, fullData]);

    const COLS = 5;

    // Readable sentence for screen readers from a table row
    const getRowAccessibilityLabel = (row, isHeaderRow) => {
        if (isHeaderRow) return null;

        const [month, lecAtt, lecTotal, pracAtt, pracTotal] = row;

        let label = `In ${month}, `;
        if (lecAtt !== '-' && lecTotal !== '-') {
            label += `you attended ${lecAtt} out of ${lecTotal} theory classes. `;
        }
        if (pracAtt !== '-' && pracTotal !== '-') {
            label += `You attended ${pracAtt} out of ${pracTotal} practical classes.`;
        }
        return label;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Header navigation={navigation} screenName='ATTENDANCE' />

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Loading attendance data" />
                    </View>
                ) : (!fullData || subjects.length === 0) ? (

                    /* EMPTY STATE */
                    <Animatable.View style={styles.centerContainer} accessible={true} animation='zoomIn' duration={500} useNativeDriver> 
                        <View style={[styles.emptyIconCtx, { backgroundColor: theme.card+'A0' }]} importantForAccessibility="no-hide-descendants">
                             <Ionicons name="calendar-outline" size={48} color={theme.primary} style={{ opacity: 0.8 }} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Record Found</Text>
                        <Text style={[styles.emptySub, { color: theme.secondary }]}>
                            Attendance data is empty, kindly verify it on portal in case of an error.
                        </Text>
                    </Animatable.View>

                ) : (

                    /* DATA VIEW */
                    <View>
                        <View style={styles.controlsRow}>
                            <Text style={[styles.selectLabel, { color: theme.secondary }]}>Select Subject:</Text>
                            <TouchableOpacity
                                style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.secondary }]}
                                onPress={() => setShowDropdown(true)}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={`Selected subject: ${selectedSubject}. Open subject list.`}
                                accessibilityHint="Opens a modal to select a different subject"
                            >
                                <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1} importantForAccessibility="no">
                                    {selectedSubject}
                                </Text>
                                <Ionicons name={'chevron-down'} size={18} color={theme.secondary} importantForAccessibility="no" />
                            </TouchableOpacity>

                            <Modal 
                                visible={showDropdown} 
                                transparent={true} 
                                animationType="fade" 
                                onRequestClose={() => setShowDropdown(false)}
                                accessibilityViewIsModal={true}
                            >
                                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPressOut={() => setShowDropdown(false)} accessibilityLabel="Close subject list" accessibilityRole="button">
                                    <View style={[styles.modalListContainer, { backgroundColor: theme.background, borderColor: theme.secondary }]}>
                                        <Text style={[styles.modalListHeader, { color: theme.text, backgroundColor: theme.iconBg, borderBottomWidth: .5, borderColor:theme.primary}]} accessibilityRole="header">Select a Subject</Text>
                                        <ScrollView style={{maxHeight: 350}} showsVerticalScrollIndicator={true}>
                                            {subjects.map((sub) => (
                                                <TouchableOpacity 
                                                    key={sub} 
                                                    style={[styles.dropdownItem, { borderBottomColor: theme.secondary }]} 
                                                    onPress={() => {
                                                        setSelectedSubject(sub);
                                                        setShowDropdown(false);
                                                    }}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={sub}
                                                    accessibilityState={{ selected: selectedSubject === sub }}
                                                >
                                                    <Text style={[styles.dropdownItemText, { color: theme.secondary }, selectedSubject === sub && { color: theme.primary, fontWeight: '700' }]} importantForAccessibility="no">
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

                        {/* Table */}
                        <View style={[styles.tableContainer, { borderColor: theme.secondary }]} accessibilityLabel={`Attendance records for ${selectedSubject}`}>
                            {grid.map((row, rIdx) => {
                                const isHeaderRow = rIdx === 0;
                                const rowAccessibilityLabel = getRowAccessibilityLabel(row, isHeaderRow);

                                return (
                                    <View
                                        key={`row-${rIdx}`}
                                        style={[styles.tableRow, { backgroundColor: theme.card }]}
                                        accessible={!isHeaderRow} // Make the whole row accessible as one unit (except header)
                                        accessibilityLabel={rowAccessibilityLabel}
                                        accessibilityRole={isHeaderRow ? "none" : "text"}
                                    >
                                        {row.map((cell, cIdx) => {
                                            const isRowHeader = cIdx === 0 && !isHeaderRow;
                                            return (
                                                <View
                                                    key={`cell-${rIdx}-${cIdx}`}
                                                    style={[ styles.tableCell,  { borderColor: theme.secondary }, isHeaderRow && { backgroundColor: theme.primary + '20' }, cIdx === COLS - 1 && styles.tableCellLast ]}
                                                    importantForAccessibility={isHeaderRow ? "yes" : "no-hide-descendants"} // Hide individual cells
                                                >
                                                    <Text style={[ styles.cellText,  { color: theme.text }, isHeaderRow && { color: theme.text, fontWeight: '700', fontSize: 10 }, isRowHeader && { fontWeight: '600' } ]}
                                                        numberOfLines={1}
                                                        adjustsFontSizeToFit
                                                    >
                                                        {cell}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Theory Percentage Footer */}
                        {fullData.theory_percentage && (
                             <View style={[styles.footerInfo, { backgroundColor: theme.card+'A0' }]} accessible={true} accessibilityLabel={`Overall Theory Attendance: ${fullData.theory_percentage} percent`}>
                                <Ionicons name="pie-chart" size={20} color={theme.primary} importantForAccessibility="no" />
                                <Text style={[styles.footerText, { color: theme.primary }]} importantForAccessibility="no">
                                    Theory Attendance: <Text style={{fontWeight: 'bold'}}>{fullData.theory_percentage}%</Text>
                                </Text>
                             </View>
                        )}
                        {/* Practical Percentage Footer */}
                        {fullData.practical_percentage && (
                             <View style={[styles.footerInfo, { backgroundColor: theme.card+'A0', marginTop:10 }]} accessible={true} accessibilityLabel={`Overall Practical Attendance: ${fullData.practical_percentage} percent`}>
                                <Ionicons name="pie-chart" size={20} color={theme.primary} importantForAccessibility="no" />
                                <Text style={[styles.footerText, { color: theme.primary }]} importantForAccessibility="no">
                                    Practical Attendance: <Text style={{fontWeight: 'bold'}}>{fullData.practical_percentage}%</Text>
                                </Text>
                             </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    // Empty State
    centerContainer: { flex: 1, height: 400, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    emptyIconCtx: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    // Controls
    controlsRow: { marginBottom: 20, zIndex: 10 },
    selectLabel: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
    dropdown: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dropdownText: { fontSize: 15, fontWeight: '600', flex: 1 },

    // Modal Dropdown Styles
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalListContainer: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalListHeader: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', padding: 16 },
    dropdownItem: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5 },
    dropdownItemText: { fontSize: 15 },

    // Table
    tableContainer: { overflow: 'hidden', borderRadius: 12, borderWidth: .5, marginBottom: 20 },
    tableRow: { flexDirection: 'row' },
    tableCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 1, borderRightWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
    tableCellLast: { borderRightWidth: 0 },
    cellText: { fontSize: 13, textAlign: 'center' },

    // Footer
    footerInfo: { padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }
});