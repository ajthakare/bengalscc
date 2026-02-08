// Site Configuration
// This file contains centralized configuration values used throughout the website

export const SITE_CONFIG = {
    name: 'Golden State Cricket Club',
    location: 'Bay Area, California',
    email: 'gsbendalsinc@gmail.com',
    description: 'Golden State Cricket Club - Bay Area, California. NCCA T20 Division 1 Champions. Community-driven cricket organization.',

    // Non-Profit Information
    nonProfit: {
        name: 'Bengals Inc.',
        ein: '30-13XXXXX',
        status: '501(c)(3) Tax-Exempt Non-Profit',
        founded: '2018',
        mission: 'To foster a vibrant, inclusive community through the power of sport. We are dedicated to nurturing talent, promoting physical wellness, and inspiring a lifelong passion for excellence, both on and off the field. Our mission extends beyond competitive cricket to building community connections, youth development, and cultural unity.',
        zeffyUrl: 'https://www.zeffy.com/donation-form/XXXXX', // Update with actual Zeffy form URL
        programs: [
            'Competitive Cricket Teams - Three teams competing in NCCA and BACA leagues since 2018',
            'Youth Cricket Development - Free membership for ages 8-18 and full-time students',
            'Player Pathway Program - Supporting members in USA Masters League and USA Minor League',
            'Community Engagement - 160+ members from 8 counties across Bay Area',
            'Inclusive Membership - Removing financial barriers for youth participation',
            'Bay Area Cricket Alliance - Active participation in NCCA leagues (est. 1892)'
        ],
        impactStats: [
            { label: 'Active Members', value: '160+', icon: '🏏' },
            { label: 'Youth & Students', value: '30+', icon: '🎓' },
            { label: 'Counties Represented', value: '8', icon: '🏘️' },
            { label: 'Years of Service', value: '7+', icon: '⏳' }
        ]
    },

    // Social Media Links
    social: {
        instagram: {
            url: 'https://www.instagram.com/goldenstate_cc',
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
