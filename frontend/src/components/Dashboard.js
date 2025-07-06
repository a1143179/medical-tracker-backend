import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Tooltip,
  Chip,
  TablePagination,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Analytics as AnalyticsIcon,
  AddCircle as AddCircleIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Backend API URL
const API_URL = '/api/records';

function Dashboard() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [records, setRecords] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState({ 
    id: null, 
    measurementTime: new Date().toISOString().substring(0, 16), 
    level: '', 
    notes: ''
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState(0);
  
  // Mobile navigation state
  const [mobilePage, setMobilePage] = useState('dashboard'); // 'dashboard', 'analytics', 'add'

  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) {
        showSnackbar(t('userNotAuthenticated'), 'error');
        return;
      }
      
      const response = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      setRecords(data.sort((a, b) => new Date(b.measurementTime) - new Date(a.measurementTime)));
    } catch (error) {
      showSnackbar(t('failedToFetchRecords'), 'error');
    }
  }, [user?.id, t, showSnackbar]);

  useEffect(() => {
    if (user?.id) {
      fetchRecords();
    }
  }, [user?.id, fetchRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentRecord({ ...currentRecord, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = user?.id;
      if (!userId) {
        showSnackbar('User not authenticated', 'error');
        return;
      }

      if (isEditing) {
        await fetch(`${API_URL}/${currentRecord.id}?userId=${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...currentRecord, 
            level: parseFloat(currentRecord.level)
          }),
        });
        showSnackbar(t('recordUpdatedSuccessfully'), 'success');
      } else {
        // Convert local time to UTC before sending to backend
        await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...currentRecord, 
            level: parseFloat(currentRecord.level), 
            measurementTime: new Date(currentRecord.measurementTime).toISOString()
          }),
        });
        showSnackbar(t('recordAddedSuccessfully'), 'success');
      }
      resetForm();
      fetchRecords();
      
      // Redirect to dashboard on mobile after adding record
      if (isMobile && !isEditing) {
        handleMobilePageChange('dashboard');
      }
    } catch (error) {
      showSnackbar(t('failedToSaveRecord'), 'error');
    }
  };

  const handleEdit = (record) => {
    setIsEditing(true);
    // Convert UTC time from backend to local time using standard Date methods
    // JavaScript automatically converts UTC to local time when creating Date object
    const utcDate = new Date(record.measurementTime);
    const localDateTime = formatDateTimeForInput(utcDate);
    
    setCurrentRecord({ 
      ...record, 
      measurementTime: localDateTime
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        const userId = user?.id;
        if (!userId) {
          showSnackbar(t('userNotAuthenticated'), 'error');
          return;
        }
        
        await fetch(`${API_URL}/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
        showSnackbar(t('recordDeletedSuccessfully'), 'success');
        fetchRecords();
      } catch (error) {
        showSnackbar(t('failedToDeleteRecord'), 'error');
      }
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    // Get current local time using standard Date methods
    const now = new Date();
    const localDateTime = formatDateTimeForInput(now);
    
    setCurrentRecord({ 
      id: null, 
      measurementTime: localDateTime, 
      level: '', 
      notes: ''
    });
    setOpenDialog(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleMobilePageChange = (page) => {
    setMobilePage(page);
    
    // Reset form when navigating away from add page
    if (page !== 'add') {
      resetForm();
    }
  };

  const getBloodSugarStatus = (level) => {
    if (level < 3.9) return { label: t('low'), color: 'error' };
    if (level > 10.0) return { label: t('high'), color: 'error' };
    if (level > 7.8) return { label: t('elevated'), color: 'warning' };
    return { label: t('normal'), color: 'success' };
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    
    // Format as YYYY-MM-DD HH:mm:ss in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateTimeForInput = (dateTime) => {
    const date = new Date(dateTime);
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getTrendIcon = (currentIndex) => {
    if (currentIndex === records.length - 1) return <RemoveIcon />;
    const current = records[currentIndex].level;
    const previous = records[currentIndex + 1].level;
    return current > previous ? <TrendingUpIcon color="error" /> : <TrendingDownIcon color="success" />;
  };

  const chartData = records.slice(0, 20).reverse().map(record => ({
    date: formatDateTime(record.measurementTime),
    level: record.level
  }));

  const averageLevel = records.length > 0 
    ? (records.reduce((sum, record) => sum + record.level, 0) / records.length).toFixed(1)
    : 0;

  const latestRecord = records[0];

  // Mobile Dashboard Content
  const MobileDashboard = () => (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
        <Card elevation={3}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('latestReading')}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
              {latestRecord ? `${latestRecord.level} mmol/L` : t('noData')}
            </Typography>
            {latestRecord && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {formatDateTime(latestRecord.measurementTime)}
                </Typography>
                <Chip 
                  label={getBloodSugarStatus(latestRecord.level).label}
                  color={getBloodSugarStatus(latestRecord.level).color}
                  size="medium"
                />
              </>
            )}
          </CardContent>
        </Card>
        
        <Card elevation={3}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('averageLevel')}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {averageLevel} mmol/L
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('basedOnReadings', { count: records.length })}
            </Typography>
          </CardContent>
        </Card>
        
        <Card elevation={3}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('totalRecords')}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {records.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('bloodSugarMeasurements')}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  // Mobile Analytics Content
  const MobileAnalytics = () => (
    <Box sx={{ p: 0 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2, px: 1 }}>
        {t('analytics')}
      </Typography>
      {records.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 1 }}>
          <Paper elevation={3} sx={{ p: 1.5 }}>
            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ShowChartIcon color="primary" />
              {t('bloodSugarTrends')}
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis domain={[0, 'dataMax + 2']} />
                <RechartsTooltip />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#1976d2" 
                  strokeWidth={3}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
          <Paper elevation={3} sx={{ p: 1.5 }}>
            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BarChartIcon color="primary" />
              {t('recentReadings')}
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis domain={[0, 'dataMax + 2']} />
                <RechartsTooltip />
                <Bar dataKey="level" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3, px: 1 }}>
          <Typography variant="body1" color="text.secondary">
            {t('noDataForAnalytics')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('addRecordsForCharts')}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Mobile Add Record Content
  const MobileAddRecord = () => (
    <Box sx={{ p: 0 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2, px: 1 }}>
        {t('addNewRecord')}
      </Typography>
      <Box sx={{ px: 1 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('dateTimeLabel')}
              type="datetime-local"
              name="measurementTime"
              value={currentRecord.measurementTime}
              onChange={handleInputChange}
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label={t('bloodSugarLevelLabel')}
              type="number"
              step="0.1"
              name="level"
              value={currentRecord.level}
              onChange={handleInputChange}
              required
              margin="normal"
              helperText={t('enterBloodSugarReading')}
            />
            <TextField
              fullWidth
              label={t('notesLabel')}
              name="notes"
              value={currentRecord.notes}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
              helperText={t('optionalNotes')}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => handleMobilePageChange('dashboard')}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth
              >
                {t('addRecordButton')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isMobile ? (
          // Mobile Layout
          <Container maxWidth="xs" sx={{ py: 0, pt: 2, flexGrow: 1, px: 0 }}>
            {mobilePage === 'dashboard' && <MobileDashboard />}
            {mobilePage === 'analytics' && <MobileAnalytics />}
            {mobilePage === 'add' && <MobileAddRecord />}
          </Container>
        ) : (
          // Desktop Layout
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <Grid container spacing={2}>
              {/* Left Sidebar - Summary Cards */}
              <Grid item xs={12} md={3}>
                <Paper elevation={3} sx={{ p: 2, height: 'fit-content' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Card elevation={3}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('latestReading')}
                        </Typography>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                          {latestRecord ? `${latestRecord.level} mmol/L` : t('noData')}
                        </Typography>
                        {latestRecord && (
                          <>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {formatDateTime(latestRecord.measurementTime)}
                            </Typography>
                            <Chip 
                              label={getBloodSugarStatus(latestRecord.level).label}
                              color={getBloodSugarStatus(latestRecord.level).color}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card elevation={3}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('averageLevel')}
                        </Typography>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                          {averageLevel} mmol/L
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('basedOnReadings', { count: records.length })}
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Card elevation={3}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('totalRecords')}
                        </Typography>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                          {records.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('bloodSugarMeasurements')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Paper>
              </Grid>

              {/* Right Content - Tabs Section */}
              <Grid item xs={12} md={9}>
                <Paper elevation={3} sx={{ mb: 2 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="blood sugar data tabs" size="small">
                                      <Tab label={t('records')} />
                <Tab label={t('analytics')} />
                    </Tabs>
                  </Box>
                  
                  {/* Tab Panel 0: Records */}
                  {activeTab === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h2">
                          {t('bloodSugarRecords')}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => setOpenDialog(true)}
                        >
                          {t('addRecord')}
                        </Button>
                      </Box>
                      <TableContainer sx={{ minWidth: 800 }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'grey.50' }}>
                              <TableCell><strong>{t('dateTime')}</strong></TableCell>
                              <TableCell><strong>{t('bloodSugarLevel')}</strong></TableCell>
                              <TableCell><strong>{t('status')}</strong></TableCell>
                              <TableCell><strong>{t('trend')}</strong></TableCell>
                              <TableCell><strong>{t('notes')}</strong></TableCell>
                              <TableCell><strong>{t('actions')}</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {records
                              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                              .map((record, index) => {
                              const status = getBloodSugarStatus(record.level);
                              const actualIndex = page * rowsPerPage + index;
                              return (
                                <TableRow key={record.id} hover>
                                  <TableCell>
                                    {formatDateTime(record.measurementTime)}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {record.level}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={status.label} 
                                      color={status.color} 
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {getTrendIcon(actualIndex)}
                                  </TableCell>
                                  <TableCell>
                                    {record.notes || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={t('edit')}>
                                      <IconButton onClick={() => handleEdit(record)} color="primary">
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('delete')}>
                                      <IconButton onClick={() => handleDelete(record.id)} color="error">
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        <TablePagination
                          rowsPerPageOptions={[5, 10, 25, 50]}
                          component="div"
                          count={records.length}
                          rowsPerPage={rowsPerPage}
                          page={page}
                          onPageChange={handleChangePage}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                          labelRowsPerPage={t('recordsPerPage')}
                          labelDisplayedRows={({ from, to, count }) => t('ofRecords', { from, to, count: count !== -1 ? count : `more than ${to}` })}
                        />
                      </TableContainer>
                    </Box>
                  )}

                  {/* Tab Panel 1: Analytics */}
                  {activeTab === 1 && (
                    <Box sx={{ p: 2, width: '100%' }}>
                      {records.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ShowChartIcon color="primary" />
                              {t('bloodSugarTrends')}
                            </Typography>
                            <LineChart width={800} height={300} data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 'dataMax + 2']} />
                              <RechartsTooltip />
                              <Line 
                                type="monotone" 
                                dataKey="level" 
                                stroke="#1976d2" 
                                strokeWidth={3}
                                dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </Paper>
                          <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BarChartIcon color="primary" />
                              {t('recentReadings')}
                            </Typography>
                            <BarChart width={800} height={300} data={chartData.slice(-10)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 'dataMax + 2']} />
                              <RechartsTooltip />
                              <Bar dataKey="level" fill="#1976d2" />
                            </BarChart>
                          </Paper>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="body1" color="text.secondary">
                            {t('noDataForAnalytics')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('addRecordsForCharts')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Container>
        )}
      </Box>

      {/* Add Record Dialog */}
      <Dialog open={openDialog} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? t('editBloodSugarRecord') : t('addNewBloodSugarRecord')}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label={t('dateTimeLabel')}
              type="datetime-local"
              name="measurementTime"
              value={currentRecord.measurementTime}
              onChange={handleInputChange}
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label={t('bloodSugarLevelLabel')}
              type="number"
              step="0.1"
              name="level"
              value={currentRecord.level}
              onChange={handleInputChange}
              required
              margin="normal"
              helperText={t('enterBloodSugarReading')}
            />
            <TextField
              fullWidth
              label={t('notesLabel')}
              name="notes"
              value={currentRecord.notes}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
              helperText={t('optionalNotes')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {isEditing ? t('update') : t('addRecordButton')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard; 