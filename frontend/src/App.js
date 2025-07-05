import React, { useState, useEffect } from 'react';
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
  Fab,
  Tooltip,
  Chip,
  Divider,
  TablePagination,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon
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
  Bar,
  Area,
  AreaChart
} from 'recharts';

// Backend API URL
const API_URL = '/api/records';

function App() {
  const [records, setRecords] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState({ 
    id: null, 
    measurementTime: '', 
    level: '', 
    notes: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setRecords(data.sort((a, b) => new Date(b.measurementTime) - new Date(a.measurementTime)));
    } catch (error) {
      showSnackbar('Failed to fetch records', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentRecord({ ...currentRecord, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await fetch(`${API_URL}/${currentRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...currentRecord, level: parseFloat(currentRecord.level) }),
        });
        showSnackbar('Record updated successfully', 'success');
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...currentRecord, 
            level: parseFloat(currentRecord.level), 
            measurementTime: new Date(currentRecord.measurementTime).toISOString() 
          }),
        });
        showSnackbar('Record added successfully', 'success');
      }
      resetForm();
      fetchRecords();
    } catch (error) {
      showSnackbar('Failed to save record', 'error');
    }
  };

  const handleEdit = (record) => {
    setIsEditing(true);
    setCurrentRecord({ 
      ...record, 
      measurementTime: new Date(record.measurementTime).toISOString().substring(0, 16) 
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        showSnackbar('Record deleted successfully', 'success');
        fetchRecords();
      } catch (error) {
        showSnackbar('Failed to delete record', 'error');
      }
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrentRecord({ id: null, measurementTime: '', level: '', notes: '' });
    setOpenDialog(false);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
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

  const getBloodSugarStatus = (level) => {
    if (level < 3.9) return { label: 'Low', color: 'error' };
    if (level > 10.0) return { label: 'High', color: 'error' };
    if (level > 7.8) return { label: 'Elevated', color: 'warning' };
    return { label: 'Normal', color: 'success' };
  };

  const getTrendIcon = (currentIndex) => {
    if (currentIndex === records.length - 1) return <RemoveIcon />;
    const current = records[currentIndex].level;
    const previous = records[currentIndex + 1].level;
    return current > previous ? <TrendingUpIcon color="error" /> : <TrendingDownIcon color="success" />;
  };

  const chartData = records.slice(0, 20).reverse().map(record => ({
    date: new Date(record.measurementTime).toLocaleDateString(),
    level: record.level,
    time: new Date(record.measurementTime).toLocaleTimeString()
  }));

  const averageLevel = records.length > 0 
    ? (records.reduce((sum, record) => sum + record.level, 0) / records.length).toFixed(1)
    : 0;

  const latestRecord = records[0];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Blood Sugar Tracker
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Monitor and analyze your blood glucose levels
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Paper elevation={3} sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Latest Reading
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {latestRecord ? `${latestRecord.level} mmol/L` : 'No data'}
                </Typography>
                {latestRecord && (
                  <Chip 
                    label={getBloodSugarStatus(latestRecord.level).label}
                    color={getBloodSugarStatus(latestRecord.level).color}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Average Level
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {averageLevel} mmol/L
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Based on {records.length} readings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Total Records
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {records.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Blood sugar measurements
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Section */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="blood sugar data tabs">
            <Tab label="Records" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>
        
        {/* Tab Panel 0: Records */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Blood Sugar Records
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell><strong>Date & Time</strong></TableCell>
                    <TableCell><strong>Blood Sugar (mmol/L)</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Trend</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
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
                          {new Date(record.measurementTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
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
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleEdit(record)} color="primary">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
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
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
              />
            </TableContainer>
          </Box>
        )}

        {/* Tab Panel 1: Analytics */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {records.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShowChartIcon color="primary" />
                    Blood Sugar Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
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
                  </ResponsiveContainer>
                </Paper>
                <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChartIcon color="primary" />
                    Recent Readings
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 'dataMax + 2']} />
                      <RechartsTooltip />
                      <Bar dataKey="level" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No data available for analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add some blood sugar records to see charts and analytics
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Add Record Dialog */}
      <Dialog open={openDialog} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Blood Sugar Record' : 'Add New Blood Sugar Record'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Date & Time"
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
              label="Blood Sugar Level (mmol/L)"
              type="number"
              step="0.1"
              name="level"
              value={currentRecord.level}
              onChange={handleInputChange}
              required
              margin="normal"
              helperText="Enter your blood sugar reading"
            />
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={currentRecord.notes}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
              helperText="Optional notes about this reading"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {isEditing ? 'Update' : 'Add Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Add New Record">
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setOpenDialog(true)}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

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
    </Container>
  );
}

export default App;