import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const initNotifications = async () => {
  // ANDROID CHANNEL (MANDATORY)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // PERMISSION
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// SIMPLE SCHEDULER
export const scheduleNotification = async (title, body, seconds = 5) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: {
      seconds,
    },
  });
};