import Constants from 'expo-constants';

export const UPDATES_DATA = {
    version: Constants.expoConfig.version,
    date: "August 2026",
    updates: [
        { title: "App Launch", desc: "X is now the official app. Congratulations to the development team and the student community!"},
        { title: "Brand New Layout", desc: "With a brand-new look, organized screens, and a floating button, navigation is now smoother, faster, and BETTER than ever." },
        { title: "ArsdSaathi Is Live", desc: "Meet ArsdSaathi, your helpful companion bot, designed to provide concise answers to all your queries." },
        { title: "Helpdesk & Scholarships", desc: "Students can now access valuable and supportive information through these tabs." },
        { title: "Timetable to PDF", desc: "Exporting now lets you download your timetable in a clean, easy-to-read PDF format." },
        { title: "What's New Page", desc: "Missed the latest updates? Explore all changes conveniently in one place." },
        { title: "4 New Themes", desc: "Enjoy 10 light themes and 10 dark themes to personalize your experience." },
    ],
    fixes: [
        { title: "Notices Screen", desc: "Updated the screen to reflect recent changes to the website." },
        { title: "No Internet Banner", desc: "The app now displays an internet connection error correctly." },
        { title: "Next Sync", desc: "Rebranded 'Last Synced' for letting students know the main reason to use ArsdSaathi." },
        { title: "Forgot Password", desc: "List of steps to try if a student forgot his/her password are enlisted during the login page." }
    ]
};