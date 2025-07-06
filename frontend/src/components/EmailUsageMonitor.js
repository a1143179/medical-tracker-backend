import React, { useState, useEffect } from 'react';
import { Alert, ProgressBar, Badge } from 'react-bootstrap';
import emailService from '../services/emailService';

const EmailUsageMonitor = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const usageData = await emailService.getEmailUsage();
      setUsage(usageData);
    } catch (err) {
      setError('Failed to load email usage');
      console.error('Usage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return <Alert variant="info">Loading email usage...</Alert>;
  }

  if (error) {
    return <Alert variant="warning">{error}</Alert>;
  }

  if (!usage) {
    return null;
  }

  const { sent, limit, remaining, resetTime } = usage;
  const percentage = (sent / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getVariant = () => {
    if (isAtLimit) return 'danger';
    if (isNearLimit) return 'warning';
    return 'success';
  };

  const formatResetTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Alert variant={getVariant()} className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          <i className="fas fa-envelope me-2"></i>
          Email Usage Today
        </h6>
        <Badge bg={getVariant()}>
          {sent}/{limit} emails
        </Badge>
      </div>
      
      <ProgressBar 
        variant={getVariant()} 
        now={percentage} 
        className="mb-2"
        label={`${Math.round(percentage)}%`}
      />
      
      <div className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          {remaining} emails remaining
        </small>
        <small className="text-muted">
          Resets: {formatResetTime(resetTime)}
        </small>
      </div>
      
      {isNearLimit && !isAtLimit && (
        <Alert variant="warning" className="mt-2 mb-0 py-2">
          <small>
            <i className="fas fa-exclamation-triangle me-1"></i>
            You're approaching the daily email limit. Consider upgrading your plan.
          </small>
        </Alert>
      )}
      
      {isAtLimit && (
        <Alert variant="danger" className="mt-2 mb-0 py-2">
          <small>
            <i className="fas fa-ban me-1"></i>
            Daily email limit reached. Emails will be blocked until tomorrow.
          </small>
        </Alert>
      )}
    </Alert>
  );
};

export default EmailUsageMonitor; 