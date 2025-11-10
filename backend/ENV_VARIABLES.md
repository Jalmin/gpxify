# Environment Variables Documentation

This document describes all environment variables used by GPX Ninja backend.

## Required Variables

### DATABASE_URL
- **Type**: String (PostgreSQL connection URL)
- **Required**: Yes
- **Example**: `postgresql://user:password@host:port/database`
- **Description**: PostgreSQL database connection string
- **Validation**: Must be set in all environments

### SECRET_KEY
- **Type**: String (minimum 32 characters)
- **Required**: Yes (validated in production)
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Generate**: `openssl rand -hex 32`
- **Description**: Secret key for JWT token signing
- **Validation**: In production, must be at least 32 characters and not the default value

## Application Settings

### APP_NAME
- **Type**: String
- **Required**: No
- **Default**: `GPXIFY`
- **Description**: Application name used in logs and responses

### ENVIRONMENT
- **Type**: String (`development` | `production`)
- **Required**: No
- **Default**: `development`
- **Description**: Runtime environment. Affects validation rules and logging levels

### DEBUG
- **Type**: Boolean
- **Required**: No
- **Default**: `True`
- **Description**: Enable debug mode (detailed error messages, auto-reload)
- **Production**: Should be `False`

### API_V1_STR
- **Type**: String
- **Required**: No
- **Default**: `/api/v1`
- **Description**: API version prefix for all endpoints

## Server Settings

### BACKEND_CORS_ORIGINS
- **Type**: String (comma-separated URLs) or List
- **Required**: No
- **Default**: `http://localhost:5173,http://localhost:3000`
- **Example**: `https://www.gpx.ninja,https://gpx.ninja`
- **Description**: Allowed CORS origins for frontend access

## Security Settings

### ALGORITHM
- **Type**: String
- **Required**: No
- **Default**: `HS256`
- **Description**: JWT signing algorithm

### ACCESS_TOKEN_EXPIRE_MINUTES
- **Type**: Integer
- **Required**: No
- **Default**: `30`
- **Description**: JWT token expiration time in minutes

## Upload Settings

### MAX_UPLOAD_SIZE
- **Type**: Integer (bytes)
- **Required**: No
- **Default**: `26214400` (25MB)
- **Description**: Maximum file upload size in bytes

### UPLOAD_DIR
- **Type**: String (path)
- **Required**: No
- **Default**: `./uploads`
- **Description**: Directory path for storing uploaded files
- **Note**: Created automatically if it doesn't exist

## SMTP Settings (Optional)

These are required only if you want the contact form to send emails in production. If not set, the contact form will work in "dev mode" (just logs messages).

### SMTP_HOST
- **Type**: String
- **Required**: No
- **Default**: `smtp.gmail.com`
- **Description**: SMTP server hostname

### SMTP_PORT
- **Type**: Integer
- **Required**: No
- **Default**: `587`
- **Description**: SMTP server port

### SMTP_USER
- **Type**: String (email)
- **Required**: No (but required for email sending)
- **Default**: `""` (empty)
- **Description**: SMTP authentication username (usually your email)

### SMTP_PASSWORD
- **Type**: String
- **Required**: No (but required for email sending)
- **Default**: `""` (empty)
- **Description**: SMTP authentication password (use app-specific password for Gmail)

### CONTACT_EMAIL
- **Type**: String (email)
- **Required**: No
- **Default**: `contact@gpx.ninja`
- **Description**: Recipient email address for contact form submissions

## Google OAuth (Not Implemented)

These variables are defined but not currently used.

### GOOGLE_CLIENT_ID
- **Type**: String
- **Required**: No
- **Default**: `""`
- **Description**: Google OAuth client ID

### GOOGLE_CLIENT_SECRET
- **Type**: String
- **Required**: No
- **Default**: `""`
- **Description**: Google OAuth client secret

### GOOGLE_REDIRECT_URI
- **Type**: String (URL)
- **Required**: No
- **Default**: `http://localhost:8000/api/v1/auth/google/callback`
- **Description**: OAuth callback URL

## Configuration Validation

The application validates configuration on startup:

- **Development**: Warnings for missing optional settings
- **Production**:
  - ❌ Error if SECRET_KEY is default value or < 32 chars
  - ❌ Error if DATABASE_URL is not set
  - ⚠️ Warning if SMTP credentials are missing
  - ℹ️ Info if Google OAuth is not configured

## Setup Instructions

### Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. (Optional) Generate a SECRET_KEY:
   ```bash
   openssl rand -hex 32
   ```

3. Update DATABASE_URL if needed (default works with docker-compose)

### Production

1. Copy `.env.production.example` to `.env`:
   ```bash
   cp .env.production.example .env
   ```

2. **REQUIRED**: Generate a SECRET_KEY:
   ```bash
   openssl rand -hex 32
   ```

3. **REQUIRED**: Update DATABASE_URL with production credentials

4. **REQUIRED**: Set ENVIRONMENT=production and DEBUG=False

5. **REQUIRED**: Update BACKEND_CORS_ORIGINS with production domains

6. **RECOMMENDED**: Configure SMTP settings for contact form

## Example Configurations

### Minimal Development
```env
DATABASE_URL=postgresql://gpxify:gpxify_dev_password_123@db:5432/gpxify
SECRET_KEY=dev_key_for_local_testing_only
```

### Full Production
```env
ENVIRONMENT=production
DEBUG=False
DATABASE_URL=postgresql://gpxify_prod:strong_password@db:5432/gpxify_prod
SECRET_KEY=<generated with openssl rand -hex 32>
BACKEND_CORS_ORIGINS=https://www.gpx.ninja,https://gpx.ninja
SMTP_USER=noreply@gpx.ninja
SMTP_PASSWORD=<app-specific password>
CONTACT_EMAIL=contact@gpx.ninja
```
