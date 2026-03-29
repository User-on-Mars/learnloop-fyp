# Profile Page Responsive Design - Quick Reference

## Breakpoint Summary

| Viewport | Width | Tailwind Prefix | Key Changes |
|----------|-------|-----------------|-------------|
| Mobile | < 640px | (default) | Sidebar hidden, mobile header, stacked layout, full-width buttons |
| Small | ≥ 640px | `sm:` | Increased spacing, larger text |
| Medium | ≥ 768px | `md:` | Sidebar visible, desktop header, horizontal button layout |
| Large | ≥ 1024px | `lg:` | Maximum padding, optimal spacing |

## Key Responsive Patterns

### Layout Switching
```jsx
// Mobile header (visible < 768px)
<div className="md:hidden">

// Desktop header (visible ≥ 768px)
<div className="hidden md:block">

// Sidebar (hidden < 768px, visible ≥ 768px)
<Sidebar /> // Uses "hidden md:flex"
```

### Spacing Progression
```jsx
// Container: 16px → 24px → 32px
className="p-4 sm:p-6 lg:p-8"

// Cards: 16px → 24px
className="p-4 sm:p-6"

// Gaps: 16px → 24px
className="space-y-4 sm:space-y-6"
```

### Typography Scaling
```jsx
// Page title: 24px → 30px
className="text-2xl sm:text-3xl"

// Card title: 18px → 20px
className="text-lg sm:text-xl"

// Body text: 14px → 16px
className="text-sm sm:text-base"
```

### Button Adaptation
```jsx
// Mobile: Full width, Tablet+: Auto width
className="w-full sm:w-auto"

// Mobile: Flex grow, Tablet+: Fixed size
className="flex-1 sm:flex-none"
```

### Layout Direction
```jsx
// Mobile: Vertical, Tablet+: Horizontal
className="flex flex-col sm:flex-row"
```

### Avatar Sizing
```jsx
// Mobile: 64px, Tablet+: 80px
className="w-16 h-16 sm:w-20 sm:h-20"

// Text: 20px → 24px
className="text-xl sm:text-2xl"
```

## Testing Quick Checks

### Mobile (< 768px)
- ✓ Sidebar hidden
- ✓ Mobile header visible with back button
- ✓ Buttons full width
- ✓ Cards stack vertically
- ✓ 16px padding

### Tablet (768px - 1023px)
- ✓ Sidebar visible
- ✓ Desktop header visible
- ✓ Buttons auto-width
- ✓ Horizontal layouts
- ✓ 24px padding

### Desktop (≥ 1024px)
- ✓ Full layout
- ✓ Max-width constraints
- ✓ Optimal spacing
- ✓ 32px padding

## Common Responsive Classes Used

| Purpose | Classes |
|---------|---------|
| Hide on mobile | `hidden md:block` or `hidden md:flex` |
| Show on mobile only | `md:hidden` |
| Responsive padding | `p-4 sm:p-6 lg:p-8` |
| Responsive spacing | `space-y-4 sm:space-y-6` |
| Responsive text | `text-lg sm:text-xl` |
| Responsive size | `w-16 h-16 sm:w-20 sm:h-20` |
| Responsive gap | `gap-3 sm:gap-4` |
| Responsive margin | `mb-4 sm:mb-6` |
| Layout direction | `flex-col sm:flex-row` |
| Button width | `w-full sm:w-auto` |
| Flex behavior | `flex-1 sm:flex-none` |

## Browser DevTools Testing

### Quick Test Viewports
```
Mobile:
- 375 × 667 (iPhone SE)
- 390 × 844 (iPhone 12 Pro)
- 360 × 740 (Samsung Galaxy S20)

Tablet:
- 768 × 1024 (iPad Mini)
- 820 × 1180 (iPad Air)

Desktop:
- 1280 × 720 (HD)
- 1920 × 1080 (Full HD)
```

### DevTools Shortcut
- Windows/Linux: `Ctrl + Shift + M`
- Mac: `Cmd + Shift + M`

## Accessibility Checklist

- ✓ Touch targets ≥ 44px
- ✓ Focus indicators visible
- ✓ Keyboard navigation works
- ✓ ARIA labels present
- ✓ Form labels associated
- ✓ Required fields marked
- ✓ Error messages clear

## Performance Notes

- No layout shifts during resize
- CSS-only responsive behavior
- Tailwind JIT compilation
- Minimal JavaScript overhead
- Smooth transitions

## Related Files

- Implementation: `frontend/src/pages/Profile.jsx`
- Test Results: `.kiro/specs/user-profile/responsive-test-results.md`
- Visual Guide: `.kiro/specs/user-profile/responsive-visual-test-guide.md`
- Full Summary: `.kiro/specs/user-profile/responsive-implementation-summary.md`
