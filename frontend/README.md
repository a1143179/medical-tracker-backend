# Blood Sugar Tracker Frontend

A React-based single page application for tracking blood sugar levels with email authentication.

## Features

- **Single Page Application (SPA)**: Built with React Router for seamless navigation
- **Email Authentication**: Secure login and registration using email/password
- **Three-Step Registration**: Email verification with code confirmation
- **Blood Sugar Tracking**: Add, edit, and delete blood sugar records
- **Analytics Dashboard**: Visual charts and statistics
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: AJAX-based data operations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Application Structure

```
src/
├── components/
│   ├── Dashboard.js      # Main blood sugar tracking interface
│   ├── Header.js         # Navigation header with user info
│   ├── Login.js          # Email login and registration page
│   ├── EmailUsageMonitor.js # Email usage tracking component
│   └── ProtectedRoute.js # Route protection component
├── contexts/
│   └── AuthContext.js    # Authentication state management
├── services/
│   └── emailService.js   # Email verification service
└── App.js               # Main application with routing
```

## Authentication Flow

### Registration Process
1. **Email Entry**: User enters email address
2. **Code Verification**: System sends 6-digit verification code
3. **Password Setup**: User sets password after email verification
4. **Success Feedback**: Shows "Registration successful! You can now login."
5. **Auto-Switch**: Automatically switches to login tab after 1.5 seconds

### Login Process
1. **Email/Password**: Users sign in with their credentials
2. **Remember Password**: Optional credential saving for convenience
3. **Immediate Redirect**: Automatically navigates to dashboard upon successful login
4. **Protected Routes**: All dashboard features require authentication

### User Experience Features
- **Tabbed Interface**: Switch between Login and Register forms
- **Form Validation**: Email format validation and password requirements
- **Error Handling**: Clear error messages for validation failures
- **Success Feedback**: Registration success messages with auto-tab switching
- **Immediate Navigation**: Login success instantly redirects to dashboard
- **Email Usage Monitoring**: Track daily email sending limits

## User Interface

### Login/Registration Page
- **Tabbed Interface**: Switch between Login and Register forms
- **Three-Step Registration**: Email → Verification → Password setup
- **Form Validation**: Email format validation and password requirements
- **Error Handling**: Clear error messages for validation failures
- **Success Feedback**: Confirmation messages with auto-tab switching
- **Remember Password**: Optional credential saving

### Dashboard
- **User-Specific Records**: Each user only sees their own blood sugar records
- **Secure Data Access**: Users can only view, edit, and delete their own data
- **Real-time Updates**: Changes are immediately reflected in the interface
- **Data Privacy**: Complete isolation between user accounts

### Data Security
- **User Authentication**: All records are tied to authenticated users
- **API Protection**: Backend validates user ownership before any operations
- **Data Isolation**: Users cannot access other users' records
- **Session Management**: Secure user sessions with localStorage
- **User Header**: Shows user name and email with logout option
- **Blood Sugar Records**: Table view with pagination and sorting
- **Analytics**: Charts showing trends and statistics
- **Add/Edit Records**: Modal dialogs for data entry

## API Integration

The frontend communicates with the backend API at `/api/records` for:
- Fetching blood sugar records
- Adding new records
- Updating existing records
- Deleting records

All API calls use AJAX (fetch API) for seamless user experience.

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Environment Variables

Create a `.env` file in the frontend directory for environment-specific configuration:

```
REACT_APP_API_URL=http://localhost:8080
```

## Security Notes

- User credentials are validated client-side for demo purposes
- In production, implement proper backend authentication
- Consider using JWT tokens for secure API communication
- User authentication state is managed client-side with React Context

## Troubleshooting

### Common Issues

1. **API Connection Error**: Make sure the backend server is running on port 8080
2. **CORS Issues**: The proxy configuration in package.json should handle this
3. **Form Validation**: Ensure email format is valid and password meets requirements

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify the backend API is accessible
3. Ensure all dependencies are installed correctly

## Future Enhancements

- Backend integration for proper user authentication
- Password reset functionality
- Email verification
- User profile management
- Enhanced security features

## Cypress End-to-End Testing

This project uses [Cypress](https://www.cypress.io/) for end-to-end (E2E) testing.

### Prerequisites
- Node.js and npm installed
- Backend and frontend servers running locally (see below)

### Running Cypress Locally

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Start the backend and frontend:**
   - Backend: `dotnet run --project ../backend` (or use your preferred method)
   - Frontend: `npm start`
3. **Run Cypress in interactive mode:**
   ```sh
   npx cypress open
   ```
   or run all tests headlessly:
   ```sh
   npm run cypress:run
   ```

### Running Cypress in CI (GitHub Actions)
- Cypress tests are automatically run in the GitHub Actions workflow before deployment.
- Deployment only occurs if all Cypress tests pass.

### Test Files
- Cypress tests are located in `frontend/cypress/e2e/`
- Example: `forgot-password.cy.js`, `login.cy.js`, etc.

### Troubleshooting
- Make sure both backend and frontend are running before starting Cypress.
- If you need to test email/verification flows, the backend will return codes in the API response in development mode.
- For more info, see the [Cypress documentation](https://docs.cypress.io/).
