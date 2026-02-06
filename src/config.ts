// Site Configuration
// This file contains centralized configuration values used throughout the website

export const SITE_CONFIG = {
    name: 'Golden State Cricket Club',
    location: 'Bay Area, California',
    email: 'bengalscc@gmail.com',
    phone: '+1 (555) 123-4567', // Update with actual phone number
    whatsapp: '+15551234567', // Update with actual WhatsApp number (format: country code + number, no spaces)
    description: 'Golden State Cricket Club - Bay Area, California. NCCA T20 Division 1 Champions. Community-driven cricket organization.',

    // Non-Profit Information
    nonProfit: {
        name: 'Golden State Cricket Foundation',
        ein: 'XX-XXXXXXX', // Update with actual EIN
        status: '501(c)(3) Tax-Exempt Non-Profit',
        founded: '2018',
        mission: 'To promote cricket in Northern California while fostering community engagement, youth development, and cultural diversity through the sport of cricket.',
        zeffyUrl: 'https://www.zeffy.com/donation-form/XXXXX', // Update with actual Zeffy form URL
        programs: [
            'Youth Cricket Academy (ages 8-18)',
            'Equipment Donation Program',
            'Community Cricket Clinics',
            'Scholarship Fund for underprivileged players',
            'Women\'s Cricket Initiative'
        ],
        impactStats: [
            { label: 'Youth Trained Annually', value: '50+', icon: '🏏' },
            { label: 'Equipment Donated', value: '$10,000+', icon: '🎁' },
            { label: 'Community Members Reached', value: '200+', icon: '🤝' },
            { label: 'Scholarships Awarded', value: '15+', icon: '🎓' }
        ]
    },

    // Social Media Links
    social: {
        instagram: {
            url: 'https://www.instagram.com/bengalsinc_org/',
            label: 'Instagram',
            description: 'Photos and highlights',
            icon: '📷'
        },
        youtube: {
            url: 'https://www.youtube.com/@BengalsCricketClubBayArea',
            label: 'YouTube',
            description: 'Match videos',
            icon: '🎥'
        }
    }
};
