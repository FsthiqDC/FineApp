// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import HomePage from './HomePage';
import CategoriesPage from './CategoriesPage';
import SettingsPage from './SettingsPage';
import TransactionsPage from './TransactionsPage';
import TargetsPage from './TargetsPage';
import BudgetsPage from './BudgetsPage';
import RemindersPage from './RemindersPage';
import Decider from './Decider';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import TransactionsAdminPage from './pages/admin/TransactionsAdminPage';
import SavingGoalsAdminPage from './pages/admin/SavingGoalsAdminPage';
import RemindersAdminPage from './pages/admin/RemindersAdminPage';
import CategoriesAdminPage from './pages/admin/CategoriesAdminPage';

import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Publiczne trasy */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Decider -> sprawdza, kim jest user i decyduje gdzie przekierować */}
        <Route path="/" element={<Decider />} />

        {/* Trasy dla zwykłego użytkownika */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/targets"
          element={
            <ProtectedRoute>
              <TargetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <BudgetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <RemindersPage />
            </ProtectedRoute>
          }
        />

        {/* ============= ADMIN ROUTES (bez zagnieżdżania) ============= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UsersAdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <TransactionsAdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/saving-goals"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <SavingGoalsAdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reminders"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <RemindersAdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <CategoriesAdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
