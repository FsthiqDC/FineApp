// src/Decider.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const Decider = () => {
  const token = localStorage.getItem('authToken');
  const userType = localStorage.getItem('userType');

  // 1. Brak zalogowania -> /login
  if (!token || !userType) {
    return <Navigate to="/login" replace />;
  }

  // 2. Jeśli userType = 'admin' -> /admin
  if (userType === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // 3. W innym wypadku -> /home
  return <Navigate to="/home" replace />;
};

export default Decider;
