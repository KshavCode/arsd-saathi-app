import { Colors } from '@/constants/themeStyle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import Attendance from './attendance';
import Details from './basic';
import Faculty from './faculty';
import Home from './home';
import Login from './index';
import Predictor from './predictor';
import Timetable from './timetable';

const Stack = createStackNavigator();

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

export default function Stack1() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAppReady, setIsAppReady] = useState(false);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [homeParams, setHomeParams] = useState({ requiresSync: false });

    useEffect(() => {
        const verifySession = async () => {
            try {
                const now = Date.now();
                const credentialsStr = await AsyncStorage.getItem('USER_CREDENTIALS');
                const loginTimestampStr = await AsyncStorage.getItem('LOGIN_TIMESTAMP');
                const dataTimestampStr = await AsyncStorage.getItem('DATA_TIMESTAMP');
                const savedTheme = await AsyncStorage.getItem('DARK_THEME');

                if (savedTheme !== null) setIsDarkMode(JSON.parse(savedTheme));

                if (!credentialsStr || !loginTimestampStr) {
                    setInitialRoute('Login');
                } else {
                    const loginAge = now - parseInt(loginTimestampStr);
                    if (loginAge > THIRTY_DAYS) {
                        await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'LOGIN_TIMESTAMP']);
                        setInitialRoute('Login');
                    } else {
                        setInitialRoute('Home');
                        const dataAge = now - parseInt(dataTimestampStr || "0");
                        if (dataAge > TWO_DAYS) setHomeParams({ requiresSync: true });
                    }
                }
            } catch (error) {
                setInitialRoute('Login'); 
            } finally {
                setIsAppReady(true);
            }
        };
        verifySession();
    }, []);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const color = isDarkMode ? Colors.dark.background : Colors.light.background;
            NavigationBar.setBackgroundColorAsync(color);
            NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
        }
    }, [isDarkMode]);

    const currentBackgroundColor = isDarkMode ? Colors.dark.background : Colors.light.background;
    const themeProps = { isDarkMode, setIsDarkMode };

    if (!isAppReady) {
        return (
            <View style={{ flex: 1, backgroundColor: currentBackgroundColor, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={isDarkMode ? Colors.dark.primary : Colors.light.primary} />
            </View>
        );
    }

    return (
            <Stack.Navigator 
                initialRouteName={initialRoute}
                screenOptions={{ 
                    headerShown: false,
                    cardStyle: { backgroundColor: currentBackgroundColor } 
                }}
            >
                <Stack.Screen name="Login" component={Login} />
                
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
            
                <Stack.Screen name="Predictor">
                    {(props) => <Predictor {...props} {...themeProps} />}
                </Stack.Screen>
            
                <Stack.Screen name="TimeTable">
                    {(props) => <Timetable {...props} {...themeProps} />}
                </Stack.Screen>
            </Stack.Navigator>
    );
}