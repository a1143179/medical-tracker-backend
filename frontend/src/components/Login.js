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
  Divider,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { Email as EmailIcon, Lock as LockIcon, Person as PersonIcon, Verified as VerifiedIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import emailService from '../services/emailService';

const Login = () => {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rememberPassword, setRememberPassword] = useState(false);



  const [registrationStep, setRegistrationStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });



  // Countdown timer for resend code
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

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
      setError('Please enter your email address first');
      return;
    }

    try {
      setIsSendingCode(true);
      setError(null);
      
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Use email service to send verification code
      const result = await emailService.sendVerificationCode(formData.email, code);
      
      setSuccess(result.message);
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
      setSuccess('Email verified successfully!');
      setRegistrationStep(2);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendVerificationCode();
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
      'Enter Email',
      'Verify Email',
      'Set Password'
    ];
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
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
            BS
          </Typography>
        </Avatar>
        
        <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Blood Sugar Tracker
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', opacity: 0.9 }}>
          Track your blood sugar levels and monitor your health with our comprehensive dashboard.
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
            <Tab label="Login" />
            <Tab label="Register" />
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
          <Alert severity="error" sx={{ mb: 3, width: '100%', bgcolor: 'rgba(255,255,255,0.9)', color: 'error.main' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
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
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Email"
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
              label="Password"
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
              label="Remember Password"
              sx={{
                mt: 1,
                '& .MuiFormControlLabel-label': {
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.875rem',
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
              Sign In
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
                  label="Email"
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
                  {isSendingCode ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </Box>
            )}

            {/* Step 2: Verify Code */}
            {registrationStep === 1 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }}>
                  Enter the 6-digit verification code sent to {formData.email}
                </Typography>
                
                <TextField
                  fullWidth
                  label="Verification Code"
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
                    {countdown > 0 ? `Resend (${countdown}s)` : 'Resend Code'}
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
                    Verify Code
                  </Button>
                </Box>
              </Box>
            )}

            {/* Step 3: Set Password */}
            {registrationStep === 2 && (
              <Box component="form" onSubmit={handleRegister}>
                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }}>
                  Email verified! Now set your password
                </Typography>
                
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  helperText="Password must be at least 6 characters long"
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
                  label="Confirm Password"
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
                  Create Account
                </Button>
              </Box>
            )}
          </Box>
        )}
        
        <Typography variant="body2" sx={{ mt: 3, opacity: 0.8, textAlign: 'center' }}>
          Your data is secure and private. We only store your basic account information.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Login; 