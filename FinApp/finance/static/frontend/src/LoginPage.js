import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  // Wczytaj stan "Pamiętaj mnie" z localStorage
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem('email');
      setEmail(savedEmail || '');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('🔄 Logowanie w toku...');
    setShowForgotPassword(false); // Ukryj link, zanim sprawdzimy logowanie

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/auth/login/',
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', user.username);
      localStorage.setItem('userType', user.user_type);

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('email', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('email');
      }

      setMessage('✅ Zalogowano pomyślnie!');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error(
        'Błąd logowania:',
        error.response?.data?.error || error.message
      );
      setMessage(`❌ ${error.response?.data?.error || 'Błąd logowania'}`);
      setShowForgotPassword(true); // Pokaż link po błędnym logowaniu
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Nagłówek */}
        <h1 className="login-title">Zaloguj się do FinApp</h1>

        {/* Logo */}
        <img src="/finapplogo.png" alt="FinApp Logo" className="login-logo" />

        {/* Formularz */}
        <form onSubmit={handleLogin} aria-label="Formularz logowania">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Wpisz swój email"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wpisz swoje hasło"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Pamiętaj mnie</label>
          </div>

          <button type="submit" className="login-button">
            Zaloguj
          </button>
        </form>

        {/* Komunikaty */}
        <p className="message" role="status">
          {message}
        </p>

        {/* Link „Zapomniałeś hasła?” */}
        {showForgotPassword && (
          <p className="forgot-password">
            <a href="/forgot-password">Zapomniałeś hasła?</a>
          </p>
        )}

        {/* Przycisk rejestracji */}
        <button
          className="register-button"
          onClick={() => navigate('/register')}
        >
          Zarejestruj się
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
