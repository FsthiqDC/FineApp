import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('🔄 Logowanie w toku...');

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/auth/login/', 
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { token, user } = response.data;
      
      // Zapisanie tokena i danych użytkownika w localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', user.username);
      localStorage.setItem('userType', user.user_type);

      setMessage('✅ Zalogowano pomyślnie!');
      
      // Przekierowanie do strony HomePage
      setTimeout(() => {
        navigate('/'); // Upewnij się, że '/' prowadzi do HomePage
      }, 1000);
    } catch (error) {
      console.error('Błąd logowania:', error.response?.data?.error || error.message);
      setMessage(`❌ ${error.response?.data?.error || 'Błąd logowania'}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <h2>💰 FinApp - Logowanie</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Wpisz swój email"
              required
            />
          </div>
          <div className="form-group">
            <label>Hasło:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wpisz swoje hasło"
              required
            />
          </div>
          <button type="submit" className="login-button">Zaloguj</button>
        </form>
        <p className="message">{message}</p>
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
