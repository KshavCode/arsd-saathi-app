import { Colors } from '@/constants/themeStyle'; // Import Colors
import { createStackNavigator } from '@react-navigation/stack';
import * as NavigationBar from 'expo-navigation-bar'; // <--- Import this
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import Attendance from './tab1/AttendanceTab';
import Details from './tab1/DetailsTab';
import Faculty from './tab1/FacultyTab';
import Home from './tab1/HomeTab';
import Login from './tab1/LoginTab';

const Stack = createStackNavigator();

export default function Stack1() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // 2. Control the Bottom Navigation Bar (Android Only)
    useEffect(() => {
        if (Platform.OS === 'android') {
            const color = isDarkMode ? Colors.dark.background : Colors.light.background;
            
            // Sets the background color of the bottom bar
            NavigationBar.setBackgroundColorAsync(color);
            
            // Sets the icon style (light icons on dark bg, or dark icons on light bg)
            NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
        }
    }, [isDarkMode]);

    // 3. Define the background color for the Navigator itself (Fixes the white flash)
    const currentBackgroundColor = isDarkMode ? Colors.dark.background : Colors.light.background;

    const themeProps = {
        isDarkMode,
        setIsDarkMode
    };

    return (
        <Stack.Navigator 
            initialRouteName="Login" 
            screenOptions={{ 
                headerShown: false,
                // Fixes the "White Flash" during transitions
                cardStyle: { backgroundColor: currentBackgroundColor } 
            }}
        >
            <Stack.Screen name="Login" component={Login} />
            
            <Stack.Screen name="Home">
                {(props) => <Home {...props} {...themeProps} />}
            </Stack.Screen>

            <Stack.Screen name="Attendance">
                {(props) => <Attendance {...props} {...themeProps} />}
            </Stack.Screen>

            <Stack.Screen name="Details">
                {(props) => <Details {...props} {...themeProps} />}
            </Stack.Screen>

            <Stack.Screen name="Faculty">
                {(props) => <Faculty {...props} {...themeProps} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
}