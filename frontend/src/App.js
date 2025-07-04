import React, { useState, useEffect } from 'react';
import './App.css';

// !! backend API URL
const API_URL = '/api/records'; 

function App() {
  const [records, setRecords] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState({ id: null, measurementTime: '', level: '', notes: '' });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const response = await fetch(API_URL);
    const data = await response.json();
    setRecords(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentRecord({ ...currentRecord, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await fetch(`${API_URL}/${currentRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentRecord, level: parseFloat(currentRecord.level) }),
      });
    } else {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentRecord, level: parseFloat(currentRecord.level), measurementTime: new Date(currentRecord.measurementTime).toISOString() }),
      });
    }
    resetForm();
    fetchRecords();
  };

  const handleEdit = (record) => {
    setIsEditing(true);
    setCurrentRecord({ ...record, measurementTime: new Date(record.measurementTime).toISOString().substring(0, 16) });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchRecords();
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrentRecord({ id: null, measurementTime: '', level: '', notes: '' });
  };

  return (
    <div className="App">
      <h1>血糖历史记录</h1>
      <form onSubmit={handleSubmit} className="record-form">
        <h3>{isEditing ? 'Edit record' : 'Create new record'}</h3>
        <input type="datetime-local" name="measurementTime" value={currentRecord.measurementTime} onChange={handleInputChange} required />
        <input type="number" step="0.1" name="level" placeholder="Blood Sugar Value (mmol/L)" value={currentRecord.level} onChange={handleInputChange} required />
        <input type="text" name="notes" placeholder="Note" value={currentRecord.notes} onChange={handleInputChange} />
        <button type="submit">{isEditing ? 'Update' : 'Add'}</button>
        {isEditing && <button type="button" onClick={resetForm}>Cancel</button>}
      </form>
      
      <h2>Record list</h2>
      <table>
        <thead>
          <tr>
            <th>Test time</th>
            <th>Blood sugar value (mmol/L)</th>
            <th>Note</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.id}>
              <td>{new Date(record.measurementTime).toLocaleString()}</td>
              <td>{record.level}</td>
              <td>{record.notes}</td>
              <td>
                <button onClick={() => handleEdit(record)}>Edit</button>
                <button onClick={() => handleDelete(record.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;