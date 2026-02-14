/**
 * Shared utility functions for Netlify Functions
 */

/**
 * Parse date string (YYYY-MM-DD) as local date, not UTC
 * This prevents timezone issues where UTC midnight becomes the previous day in local time
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object representing the local date
 */
export function parseLocalDate(dateString: string): Date {
    const parts = dateString.split('-');
    return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
    );
}
