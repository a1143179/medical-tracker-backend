import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('languagePreference');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Listen for user login events to load language preference from backend
  useEffect(() => {
    const handleUserLogin = () => {
      loadLanguagePreference();
    };

    window.addEventListener('userLoggedIn', handleUserLogin);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin);
    };
  }, []);

  const setLanguage = async (newLanguage) => {
    setLanguageState(newLanguage);
    
    // Save to localStorage
    localStorage.setItem('languagePreference', newLanguage);
    
    // Try to save to backend if user is authenticated
    try {
      await fetch('/api/auth/language-preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ languagePreference: newLanguage })
      });
    } catch (error) {
      // Silently fail if user is not authenticated or endpoint is not available
      console.debug('Could not save language preference to backend:', error.message);
    }
  };

  // Function to load language preference from backend
  const loadLanguagePreference = async () => {
    try {
      const response = await fetch('/api/auth/language-preference', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setLanguageState(data.languagePreference);
        localStorage.setItem('languagePreference', data.languagePreference);
      }
    } catch (error) {
      // Silently fail if user is not authenticated or endpoint is not available
      console.debug('Could not load language preference from backend:', error.message);
    }
  };

  const translations = {
    en: {
      // App Bar
      appTitle: 'Blood Sugar Tracker',
      
      // Navigation
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      addNewRecord: 'Add New Record',
      records: 'Records',
      
      // Dashboard Cards
      latestReading: 'Latest Reading',
      averageLevel: 'Average Level',
      totalRecords: 'Total Records',
      noData: 'No data',
      basedOnReadings: 'Based on {count} readings',
      bloodSugarMeasurements: 'Blood sugar measurements',
      
      // Records Table
      bloodSugarRecords: 'Blood Sugar Records',
      addRecord: 'Add Record',
      dateTime: 'Date & Time',
      bloodSugarLevel: 'Blood Sugar (mmol/L)',
      status: 'Status',
      trend: 'Trend',
      notes: 'Notes',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      recordsPerPage: 'Records per page:',
      ofRecords: '{from}-{to} of {count}',
      
      // Analytics
      bloodSugarTrends: 'Blood Sugar Trends',
      recentReadings: 'Recent Readings',
      noDataForAnalytics: 'No data available for analytics',
      addRecordsForCharts: 'Add some blood sugar records to see charts and analytics',
      
      // Add/Edit Record
      addNewBloodSugarRecord: 'Add New Blood Sugar Record',
      editBloodSugarRecord: 'Edit Blood Sugar Record',
      dateTimeLabel: 'Date & Time',
      bloodSugarLevelLabel: 'Blood Sugar Level (mmol/L)',
      enterBloodSugarReading: 'Enter your blood sugar reading',
      notesLabel: 'Notes',
      optionalNotes: 'Optional notes about this reading',
      cancel: 'Cancel',
      update: 'Update',
      addRecordButton: 'Add Record',
      
      // Status Labels
      low: 'Low',
      high: 'High',
      elevated: 'Elevated',
      normal: 'Normal',
      
      // Messages
      recordAddedSuccessfully: 'Record added successfully',
      recordUpdatedSuccessfully: 'Record updated successfully',
      recordDeletedSuccessfully: 'Record deleted successfully',
      failedToFetchRecords: 'Failed to fetch records',
      failedToSaveRecord: 'Failed to save record',
      failedToDeleteRecord: 'Failed to delete record',
      userNotAuthenticated: 'User not authenticated',
      confirmDelete: 'Are you sure you want to delete this record?',
      
      // Language Switcher
      language: 'Language',
      english: 'English',
      chinese: '中文',
      
      // Header
      logout: 'Logout',
      welcome: 'Welcome,',
    },
    zh: {
      // App Bar
      appTitle: '血糖追踪器',
      
      // Navigation
      dashboard: '仪表板',
      analytics: '分析',
      addNewRecord: '添加新记录',
      records: '记录',
      
      // Dashboard Cards
      latestReading: '最新读数',
      averageLevel: '平均水平',
      totalRecords: '总记录数',
      noData: '无数据',
      basedOnReadings: '基于 {count} 次读数',
      bloodSugarMeasurements: '血糖测量',
      
      // Records Table
      bloodSugarRecords: '血糖记录',
      addRecord: '添加记录',
      dateTime: '日期和时间',
      bloodSugarLevel: '血糖 (mmol/L)',
      status: '状态',
      trend: '趋势',
      notes: '备注',
      actions: '操作',
      edit: '编辑',
      delete: '删除',
      recordsPerPage: '每页记录数:',
      ofRecords: '第 {from}-{to} 条，共 {count} 条',
      
      // Analytics
      bloodSugarTrends: '血糖趋势',
      recentReadings: '最近读数',
      noDataForAnalytics: '暂无分析数据',
      addRecordsForCharts: '添加一些血糖记录以查看图表和分析',
      
      // Add/Edit Record
      addNewBloodSugarRecord: '添加新血糖记录',
      editBloodSugarRecord: '编辑血糖记录',
      dateTimeLabel: '日期和时间',
      bloodSugarLevelLabel: '血糖水平 (mmol/L)',
      enterBloodSugarReading: '输入您的血糖读数',
      notesLabel: '备注',
      optionalNotes: '关于此读数的可选备注',
      cancel: '取消',
      update: '更新',
      addRecordButton: '添加记录',
      
      // Status Labels
      low: '低',
      high: '高',
      elevated: '偏高',
      normal: '正常',
      
      // Messages
      recordAddedSuccessfully: '记录添加成功',
      recordUpdatedSuccessfully: '记录更新成功',
      recordDeletedSuccessfully: '记录删除成功',
      failedToFetchRecords: '获取记录失败',
      failedToSaveRecord: '保存记录失败',
      failedToDeleteRecord: '删除记录失败',
      userNotAuthenticated: '用户未认证',
      confirmDelete: '您确定要删除此记录吗？',
      
      // Language Switcher
      language: 'Language',
      english: 'English',
      chinese: '中文',
      
      // Header
      logout: '退出登录',
      welcome: '欢迎,',
    }
  };

  const t = (key, params = {}) => {
    // Ensure translations and language are available
    if (!translations || !translations[language]) {
      console.warn('Translations not available, falling back to key:', key);
      return key;
    }
    
    let text = translations[language][key] || key;
    
    // Replace parameters in the text
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  };

  const value = {
    language,
    setLanguage,
    loadLanguagePreference,
    t,
    translations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 