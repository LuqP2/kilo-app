import { UserSettings } from '../types';

export const FREE_PLAN_LIMIT = 5;

// This function is the single source of truth for current usage stats.
// It handles reading, validating, and resetting the daily count if needed.
const getUsageStats = (): { count: number, lastReset: number } => {
    try {
        const settingsStr = localStorage.getItem('userSettings');
        if (!settingsStr) {
            return { count: 0, lastReset: Date.now() };
        }

        const settings: Partial<UserSettings> = JSON.parse(settingsStr);
        const usage = settings.dailyGenerations || { count: 0, lastReset: 0 };

        const lastResetDate = new Date(usage.lastReset);
        const today = new Date();

        // Check if the last reset was on a different day, month, or year.
        if (
            lastResetDate.getFullYear() !== today.getFullYear() ||
            lastResetDate.getMonth() !== today.getMonth() ||
            lastResetDate.getDate() !== today.getDate()
        ) {
            // It's a new day, so reset the counter.
            return { count: 0, lastReset: today.getTime() };
        }

        return usage;
    } catch (e) {
        console.error("Failed to read usage from localStorage", e);
        // On failure, default to a safe state (no usage counted).
        return { count: 0, lastReset: Date.now() };
    }
};

const saveUsage = (usage: { count: number, lastReset: number }): void => {
     try {
        const settingsStr = localStorage.getItem('userSettings');
        // Ensure we don't overwrite existing settings.
        const settings = settingsStr ? JSON.parse(settingsStr) : {};
        settings.dailyGenerations = usage;
        localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save usage to localStorage", e);
    }
};

/**
 * Checks if the user can perform a generation and increments the count.
 * Throws an error if the limit is reached.
 */
export const checkAndIncrementUsage = (isPro: boolean): void => {
    // Pro users have no limits.
    if (isPro) {
        return;
    }

    const { count, lastReset } = getUsageStats();

    if (count >= FREE_PLAN_LIMIT) {
        throw new Error('LIMIT_REACHED');
    }

    // Increment and save the new count.
    const newUsage = { count: count + 1, lastReset };
    saveUsage(newUsage);
};

/**
 * Gets the number of remaining generations for the day.
 */
export const getRemainingGenerations = (isPro: boolean): number => {
    if (isPro) {
        return Infinity;
    }
    const { count } = getUsageStats();
    const remaining = FREE_PLAN_LIMIT - count;
    return Math.max(0, remaining); // Ensure it doesn't go below zero.
}
