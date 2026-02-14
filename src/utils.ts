import blobshape from 'blobshape';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function uniqueName() {
    const config = {
        dictionaries: [adjectives, animals],
        separator: '-',
        length: 2
    };
    return uniqueNamesGenerator(config) + '-' + randomInt(100, 999);
}

export function generateBlob(parameters?: any) {
    const gradientColors = [
        ['#2E3192', '#1BFFFF'],
        ['#93A5CF', '#E4EfE9'],
        ['#BFF098', '#6FD6FF'],
        ['#A1C4FD', '#C2E9FB'],
        ['#11998E', '#38EF7D'],
        ['#D8B5FF', '#1EAE98']
    ];

    parameters = {
        seed: null,
        size: 512,
        edges: randomInt(3, 20),
        growth: randomInt(2, 9),
        name: uniqueName(),
        colors: gradientColors[randomInt(0, gradientColors.length - 1)],
        ...parameters
    };
    const { path: svgPath, seedValue: seed } = blobshape(parameters);
    return { parameters: { ...parameters, seed }, svgPath };
}

export function cacheHeaders(maxAgeDays = 365, cacheTags?: string[]): Record<string, string> {
    // As far as the browser is concerned, it must revalidate on every request.
    // However, Netlify CDN is told to keep the content cached for up to maxAgeDays (note: new deployment bust the cache by default).
    // We're also setting cache tags to be able to later purge via API (see: https://www.netlify.com/blog/cache-tags-and-purge-api-on-netlify/)
    const headers = {
        'Cache-Control': 'public, max-age=0, must-revalidate', // Tell browsers to always revalidate
        'Netlify-CDN-Cache-Control': `public, max-age=${maxAgeDays * 86_400}, must-revalidate` // Tells Netlify CDN the max allwed cache duration
    };
    if (cacheTags?.length > 0) headers['Cache-Tag'] = cacheTags.join(',');
    return headers;
}

export const uploadDisabled = import.meta.env.PUBLIC_DISABLE_UPLOADS?.toLowerCase() === 'true';

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
