# JWT Cookie Configuration

The backend now supports configurable cookie names for JWT tokens to ensure consistency between backend and frontend.

## Environment Variables

You can configure the cookie names using these environment variables:

- `JWT_ACCESS_TOKEN_COOKIE_NAME` - Name for the access token cookie (default: "access_token")
- `JWT_REFRESH_TOKEN_COOKIE_NAME` - Name for the refresh token cookie (default: "refresh_token")

## Configuration Options

### appsettings.json
```json
{
  "Jwt": {
    "AccessTokenCookieName": "medical_tracker_access_token",
    "RefreshTokenCookieName": "medical_tracker_refresh_token"
  }
}
```

### Environment Variables
```bash
JWT_ACCESS_TOKEN_COOKIE_NAME=medical_tracker_access_token
JWT_REFRESH_TOKEN_COOKIE_NAME=medical_tracker_refresh_token
```

## Priority Order

The system uses the following priority order for cookie names:

1. `appsettings.json` configuration
2. Environment variables
3. Default values ("access_token" and "refresh_token")

## Frontend Integration

Make sure your frontend uses the same cookie names when reading the access token cookie. The refresh token cookie is HTTP-only and cannot be accessed by JavaScript.

### Example Frontend Usage
```javascript
// Read access token from cookie
const accessToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('medical_tracker_access_token='))
  ?.split('=')[1];

// The refresh token is HTTP-only and cannot be accessed by JavaScript
// It will be automatically sent with requests to the backend
```

## Testing

You can test the current cookie names by calling the `/api/auth/test-jwt` endpoint, which will return the configured cookie names. 