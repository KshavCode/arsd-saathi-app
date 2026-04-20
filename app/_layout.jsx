import { Colors } from '@/constants/themeStyle';
import { toastConfig } from '@/constants/toastConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';

import Attendance from './attendance';
import Details from './basic';
import Faculty from './faculty';
import Home from './home';
import Login from './index';
import Notice from './notice';
import Predictor from './predictor';
import Support from './support';
import Timetable from './timetable';
import Whatsnew from './whatsnew';

import { ThemeContext, ThemeProvider } from '@/context/ThemeContext';

const Stack = createStackNavigator();
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

export default function Stack1() {
  return (
  <>
    <ThemeProvider>
        <StackContent />
    </ThemeProvider>
    <Toast config={toastConfig}/>
  </>
  );
}

function StackContent() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [homeParams, setHomeParams] = useState({ requiresSync: false });
  const { isDarkMode } = useContext(ThemeContext)

  useEffect(() => {
    const verifySession = async () => {
      try {
        const now = Date.now();
        const credentialsStr = await AsyncStorage.getItem('USER_CREDENTIALS');
        const loginTimestampStr = await AsyncStorage.getItem('LOGIN_TIMESTAMP');
        const dataTimestampStr = await AsyncStorage.getItem('DATA_TIMESTAMP');
        if (!credentialsStr || !loginTimestampStr) {
            setInitialRoute('Login');
        } 
        else {
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
      } 
      catch (error) {
        setInitialRoute('Login'); 
        console.log(error)
      } 
      finally {
        setIsAppReady(true);
      }
    };
    verifySession();
  }, []);

    const currentBackgroundColor = isDarkMode ? Colors.lostInBlue.background : Colors.Default.background;
    if (!isAppReady) {
      return (
        <View style={{ flex: 1, backgroundColor: currentBackgroundColor, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDarkMode ? Colors.lostInBlue.primary : Colors.Default.primary} />
        </View>
      );
    }

    return (
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          detachPreviousScreen: false,
        }}
      >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Home" component={Home} initialParams={homeParams} />
          <Stack.Screen name="Attendance" component={Attendance} initialParams={homeParams} />        
          <Stack.Screen name="Details" component={Details} initialParams={homeParams} />
          <Stack.Screen name="Faculty" component={Faculty} initialParams={homeParams} />
          <Stack.Screen name="Notice" component={Notice} initialParams={homeParams} />
          <Stack.Screen name="Predictor" component={Predictor} initialParams={homeParams} />
          <Stack.Screen name="Timetable" component={Timetable} initialParams={homeParams} />
          <Stack.Screen name="Support" component={Support} initialParams={homeParams} />
          <Stack.Screen name="Whatsnew" component={Whatsnew} initialParams={homeParams} />

      </Stack.Navigator>
    );
}