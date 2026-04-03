# Avatar Component

A reusable avatar component that displays user photos with proper error handling and fallbacks.

## Features

- **Image Loading**: Displays user photo from Firebase `photoURL`
- **Error Handling**: Gracefully falls back to initials if image fails to load
- **Loading State**: Shows a skeleton loader while image is loading
- **Initials Fallback**: Generates initials from display name or email
- **Multiple Sizes**: Supports sm, md, lg, xl sizes
- **Responsive**: Works on all screen sizes

## Usage

```jsx
import { Avatar } from './Avatar';

// Basic usage
<Avatar
  photoURL={user?.photoURL}
  displayName={user?.displayName}
  email={user?.email}
  size="md"
/>

// With custom className
<Avatar
  photoURL={user?.photoURL}
  displayName={user?.displayName}
  email={user?.email}
  size="lg"
  className="shadow-lg"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `photoURL` | string | undefined | Firebase user photo URL |
| `displayName` | string | undefined | User's display name |
| `email` | string | undefined | User's email address |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Avatar size |
| `className` | string | '' | Additional CSS classes |

## Size Reference

- `sm`: 32px (w-8 h-8)
- `md`: 40px (w-10 h-10)
- `lg`: 64px (w-16 h-16)
- `xl`: 80px (w-20 h-20)

## How It Works

1. **Photo Loading**: If `photoURL` is provided and no error has occurred, displays the image
2. **Loading State**: Shows a skeleton while image loads
3. **Error Handling**: If image fails to load, automatically falls back to initials
4. **Initials Generation**: 
   - Uses first and last name initials if available
   - Falls back to first letter of email
   - Defaults to "U" if no data available

## Firebase Configuration

Ensure your Firebase Google provider is configured to request profile scope:

```javascript
googleProvider.addScope('profile');
```

This allows Firebase to retrieve the user's photo URL from Google.

## Styling

The component uses Tailwind CSS with site theme variables:
- `bg-site-accent`: Background color for initials
- `ring-2 ring-white`: Ring styling for visual separation

## Error Handling

The component automatically handles:
- Missing `photoURL`
- Failed image loads (404, CORS, etc.)
- Missing display name or email
- Concurrent updates to `photoURL`

No error handling needed in parent components.
