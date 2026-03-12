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

/**
 * Get current date/time in Pacific Time (America/Los_Angeles)
 * This ensures date comparisons use the club's local timezone, not server UTC time
 * @returns Date object representing current time in Pacific timezone
 */
export function getPacificNow(): Date {
    // Convert current UTC time to Pacific Time by parsing ISO string with Pacific offset
    const now = new Date();

    // Get Pacific Time string using Intl API
    const pacificTimeString = now.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse back to Date (this will be in server's local time, but represents Pacific time)
    // Format: "MM/DD/YYYY, HH:mm:ss"
    const [datePart, timePart] = pacificTimeString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');

    return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
    );
}

/**
 * Get today's date at midnight in Pacific Time
 * Useful for date-only comparisons (filtering by day)
 * @returns Date object representing today at 00:00:00 in Pacific timezone
 */
export function getPacificToday(): Date {
    const pacificNow = getPacificNow();
    pacificNow.setHours(0, 0, 0, 0);
    return pacificNow;
}
