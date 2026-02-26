# Mobile Testing Guide - Bengals CC

## Quick Test Instructions

### Using Chrome DevTools (Desktop)
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Click "Toggle device toolbar" (Cmd+Shift+M)
3. Select device presets or custom dimensions

### Test These Viewports

#### Critical Devices (Test First)
```
iPhone SE:        375 x 667  (smallest modern iPhone)
iPhone 12/13/14:  390 x 844  (most common)
Galaxy S21:       360 x 800  (Android baseline)
```

#### Additional Devices
```
iPhone 14 Pro Max: 428 x 926  (large iPhone)
Pixel 5:           393 x 851  (Android mid-range)
iPad Mini:         768 x 1024 (small tablet)
```

## Test Checklist Per Page

### Admin Pages

#### `/admin/fixtures`
- [ ] All buttons are easy to tap (48px height)
- [ ] Checkboxes are 24x24px
- [ ] Table scrolls horizontally smoothly
- [ ] Bulk actions toolbar stacks vertically
- [ ] Add/Edit fixtures modal opens full-screen
- [ ] Form inputs are 52px tall
- [ ] Can tap action buttons (Edit/Delete) without missing

#### `/admin/players`
- [ ] Same as fixtures
- [ ] Player search input is 52px tall
- [ ] Filter dropdowns are touch-friendly
- [ ] CSV import modal is readable
- [ ] Upload zone is usable

#### `/admin/availability`
- [ ] Player list cards are touch-friendly
- [ ] Availability checkboxes are 24x24px
- [ ] Duties dropdown positions correctly (above/below)
- [ ] Save button is always visible (sticky footer)
- [ ] No horizontal scrolling on player grid

#### `/admin/seasons`
- [ ] Season cards display single column on mobile
- [ ] Add season button is 48px tall
- [ ] Form inputs stack vertically

#### `/admin/statistics`
- [ ] Stats cards display single column
- [ ] Charts/graphs are responsive
- [ ] Export button is accessible
- [ ] Table data is readable (or use cards on mobile)

### Public Pages

#### `/` (Home)
- [ ] Hero section scales properly
- [ ] Stats grid shows 1 column on mobile
- [ ] Team cards stack vertically
- [ ] Images load and scale properly

#### `/contact`
- [ ] Form inputs are 52px tall
- [ ] Submit button is 48px tall
- [ ] reCAPTCHA displays correctly
- [ ] Success message is visible

#### `/gallery`
- [ ] Images display in 2-column grid
- [ ] Lightbox works on mobile
- [ ] Pinch-to-zoom works
- [ ] Loading states show for slow connections

## Touch Target Verification

### Quick Visual Check
Open any admin page and verify:
- [ ] All buttons appear "fat finger" friendly
- [ ] No accidental taps when clicking nearby items
- [ ] Checkboxes are visually larger (24x24px)
- [ ] Form inputs have enough vertical space

### Measurement Tool
Use Chrome DevTools:
1. Right-click button → Inspect
2. Check Computed styles
3. Verify: `height: 48px` or `min-height: 48px`

## Common Issues to Watch For

### 1. Horizontal Scrolling
**Bad:** Page content wider than viewport
**Test:** Scroll left/right - should not be possible on main content

### 2. Text Too Small
**Bad:** Text smaller than 16px (iOS will zoom)
**Test:** All form inputs should be 16px minimum

### 3. Accidental Taps
**Bad:** Buttons too close together
**Test:** Try tapping buttons quickly - should not hit wrong target

### 4. Hidden Content
**Bad:** Footer buttons hidden behind browser UI
**Test:** Scroll to bottom of modals - buttons should be visible

### 5. Pinch Zoom Disabled
**Bad:** Cannot zoom on fixed-width tables
**Test:** Pinch to zoom should work everywhere

## Browser-Specific Testing

### iOS Safari (Most Important!)
- Test on actual iPhone if possible
- Check safe area insets work (notch padding)
- Verify form inputs don't trigger zoom
- Test modal footer sticky behavior

### Chrome Mobile
- Test horizontal table scrolling
- Check performance on data-heavy pages
- Verify dropdowns render correctly

### Samsung Internet
- Test on Android if possible
- Check touch targets feel comfortable
- Verify modal behaviors

## Performance Testing

### Tools
```bash
# Google PageSpeed Insights
https://pagespeed.web.dev/

# WebPageTest (Mobile)
https://www.webpagetest.org/
```

### Targets
- First Contentful Paint: < 1.8s on 3G
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

### Quick Performance Check
1. Open DevTools → Network tab
2. Throttle to "Fast 3G"
3. Reload page
4. Should feel usable within 2-3 seconds

## Accessibility Testing

### Contrast
Use DevTools Accessibility pane:
- Text should be 4.5:1 ratio
- Buttons should be 3:1 ratio

### Focus States
1. Use Tab key to navigate
2. Every interactive element should show focus ring
3. Focus ring should be clearly visible (3px orange)

### Screen Reader (Optional)
- iOS: VoiceOver
- Android: TalkBack
- All buttons should have meaningful labels

## Landscape Orientation

Don't forget to test landscape mode:
- [ ] Admin sidebar behaves correctly
- [ ] Modals don't break
- [ ] Forms remain usable
- [ ] Tables utilize extra width

## Real Device Testing (Recommended)

### Borrow or Use
- Friend's iPhone
- Friend's Android phone
- Local device testing lab
- BrowserStack (paid service)

### What to Test on Real Device
1. Touch feel (buttons, inputs)
2. Scroll smoothness
3. Modal animations
4. Keyboard behavior
5. Actual rendering (DevTools isn't perfect)

## Sign-Off Checklist

Before considering mobile optimization complete:

- [ ] Tested on iPhone SE (375px) - smallest iPhone
- [ ] Tested on standard Android (360px)
- [ ] All admin pages reviewed
- [ ] All public pages reviewed
- [ ] Touch targets measured (48px minimum)
- [ ] Form inputs tested (52px minimum)
- [ ] Checkboxes verified (24px)
- [ ] Tables scroll smoothly
- [ ] Modals work properly
- [ ] No horizontal scroll on main content
- [ ] Performance < 3s on 3G
- [ ] Tested in portrait and landscape
- [ ] Tested on real device (if possible)

## Common Fixes Applied

✅ Increased button heights to 48px minimum
✅ Increased checkbox size to 24px
✅ Form inputs now 52px tall on mobile
✅ Font size 16px to prevent iOS zoom
✅ Form grids collapse at 768px (earlier)
✅ Sticky modal footer with safe area padding
✅ Stats grid single column on mobile
✅ Sidebar width optimized for small screens
✅ Bulk actions toolbar stacks vertically
✅ Table action buttons 44x44px minimum

## Next Steps

If issues found:
1. Document the issue with screenshot
2. Note the device/viewport size
3. Create GitHub issue or add to docs/bugs screenshots/
4. Prioritize fix based on impact

---

Last Updated: 2026-02-06
