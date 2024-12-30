import React, { useState } from 'react';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/auth/login//', { email, password });
      if (response.status === 200) {
        setMessage('Zalogowano pomyślnie!');
        // Przekierowanie do strony głównej lub panelu użytkownika
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setMessage('Nieprawidłowe dane logowania.');
    }
  };

  return (
    <div className="login-container">
      <h2>FinApp - Logowanie</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Hasło:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">Zaloguj</button>
      </form>
      <p className="message">{message}</p>
      <button
        className="register-button"
        onClick={() => (window.location.href = '/register')}
      >
        Zarejestruj
      </button>
    </div>
  );
};

export default LoginPage;
