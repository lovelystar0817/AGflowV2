# Customize App Feature Implementation

## Overview
This document outlines the implementation of the "Customize your app" feature that was restored from the legacy backup into the live AG-StyleFlow-V2-updated application.

## Changes Made

### 1. Feature Flag Configuration
- **File**: `client/src/config/features.ts`
- **Purpose**: Centralized feature flag management
- **Default**: `customizeApp: true` (feature enabled by default)

### 2. Customize App Component
- **File**: `client/src/features/customize-app/CustomizeAppPage.tsx`
- **Purpose**: Main customization page ported from legacy implementation
- **Features**:
  - Portfolio photo management (up to 6 photos)
  - Theme selection with live preview
  - Business settings integration
  - Save functionality with QR code generation
  - Responsive design following existing patterns

### 3. Routing Integration
- **File**: `client/src/App.tsx`
- **Changes**:
  - Added import for `CustomizeAppPage` component
  - Added import for `FEATURES` configuration
  - Added protected route: `/dashboard/customize-app` (guarded by feature flag)

### 4. Dashboard Navigation
- **File**: `client/src/pages/dashboard-page.tsx`
- **Changes**:
  - Added import for `FEATURES` and `Palette` icon
  - Added "Customize App" navigation button in the action buttons grid
  - Button is conditionally rendered based on feature flag
  - Consistent styling with existing dashboard buttons

## User Flow

1. **Dashboard Access**: User sees the "Customize App" button in the dashboard action buttons grid
2. **Navigation**: Clicking the button navigates to `/dashboard/customize-app`
3. **Authentication**: Route is protected by `ProtectedRoute` component
4. **Customization**: User can:
   - View business settings notice with link to settings page
   - Manage portfolio photos (add/remove up to 6 photos)
   - Select from 5 predefined app themes
   - Save changes and generate QR code
5. **Navigation Back**: Multiple options to return to dashboard

## Technical Implementation Details

### Component Structure
```
client/src/features/customize-app/
└── CustomizeAppPage.tsx (main component with embedded sub-components)
```

### Key Components (Embedded)
- `PortfolioGallery`: Photo management interface
- `ThemeGrid`: Theme selection with preview
- `AppQRCode`: QR code display after saving

### Theme Options
1. Professional Blue (#3b82f6)
2. Elegant Purple (#8b5cf6)
3. Modern Green (#10b981)
4. Warm Orange (#f59e0b)
5. Classic Black (#1f2937)

### API Integration
- Uses existing `apiRequest` utility for backend communication
- PATCH `/api/profile` endpoint for saving template data
- Integrates with React Query for state management
- Toast notifications for user feedback

### Feature Flag Usage
```typescript
// In App.tsx - Route guarding
{FEATURES.customizeApp && (
  <ProtectedRoute path="/dashboard/customize-app" component={CustomizeAppPage} />
)}

// In dashboard-page.tsx - Button visibility
{FEATURES.customizeApp && (
  <Button onClick={() => setLocation("/dashboard/customize-app")}>
    <Palette className="h-6 w-6 text-purple-600" />
    <span>Customize App</span>
  </Button>
)}
```

## Backward Compatibility
- Legacy backup files remain intact under `legacy/pre-merge/`
- No breaking changes to existing routes or functionality
- Feature can be disabled by setting `FEATURES.customizeApp = false`

## Future Enhancements
- File upload functionality for portfolio photos (currently uses placeholder URLs)
- App preview functionality (currently shows placeholder message)
- Additional theme customization options
- Integration with actual QR code generation service

## Testing
- Build process passes successfully
- TypeScript compilation completes without errors
- Feature flag controls work as expected
- Routing integration functions properly
- Component renders without runtime errors