import Constants from 'expo-constants';

export const UPDATES_DATA = {
    version: Constants.expoConfig.version,
    date: "April 2026",
    updates: [
        { title: "Timetable to PDF", desc: "Exporting now allows you to download your timetable in a clean PDF format." },
        { title: "Next Sync", desc: "Rebranded 'Last Synced' for letting students know the main reason to use ArsdSaathi." },
        { title: "What's New Page", desc: "Missing on new updates? Get to know all the changes at just one screen!" },
        { title: "FAQs Page", desc: "Most common questions that freshers might ask, will be answered here! Also, the developers will use this feature to announce and communicate with the community." },
        { title: "4 New Themes", desc: "Enjoy 10 sets of light and dark modes each." },
    ],
    fixes: [
        { title: "Star the Project", desc: "Users can support alternatively by creating an account on Github and 'star' the repository." },
        { title: "Forgot Password", desc: "List of steps to try if a student forgot his/her password are enlisted during the login page." }
    ]
};