import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import GoogleIcon from '@mui/icons-material/Google';
import { Box, Grid, Paper, Typography, Button, useTheme, useMediaQuery, Divider, Stack, Avatar, CircularProgress } from '@mui/material';

const GoogleLogin = () => {
  const { loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    setLoading(true);
    try {
      await loginWithGoogle(e);
    } finally {
      setLoading(false); // In case loginWithGoogle does not redirect or fails
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
      }}
    >
      {/* Dimmer and spinner for login loading (all screen sizes) */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0,0,0,0.4)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all', // Block all interaction
          }}
        >
          <CircularProgress color="primary" size={64} thickness={5} />
        </Box>
      )}
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
              {t('appTitle')}
            </Typography>
            {!isMobile && (
              <Typography variant="subtitle1" color="text.secondary">
                {t('appDescription')}
              </Typography>
            )}
          </Box>
        </Stack>
        <Divider sx={{ width: { xs: '90%', sm: '80%' }, mb: 3 }} />
        <Grid container spacing={4} sx={{ width: '100%' }} direction={isMobile ? 'column' : 'row'}>
          <Grid order={isMobile ? 2 : 1}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'block', md: 'block' } }}>
              {t('whatYoullGet')}
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('trackBloodSugar')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('viewTrends')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('exportData')}</Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid order={isMobile ? 1 : 2}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
              {t('welcomeBack')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: { xs: 'block', md: 'block' } }}>
              {t('signInToAccess')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleLogin}
              className="google-signin-button"
              sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem', mb: 2 }}
              data-testid="google-signin-button"
              disabled={loading}
            >
              {t('signInWithGoogle')}
            </Button>
            {/* Make secure auth text plain */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="primary.main">
                {t('secureAuth')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ width: { xs: '90%', sm: '80%' }, mt: 4, mb: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          {t('byContinuing')}{' '}
          <Box component="a" href="/terms" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
            {t('termsOfService')}
          </Box>{' '}
          {t('and')}{' '}
          <Box component="a" href="/privacy" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
            {t('privacyPolicy')}
          </Box>
        </Typography>
      </Paper>
    </Box>
  );
};

export default GoogleLogin; 