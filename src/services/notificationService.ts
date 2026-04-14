import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import { MealService } from './mealService';

interface UserProfile {
    meals_per_day?: number;
    eating_window_start?: string;
    eating_window_end?: string;
    glp1_mode?: boolean;
    glp1_medication?: string;
    glp1_current_dose_mg?: number;
    glp1_meal_schedule?: Array<{ time: string; label: string; notes?: string }>;
    glp1_application_schedule?: {
        frequency: 'weekly' | 'daily';
        day_of_week?: number; // 0=Sun … 6=Sat (weekly only)
        time: string;         // "HH:MM"
    };
}

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

    // Parse time string (HH:MM) to minutes from midnight
    parseTimeToMinutes: (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + (minutes || 0);
    },

    // Get current time in minutes from midnight
    getCurrentTimeInMinutes: (): number => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    },

    // Check if current time is within eating window
    isWithinEatingWindow: (windowStart: string, windowEnd: string): boolean => {
        const current = NotificationService.getCurrentTimeInMinutes();
        const start = NotificationService.parseTimeToMinutes(windowStart);
        const end = NotificationService.parseTimeToMinutes(windowEnd);

        if (end > start) {
            return current >= start && current <= end;
        } else {
            // Window crosses midnight
            return current >= start || current <= end;
        }
    },

    // Get time remaining until end of eating window (in minutes)
    getTimeUntilWindowEnd: (windowEnd: string): number => {
        const current = NotificationService.getCurrentTimeInMinutes();
        const end = NotificationService.parseTimeToMinutes(windowEnd);
        return end - current;
    },

    // Get today's meals count for a user
    getTodayMealCount: async (userId: string): Promise<number> => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const { data: meals, error } = await supabase
                .from('meals')
                .select('id')
                .eq('user_id', userId)
                .gte('created_at', todayStr)
                .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

            if (error) {
                console.error('Error fetching meals:', error);
                return 0;
            }

            return meals?.length || 0;
        } catch (error) {
            console.error('Error in getTodayMealCount:', error);
            return 0;
        }
    },

    // Check if we already sent a reminder in the last 30 minutes (to avoid spam)
    shouldSendReminder: (reminderType: string): boolean => {
        const lastSentKey = `last_reminder_${reminderType}`;
        const lastSent = localStorage.getItem(lastSentKey);
        const now = Date.now();

        if (!lastSent) return true;

        const lastSentTime = parseInt(lastSent);
        const minutesSinceLastReminder = (now - lastSentTime) / (1000 * 60);

        return minutesSinceLastReminder >= 30; // Minimum 30 minutes between reminders
    },

    // Mark reminder as sent
    markReminderSent: (reminderType: string) => {
        const lastSentKey = `last_reminder_${reminderType}`;
        localStorage.setItem(lastSentKey, Date.now().toString());
    },

    // Mark today's GLP-1 dose as confirmed (prevents missed-dose alert)
    markGlp1DoseConfirmed: () => {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`glp1_dose_confirmed_${today}`, 'true');
    },

    // Main check function - called every minute by App
    checkMealReminders: async (userId: string, profile: UserProfile) => {
        if (!NotificationService.isEnabled()) return;

        const { meals_per_day = 3, eating_window_start = '08:00', eating_window_end = '20:00' } = profile;

        const currentMinutes = NotificationService.getCurrentTimeInMinutes();
        const windowStartMinutes = NotificationService.parseTimeToMinutes(eating_window_start);
        const windowEndMinutes = NotificationService.parseTimeToMinutes(eating_window_end);
        const timeRemaining = windowEndMinutes - currentMinutes;

        // Only send reminders within the eating window
        if (!NotificationService.isWithinEatingWindow(eating_window_start, eating_window_end)) {
            return;
        }

        try {
            const mealCount = await NotificationService.getTodayMealCount(userId);
            const mealsRemaining = meals_per_day - mealCount;

            // No meals remaining - user completed their goal
            if (mealsRemaining <= 0) {
                return;
            }

            // Calculate ideal interval between meals
            const windowDuration = windowEndMinutes - windowStartMinutes;
            const idealInterval = windowDuration / meals_per_day;

            // Check if user is behind schedule
            const timeElapsed = currentMinutes - windowStartMinutes;
            const expectedMealsByNow = Math.floor(timeElapsed / idealInterval);
            const isBehindSchedule = mealCount < expectedMealsByNow;

            // Reminder 1: Mid-window check (50% of window elapsed, still have meals pending)
            const midWindowPoint = windowStartMinutes + (windowDuration * 0.5);
            if (currentMinutes >= midWindowPoint && currentMinutes < midWindowPoint + 1 && mealsRemaining > 0) {
                if (NotificationService.shouldSendReminder('mid_window')) {
                    const urgency = mealsRemaining > 1 ? 'Você ainda tem' : 'Ainda falta';
                    NotificationService.send(
                        '🍽️ Meta do dia em andamento',
                        `${urgency} ${mealsRemaining} refeição(ões) para completar sua meta. Aproveite o restante da janela!`,
                    );
                    NotificationService.markReminderSent('mid_window');
                }
            }

            // Reminder 2: 2 hours before window ends
            if (timeRemaining <= 120 && timeRemaining > 119 && mealsRemaining > 0) {
                if (NotificationService.shouldSendReminder('two_hours_left')) {
                    NotificationService.send(
                        '⏰ Atenção: janela fechando',
                        `Faltam 2 horas para o fim da sua janela alimentar. Você ainda precisa de ${mealsRemaining} refeição(ões).`,
                    );
                    NotificationService.markReminderSent('two_hours_left');
                }
            }

            // Reminder 3: 1 hour before window ends (urgent)
            if (timeRemaining <= 60 && timeRemaining > 59 && mealsRemaining > 0) {
                if (NotificationService.shouldSendReminder('one_hour_left')) {
                    NotificationService.send(
                        '🚨 Última chamada!',
                        `Sua janela alimentar fecha em 1 hora. Não esqueça de registrar suas ${mealsRemaining} refeição(ões) restante(s)!`,
                    );
                    NotificationService.markReminderSent('one_hour_left');
                }
            }

            // Reminder 4: 30 minutes before window ends (final warning)
            if (timeRemaining <= 30 && timeRemaining > 29 && mealsRemaining > 0) {
                if (NotificationService.shouldSendReminder('thirty_min_left')) {
                    NotificationService.send(
                        '⚠️ Janela quase fechada',
                        `Últimos 30 minutos! Registre sua(s) ${mealsRemaining} refeição(ões) agora para manter seu fluxo.`,
                    );
                    NotificationService.markReminderSent('thirty_min_left');
                }
            }

            // Reminder 5: If user is significantly behind schedule (more than 1 meal behind)
            const behindByMeals = expectedMealsByNow - mealCount;
            if (behindByMeals >= 2 && isBehindSchedule) {
                if (NotificationService.shouldSendReminder('behind_schedule')) {
                    NotificationService.send(
                        '📊 Você está atrasado',
                        `Deveria ter feito pelo menos ${expectedMealsByNow} refeições até agora. Aproveite o tempo restante!`,
                    );
                    NotificationService.markReminderSent('behind_schedule');
                }
            }

        } catch (error) {
            console.error('Error checking meal reminders:', error);
        }
    },

    // Check scheduling logic (called every minute by App)
    checkReminders: async (userId?: string, profile?: UserProfile) => {
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

        // Check meal reminders if user profile is available
        if (userId && profile) {
            await NotificationService.checkMealReminders(userId, profile);
        } else {
            // Fallback to static meal schedule if no profile
            const mealHours = [9, 12, 15, 18, 21];
            if (minutes === 0 && mealHours.includes(hours)) {
                NotificationService.send('🍽️ Meal Time', 'Fuel your body with a nutritious meal.');
            }
        }

        // GLP-1 doctor-prescribed meal schedule reminders
        if (profile?.glp1_mode && profile?.glp1_meal_schedule && profile.glp1_meal_schedule.length > 0) {
            const nowMinutes = hours * 60 + minutes;
            for (const slot of profile.glp1_meal_schedule) {
                if (!slot.time || !slot.label) continue;
                const [h, m] = slot.time.split(':').map(Number);
                const slotMinutes = h * 60 + (m || 0);
                // Notify within a 1-minute window of the scheduled slot
                if (nowMinutes === slotMinutes) {
                    const reminderKey = `glp1_meal_${slot.time}`;
                    if (NotificationService.shouldSendReminder(reminderKey)) {
                        NotificationService.send(
                            `🍽️ ${slot.label}`,
                            slot.notes || 'Hora de se alimentar — lembrete do seu médico!'
                        );
                        NotificationService.markReminderSent(reminderKey);
                    }
                }
            }
        }

        // GLP-1 application (dose) reminders
        if (profile?.glp1_mode && profile?.glp1_application_schedule) {
            const schedule = profile.glp1_application_schedule;
            const nowMinutes = hours * 60 + minutes;
            const [schedH, schedM] = schedule.time.split(':').map(Number);
            const schedMinutes = schedH * 60 + (schedM || 0);
            const medicationLabel = profile.glp1_medication
                ? profile.glp1_medication.charAt(0).toUpperCase() + profile.glp1_medication.slice(1)
                : 'GLP-1';
            const doseLabel = profile.glp1_current_dose_mg
                ? ` (${profile.glp1_current_dose_mg} mg)`
                : '';

            const isDoseDay =
                schedule.frequency === 'daily' ||
                (schedule.frequency === 'weekly' && now.getDay() === (schedule.day_of_week ?? 1));

            if (isDoseDay) {
                // On-time reminder (exact minute)
                if (nowMinutes === schedMinutes) {
                    const reminderKey = `glp1_dose_${timeKey}`;
                    if (NotificationService.shouldSendReminder(reminderKey)) {
                        NotificationService.send(
                            `💉 Hora da dose de ${medicationLabel}!`,
                            `Aplique sua dose${doseLabel} agora. Registre no app após a aplicação.`
                        );
                        NotificationService.markReminderSent(reminderKey);
                    }
                }

                // 1-hour "missed dose" alert — if the window passed and no confirmation recorded
                if (nowMinutes === schedMinutes + 60) {
                    const missedKey = `glp1_missed_${timeKey.split(':')[0]}`;
                    const confirmedKey = `glp1_dose_confirmed_${new Date().toISOString().split('T')[0]}`;
                    const alreadyConfirmed = localStorage.getItem(confirmedKey) === 'true';
                    if (!alreadyConfirmed && NotificationService.shouldSendReminder(missedKey)) {
                        NotificationService.send(
                            `⚠️ Dose de ${medicationLabel} pendente`,
                            'Você ainda não registrou a aplicação de hoje. Abra o app para confirmar ou reagendar.'
                        );
                        NotificationService.markReminderSent(missedKey);
                    }
                }
            }
        }

        localStorage.setItem(lastCheckKey, timeKey);
    }
};
