import { Colors } from '@/constants/themeStyle';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- Import this
import { createStackNavigator } from '@react-navigation/stack';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native'; // <--- Added View and ActivityIndicator

import Attendance from './attendance';
import Details from './basic';
import Faculty from './faculty';
import Home from './home';
import Login from './index';

const Stack = createStackNavigator();

// Time Constants (in milliseconds)
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

export default function Stack1() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    // --- GATEKEEPER STATE ---
    const [isAppReady, setIsAppReady] = useState(false);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [homeParams, setHomeParams] = useState({ requiresSync: false });

    // 1. Check Timestamps before showing the app
    useEffect(() => {
        const verifySession = async () => {
            try {
                const now = Date.now();
                const credentialsStr = await AsyncStorage.getItem('USER_CREDENTIALS');
                const loginTimestampStr = await AsyncStorage.getItem('LOGIN_TIMESTAMP');
                const dataTimestampStr = await AsyncStorage.getItem('DATA_TIMESTAMP');

                // Check 1: Do we have credentials at all?
                if (!credentialsStr || !loginTimestampStr) {
                    setInitialRoute('Login');
                } else {
                    const loginAge = now - parseInt(loginTimestampStr);
                    
                    // Check 2: Are credentials older than 30 days?
                    if (loginAge > THIRTY_DAYS) {
                        await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'LOGIN_TIMESTAMP']);
                        setInitialRoute('Login');
                    } else {
                        // Credentials are valid, go to Home
                        setInitialRoute('Home');
                        
                        // Check 3: Is the data older than 2 days?
                        const dataAge = now - parseInt(dataTimestampStr || "0");
                        if (dataAge > TWO_DAYS) {
                            setHomeParams({ requiresSync: true }); // Tell Home to scrape in background
                        } else {
                            setHomeParams({ requiresSync: false }); // Data is fresh
                        }
                    }
                }
            } catch (error) {
                console.error("Session check failed:", error);
                setInitialRoute('Login'); // Failsafe
            } finally {
                setIsAppReady(true); // Let the app render
            }
        };

        verifySession();
    }, []);

    // 2. Control the Bottom Navigation Bar (Android Only)
    useEffect(() => {
        if (Platform.OS === 'android') {
            const color = isDarkMode ? Colors.dark.background : Colors.light.background;
            NavigationBar.setBackgroundColorAsync(color);
            NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
        }
    }, [isDarkMode]);

    const currentBackgroundColor = isDarkMode ? Colors.dark.background : Colors.light.background;
    const themeProps = { isDarkMode, setIsDarkMode };

    // 3. Show a loading spinner while checking AsyncStorage
    if (!isAppReady) {
        return (
            <View style={{ flex: 1, backgroundColor: currentBackgroundColor, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <Stack.Navigator 
            initialRouteName={initialRoute} // <--- Dynamically set to Login or Home
            screenOptions={{ 
                headerShown: false,
                cardStyle: { backgroundColor: currentBackgroundColor } 
            }}
        >
            <Stack.Screen name="Login" component={Login} />
            
            {/* We pass the homeParams to the initial route */}
            <Stack.Screen name="Home" initialParams={homeParams}>
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