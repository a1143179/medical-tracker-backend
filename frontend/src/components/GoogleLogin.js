import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import GoogleIcon from '@mui/icons-material/Google';
import { Box, Grid, Paper, Typography, Button, useTheme, useMediaQuery, Divider, Stack, Avatar } from '@mui/material';

const GoogleLogin = () => {
  const { loginWithGoogle } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 900,
          width: '100%',
          borderRadius: 4,
          overflow: 'hidden',
          p: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', mb: 2, mt: 2, justifyContent: 'center' }}>
          {!isMobile && (
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <LocalHospitalIcon sx={{ fontSize: 32, color: 'white' }} />
            </Avatar>
          )}
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom>
              Blood Sugar Tracker
            </Typography>
            {!isMobile && (
              <Typography variant="subtitle1" color="text.secondary">
                Professional Diabetes Management
              </Typography>
            )}
          </Box>
        </Stack>
        <Divider sx={{ width: { xs: '90%', sm: '80%' }, mb: 3 }} />
        <Grid container spacing={4} sx={{ width: '100%' }} direction={isMobile ? 'column' : 'row'}>
          <Grid item xs={12} md={6} order={isMobile ? 2 : 1}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'block', md: 'block' } }}>
              What you'll get:
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">Track blood sugar levels with precision</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">View trends and analytics</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">Export data for healthcare providers</Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6} order={isMobile ? 1 : 2}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: { xs: 'block', md: 'block' } }}>
              Sign in to access your personalized blood sugar tracking dashboard
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={e => { loginWithGoogle(e); }}
                className="google-signin-button"
              sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem', mb: 2 }}
              data-testid="google-signin-button"
              >
              Sign in with Google
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: 'background.paper', borderRadius: 1, p: 1, boxShadow: 1, width: 'fit-content', mt: 1 }}>
              <LocalHospitalIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="caption" color="primary.main">
                Secure authentication powered by Google
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ width: { xs: '90%', sm: '80%' }, mt: 4, mb: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          By continuing, you agree to our{' '}
          <Box component="a" href="#" color="primary.main" sx={{ textDecoration: 'underline' }}>
            Terms of Service
          </Box>{' '}
          and{' '}
          <Box component="a" href="#" color="primary.main" sx={{ textDecoration: 'underline' }}>
            Privacy Policy
          </Box>
        </Typography>
      </Paper>
    </Box>
  );
};

export default GoogleLogin; 