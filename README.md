# Medical Tracker Backend

A .NET 9 Web API backend for the Medical Tracker application with Google OAuth authentication.

## Features

- Google OAuth Authentication
- CRUD API for blood sugar records
- PostgreSQL database support
- JWT token-based session management
- Health checks and logging
- Ready for Azure App Service deployment

## Environment Variables

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your_google_client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your_google_client_secret` |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | `Host=localhost;Port=5432;Database=bloodsugar;Username=postgres;Password=password` |

## Local Development

1. **Install dependencies:**
   ```bash
   dotnet restore medicaltracker.sln
   ```
2. **Setup Google OAuth (Required)**:
   - Copy `appsettings.Development.json.example` to `appsettings.Development.json`
   - Add your Google OAuth credentials to `appsettings.Development.json`:
     - Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Google Client ID
     - Replace `YOUR_GOOGLE_CLIENT_SECRET_HERE` with your actual Google Client Secret
   - See [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md) for detailed instructions
   
   **Alternative**: Set environment variables in your shell:
     ```bash
     export GOOGLE_CLIENT_ID=your_google_client_id
     export GOOGLE_CLIENT_SECRET=your_google_client_secret
     export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=bloodsugar;Username=postgres;Password=password"
     ```
3. **Run the application:**
   ```bash
   dotnet run --project backend/backend.csproj
   ```
   
   **Or use the startup script:**
   ```bash
   start-dev.bat
   ```

## API Endpoints

- `GET /api/health` — Health check
- `GET /api/auth/login` — Start Google OAuth
- `GET /api/auth/callback` — OAuth callback
- `GET /api/auth/me` — Get current user
- `GET/POST/PUT/DELETE /api/records` — Manage blood sugar records

## Deployment

### Azure App Service (via GitHub Actions)
- Workflow: `.github/workflows/deploy-backend.yml`
- Requires secret: `AZURE_WEBAPP_PUBLISH_PROFILE` (from Azure Portal for `medicaltrackerbackend`)
- On push to `main`, the backend is built, published, and deployed automatically.

### Docker
```bash
docker build -t medicaltracker-backend .
docker run -p 3000:3000 \
  -e GOOGLE_CLIENT_ID=your_client_id \
  -e GOOGLE_CLIENT_SECRET=your_client_secret \
  -e ConnectionStrings__DefaultConnection=your_connection_string \
  medicaltracker-backend
```

## Manual Setup (Alternative to setup-dev.bat)

If you need to manually set up the development environment:

1. **Create appsettings.Development.json**:
   ```bash
   copy appsettings.Development.json.example appsettings.Development.json
   ```

2. **Add Google OAuth credentials** to `appsettings.Development.json`:
   - Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Google Client ID
   - Replace `YOUR_GOOGLE_CLIENT_SECRET_HERE` with your actual Google Client Secret

3. **Start the application**:
   ```bash
   start-dev.bat
   ```

## Security
- No secrets are committed to the repository
- `appsettings.Development.json` is gitignored
- Use the provided `.example` file for local setup

## Contributing
Pull requests are welcome! Please open an issue first to discuss major changes.

---

For more details, see the code and workflow files in this repository. #   T e s t   t r i g g e r 
 
 