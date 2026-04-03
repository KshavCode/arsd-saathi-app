import * as Notifications from 'expo-notifications';

export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleNotification = async (title, body, trigger) => {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
};