import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import GoogleIcon from '@mui/icons-material/Google';
import { Box, Grid, Paper, Typography, Button, useTheme, useMediaQuery, Divider, Stack, Avatar } from '@mui/material';

const GoogleLogin = () => {
  const { loginWithGoogle } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
          <Grid item xs={12} md={6} order={isMobile ? 2 : 1}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'block', md: 'block' } }}>
              {t('whatYoullGet', {}) || (language === 'zh' ? '您将获得：' : "What you'll get:")}
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('trackBloodSugar', {}) || (language === 'zh' ? '精准追踪血糖水平' : 'Track blood sugar levels with precision')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('viewTrends', {}) || (language === 'zh' ? '查看趋势和分析' : 'View trends and analytics')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GoogleIcon color="success" />
                <Typography variant="body1">{t('exportData', {}) || (language === 'zh' ? '导出数据供医疗人员使用' : 'Export data for healthcare providers')}</Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6} order={isMobile ? 1 : 2}>
            <Typography variant="h6" fontWeight={600} color="primary" sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
              {t('welcomeBack', {}) || (language === 'zh' ? '欢迎回来' : 'Welcome Back')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: { xs: 'block', md: 'block' } }}>
              {t('signInToAccess', {}) || (language === 'zh' ? '登录以访问您的个性化血糖追踪仪表板' : 'Sign in to access your personalized blood sugar tracking dashboard')}
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
              {t('signInWithGoogle', {}) || (language === 'zh' ? '使用 Google 登录' : 'Sign in with Google')}
            </Button>
            {/* Make secure auth text plain */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="primary.main">
                {t('secureAuth', {}) || (language === 'zh' ? '由 Google 提供安全认证' : 'Secure authentication powered by Google')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ width: { xs: '90%', sm: '80%' }, mt: 4, mb: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          {t('byContinuing', {}) || (language === 'zh' ? '继续即表示您同意我们的' : 'By continuing, you agree to our')}{' '}
          <Box component="a" href="/terms" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
            {t('termsOfService', {}) || (language === 'zh' ? '服务条款' : 'Terms of Service')}
          </Box>{' '}
          {t('and', {}) || (language === 'zh' ? '和' : 'and')}{' '}
          <Box component="a" href="/privacy" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
            {t('privacyPolicy', {}) || (language === 'zh' ? '隐私政策' : 'Privacy Policy')}
          </Box>
        </Typography>
      </Paper>
    </Box>
  );
};

export default GoogleLogin; 