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

/**
 * Format time from 24-hour format (HH:MM) to 12-hour format with AM/PM
 * @param time24 - Time in HH:MM format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(time24: string): string {
    const [hoursStr, minutes] = time24.split(':');
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Parse 12-hour time format to 24-hour format for HTML time input
 * @param time12 - Time in 12-hour format (e.g., "2:30 PM")
 * @returns Time in HH:MM format (e.g., "14:30")
 */
export function formatTimeForInput(time12: string): string {
    const timeMatch = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return '';

    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Format date for display
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Wed, Feb 18, 2026")
 */
export function formatDateDisplay(dateString: string): string {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
