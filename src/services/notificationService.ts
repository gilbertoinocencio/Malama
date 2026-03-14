export const NotificationService = {
    // Request permission from the browser
    requestPermission: async (): Promise<boolean> => {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            localStorage.setItem('notifications_enabled', 'true');
            return true;
        }
        return false;
    },

    // Check if notifications are enabled
    isEnabled: (): boolean => {
        return localStorage.getItem('notifications_enabled') === 'true' && Notification.permission === 'granted';
    },

    // Disable notifications
    disable: () => {
        localStorage.setItem('notifications_enabled', 'false');
    },

    // Send a notification immediately
    send: (title: string, body: string, icon = '/pwa-192x192.png') => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon });
        }
    },

    // Check scheduling logic (called every minute by App)
    checkReminders: () => {
        if (!NotificationService.isEnabled()) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Key to prevent multiple notifications in the same minute
        const lastCheckKey = 'last_notification_check';
        const lastCheck = localStorage.getItem(lastCheckKey);
        const timeKey = `${hours}:${minutes}`;

        if (lastCheck === timeKey) return; // Already checked this minute

        // Hydration: Every 2 hours between 08:00 and 20:00
        // 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00
        if (minutes === 0 && hours >= 8 && hours <= 20 && hours % 2 === 0) {
            NotificationService.send('💧 Time to Hydrate', 'Drink a glass of water to keep your flow going!');
        }

        // Meals: 09:00, 12:00, 15:00, 18:00, 21:00
        // Using a simpler static schedule for MVP
        const mealHours = [9, 12, 15, 18, 21];
        if (minutes === 0 && mealHours.includes(hours)) {
            NotificationService.send('🍽️ Meal Time', 'Fuel your body with a nutritious meal.');
        }

        localStorage.setItem(lastCheckKey, timeKey);
    }
};
