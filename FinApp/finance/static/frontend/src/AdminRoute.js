// src/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  // Odczytujemy userType z localStorage
  const userType = localStorage.getItem('userType');
  console.log("AdminRoute: userType =", userType);

  // Jeśli userType jest równy "admin", zwracamy children, inaczej przekierowanie
  if (userType === "admin") {
    return children;
  }

  return <Navigate to="/" replace />;
};

export default AdminRoute;
