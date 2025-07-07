import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  FormControl
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import emailService from '../services/emailService';

const Login = () => {
  const { login, register, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(0);
  const [resetCode, setResetCode] = useState('');
  const [isSendingResetCode, setIsSendingResetCode] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);

  const [registrationStep, setRegistrationStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Countdown timer for resend code
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Countdown timer for reset code
  useEffect(() => {
    let timer;
    if (resetCountdown > 0) {
      timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCountdown]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    // Only clear success message if it's not a registration success message
    if (!success || !success.includes('Registration successful')) {
      setSuccess(null);
    }
    setRegistrationStep(0);
    setVerificationCode('');
    setFormData({ email: '', password: '', confirmPassword: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRememberPasswordChange = (e) => {
    setRememberPassword(e.target.checked);
  };

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setError(t('enterEmailFirst'));
      return;
    }

    try {
      setIsSendingCode(true);
      setError(null);
      
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Use email service to send verification code
      const result = await emailService.sendVerificationCode(formData.email, code);
      
      setSuccess(t('verificationCodeSent'));
      setRegistrationStep(1);
      setCountdown(60); // 60 seconds countdown
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setError(null);
      await emailService.verifyCode(formData.email, verificationCode);
      setSuccess(t('emailVerifiedSuccessfully'));
      setRegistrationStep(2);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendVerificationCode();
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotPasswordStep(0);
    setError(null);
    setSuccess(null);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep(0);
    setResetCode('');
    setFormData(prev => ({
      ...prev,
      newPassword: '',
      confirmNewPassword: ''
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSendResetCode = async () => {
    if (!formData.email) {
      setError(t('enterEmailFirst'));
      return;
    }

    try {
      setIsSendingResetCode(true);
      setError(null);
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        setForgotPasswordStep(1);
        setResetCountdown(60); // 60 seconds countdown
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to send reset code');
    } finally {
      setIsSendingResetCode(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Add reset code validation: must be 6 digits
    if (!/^\d{6}$/.test(resetCode)) {
      setError(t('invalidResetCodeFormat') || 'Reset code must be 6 digits');
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    if (formData.newPassword.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }
    try {
      setError(null);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: resetCode,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmNewPassword
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        setForgotPasswordStep(2);
        // Clear form data
        setFormData(prev => ({
          ...prev,
          newPassword: '',
          confirmNewPassword: ''
        }));
        setResetCode('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to reset password');
    }
  };

  const handleResendResetCode = async () => {
    if (resetCountdown > 0) return;
    await handleSendResetCode();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await login(formData.email, formData.password, rememberPassword);
      
      // Immediately redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await register(formData.email, formData.password, formData.confirmPassword);
      
      // Clear verification data after successful registration
      emailService.clearVerificationData();
      
      // Clear registration form data
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
      setVerificationCode('');
      
      // Immediately switch to login tab
      setActiveTab(0);
      setRegistrationStep(0);
    } catch (error) {
      setError(error.message);
    }
  };

  const getRegistrationSteps = () => {
    return [
      t('enterEmail'),
      t('verifyEmail'),
      t('setPassword')
    ];
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} data-testid="loading-spinner" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Avatar 
          sx={{ 
            m: 1, 
            bgcolor: 'white',
            width: 80,
            height: 80,
            mb: 3
          }}
        >
          <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
            {t('appInitials')}
          </Typography>
        </Avatar>
        
        <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          {t('appTitle')}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', opacity: 0.9 }}>
          {t('appDescription')}
        </Typography>

        <Box sx={{ width: '100%', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                '&.Mui-selected': {
                  color: 'white',
                  fontWeight: 'bold'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white'
              }
            }}
          >
            <Tab label={t('login')} />
            <Tab label={t('register')} />
          </Tabs>
        </Box>

        {/* Registration Stepper */}
        {activeTab === 1 && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Stepper activeStep={registrationStep} sx={{ 
              '& .MuiStepLabel-root .Mui-completed': {
                color: 'white',
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: 'white',
              },
              '& .MuiStepLabel-root .MuiStepLabel-label': {
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.75rem',
              },
            }}>
              {getRegistrationSteps().map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            data-testid="error-message"
            sx={{ 
              mb: 3, 
              width: '100%', 
              bgcolor: 'rgba(255,255,255,0.9)', 
              color: 'error.main' 
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            data-testid="success-message"
            sx={{ 
              mb: 3, 
              width: '100%', 
              bgcolor: 'rgba(255,255,255,0.9)', 
              color: 'success.main',
              fontSize: success.includes('Registration successful') ? '1.1rem' : '1rem',
              fontWeight: success.includes('Registration successful') ? 'bold' : 'normal'
            }}
          >
            {success}
          </Alert>
        )}

        {/* Login Form */}
        {activeTab === 0 && !showForgotPassword && (
          <Box component="form" onSubmit={handleLogin} data-testid="login-form" sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label={t('email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                  '&.Mui-focused': {
                    color: 'white',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255,255,255,0.5)',
                  },
                },
              }}
            />
            
            <TextField
              fullWidth
              label={t('password')}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                  '&.Mui-focused': {
                    color: 'white',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255,255,255,0.5)',
                  },
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberPassword}
                    onChange={handleRememberPasswordChange}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-checked': {
                        color: 'white',
                      },
                    }}
                  />
                }
                label={t('rememberPassword')}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.875rem',
                  },
                }}
              />
              
              <Button
                onClick={handleForgotPassword}
                data-testid="forgot-password-link"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    color: 'white',
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('forgotPassword')}
              </Button>
            </Box>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: 'white',
                color: '#333',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {t('signIn')}
            </Button>
          </Box>
        )}

        {/* Registration Forms */}
        {activeTab === 1 && (
          <Box sx={{ width: '100%' }}>
            {/* Step 1: Enter Email */}
            {registrationStep === 0 && (
              <Box>
                <TextField
                  fullWidth
                  label={t('email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  data-testid="forgot-password-email-input"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />
                
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode || !formData.email}
                  sx={{
                    mt: 3,
                    mb: 2,
                    bgcolor: 'white',
                    color: '#333',
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    },
                    '&:disabled': {
                      bgcolor: 'rgba(255,255,255,0.5)',
                      color: 'rgba(0,0,0,0.5)',
                      transform: 'none',
                      boxShadow: 'none',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isSendingCode ? t('sending') : t('sendVerificationCode')}
                </Button>
              </Box>
            )}

            {/* Step 2: Verify Code */}
            {registrationStep === 1 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }} data-testid="verification-message">
                  {t('enterVerificationCode', { email: formData.email })}
                </Typography>
                
                <TextField
                  fullWidth
                  label={t('verificationCode')}
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  margin="normal"
                  inputProps={{ maxLength: 6 }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                    data-testid="resend-verification-button"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                      '&:disabled': {
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  >
                    {countdown > 0 ? t('resendInSeconds', { seconds: countdown }) : t('resendCode')}
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length !== 6}
                    sx={{
                      flex: 1,
                      bgcolor: 'white',
                      color: '#333',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                      },
                      '&:disabled': {
                        bgcolor: 'rgba(255,255,255,0.5)',
                        color: 'rgba(0,0,0,0.5)',
                      },
                    }}
                  >
                    {t('verifyCode')}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Step 3: Set Password */}
            {registrationStep === 2 && (
              <Box component="form" onSubmit={handleRegister}>
                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }}>
                  {t('emailVerifiedSetPassword')}
                </Typography>
                
                <TextField
                  fullWidth
                  label={t('password')}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  helperText={t('passwordMinLength')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label={t('confirmPassword')}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />

                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 3,
                    mb: 2,
                    bgcolor: 'white',
                    color: '#333',
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {t('createAccount')}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Forgot Password Forms */}
        {showForgotPassword && (
          <Box sx={{ width: '100%' }}>
            {/* Step 1: Enter Email */}
            {forgotPasswordStep === 0 && (
              <Box>
                <Typography variant="h6" data-testid="forgot-password-title" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                  {t('forgotPassword')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', opacity: 0.9 }}>
                  {t('enterEmailForReset')}
                </Typography>
                
                <TextField
                  fullWidth
                  label={t('email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBackToLogin}
                    data-testid="back-button"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {t('back')}
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={handleSendResetCode}
                    disabled={isSendingResetCode || !formData.email}
                    data-testid="send-reset-code-button"
                    sx={{
                      flex: 1,
                      bgcolor: 'white',
                      color: '#333',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                      },
                      '&:disabled': {
                        bgcolor: 'rgba(255,255,255,0.5)',
                        color: 'rgba(0,0,0,0.5)',
                      },
                    }}
                  >
                    {isSendingResetCode ? t('sending') : t('sendResetCode')}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Step 2: Enter Reset Code and New Password */}
            {forgotPasswordStep === 1 && (
              <Box component="form" onSubmit={handleResetPassword}>
                <Typography variant="h6" data-testid="reset-password-title" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                  {t('resetPassword')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', opacity: 0.9 }}>
                  {t('enterResetCodeAndPassword')}
                </Typography>
                
                <TextField
                  fullWidth
                  label={t('resetCode')}
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  margin="normal"
                  data-testid="reset-code-input"
                  inputProps={{ maxLength: 6 }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label={t('newPassword')}
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  data-testid="new-password-input"
                  InputLabelProps={{ shrink: true }}
                  helperText={t('passwordMinLength')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label={t('confirmNewPassword')}
                  type="password"
                  name="confirmNewPassword"
                  value={formData.confirmNewPassword}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  data-testid="confirm-new-password-input"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                      '&.Mui-focused': {
                        color: 'white',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                      },
                    },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleResendResetCode}
                    disabled={resetCountdown > 0}
                    data-testid="resend-reset-code-button"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                      '&:disabled': {
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  >
                    {resetCountdown > 0 ? t('resendInSeconds', { seconds: resetCountdown }) : t('resendCode')}
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!resetCode || !formData.newPassword || !formData.confirmNewPassword}
                    data-testid="reset-password-button"
                    sx={{
                      flex: 1,
                      bgcolor: 'white',
                      color: '#333',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                      },
                      '&:disabled': {
                        bgcolor: 'rgba(255,255,255,0.5)',
                        color: 'rgba(0,0,0,0.5)',
                      },
                    }}
                  >
                    {t('resetPassword')}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Step 3: Success */}
            {forgotPasswordStep === 2 && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" data-testid="password-reset-success-title" sx={{ mb: 2, fontWeight: 'bold' }}>
                  {t('passwordResetSuccess')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                  {t('passwordResetSuccessMessage')}
                </Typography>
                
                <Button
                  variant="contained"
                  onClick={handleBackToLogin}
                  data-testid="back-to-login-button"
                  sx={{
                    bgcolor: 'white',
                    color: '#333',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    },
                  }}
                >
                  {t('backToLogin')}
                </Button>
              </Box>
            )}
          </Box>
        )}
        
        <Typography variant="body2" sx={{ mt: 3, opacity: 0.8, textAlign: 'center' }}>
          {t('yourDataIsSecure')}
        </Typography>
      </Paper>
    </Container>
  );
};

export default Login; 