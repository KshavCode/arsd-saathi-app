export const UPDATES_DATA = {
    date: "September 2026",
    updates: [
        { 
            title: "Fast Login & Background Sync", 
            desc: "Credentials verify in seconds, routing you straight to your dashboard while details load smoothly in the background." 
        },
        { 
            title: "Today's Attendance Badges", 
            desc: "Upcoming class cards now display live color-coded attendance percentage (Safe, Borderline, or Must Attend)." 
        },
        { 
            title: "Smart Timetable & Custom Subjects", 
            desc: "Combined attendance and faculty subject lists with deduplication, plus an 'Add Custom' button for electives." 
        },
        { 
            title: "Tactile Haptic Feedback", 
            desc: "Native subtle vibrations when switching tabs, stepping attendance counters, and saving timetable slots." 
        }
    ],
    fixes: [
        { 
            title: "Login Error Detection", 
            desc: "Incorrect credentials or portal issues are now clearly flagged on the login screen instead of failing silently." 
        },
        { 
            title: "Missing Timetable Subjects", 
            desc: "Fixed subject omissions when some teachers have not yet published attendance data." 
        },
        { 
            title: "Memory & Battery Optimization", 
            desc: "Cleaned up memory leaks, dangling timers, and duplicate fetches for improved battery life and stability." 
        }
    ]
};
