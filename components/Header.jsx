import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function Header({ navigation, screenName }) {
    const {theme, themeName, setThemeName} = useTheme()
    return (
            <View style={styles.headerRow} accessible={false}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}
                    accessibilityRole="button"
                    accessibilityLabel="Go Back"
                    accessibilityHint="Returns to the previous screen"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="caret-back" size={30} color={theme.primary} importantForAccessibility="no" />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">{screenName}</Text>
            </View>
    )
}

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
});