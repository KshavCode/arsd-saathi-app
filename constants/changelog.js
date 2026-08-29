import Constants from 'expo-constants';

export const UPDATES_DATA = {
    version: Constants.expoConfig.version,
    date: "August 2026",
    updates: [
        { title: "App Launch", desc: "ArsdSaathi is now the official app. Congratulations to the development team and the student community!"},
        { title: "Play Store Soon", desc: "We are trying our best to get the app on the Play Store. Please have some patience." },
    ],
    fixes: [
        { title: "Notices Screen", desc: "Updated the screen to reflect recent changes to the website." },
        { title: "Fetch Error", desc: "The data fetching is fixed and now working fine." },
    ]
};
