import Constants from 'expo-constants';

export const UPDATES_DATA = {
    version: Constants.expoConfig.version,
    date: "May 2026",
    updates: [
        { title: "Advertisements", desc: "Businesses, Cafes, PGs, Societies can now advertise to reach 2K+ students with ArsdSaathi!" },
        { title: "Timetable to PDF", desc: "Exporting now allows you to download your timetable in a clean PDF format." },
        { title: "Next Sync", desc: "Rebranded 'Last Synced' for letting students know the main reason to use ArsdSaathi." },
        { title: "What's New Page", desc: "Missing on the new update? Get to know all the changes at just one screen!" },
        { title: "FAQs Page", desc: "Common questions would be answered here." },
        { title: "4 New Themes", desc: "Enjoy 10 sets of light and dark modes each." },
    ],
    fixes: [
        { title: "Star the Project", desc: "Users can support alternatively by creating an account on Github and 'star' the repository." },
        { title: "Forgot Password", desc: "List of steps to try if a student forgot his/her password are enlisted during the login page." }
    ]
};