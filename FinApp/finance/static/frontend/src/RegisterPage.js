import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegisterPage.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'password') {
      evaluatePasswordStrength(value);
    }
  };

  const evaluatePasswordStrength = (password) => {
    const strengthCriteria = [
      /.{8,}/, // Minimum 8 znaków
      /[A-Z]/, // Jedna wielka litera
      /[a-z]/, // Jedna mała litera
      /[0-9]/, // Jedna cyfra
      /[@$!%*?&]/, // Jeden znak specjalny
    ];

    const passedCriteria = strengthCriteria.filter((regex) => regex.test(password)).length;

    if (passedCriteria === 5) setPasswordStrength('Silne');
    else if (passedCriteria >= 3) setPasswordStrength('Średnie');
    else setPasswordStrength('Słabe');
  };

  const validatePassword = (password) => {
    const requirements = [
      /.{8,}/, // Minimum 8 znaków
      /[A-Z]/, // Jedna wielka litera
      /[a-z]/, // Jedna mała litera
      /[0-9]/, // Jedna cyfra
      /[@$!%*?&]/, // Jeden znak specjalny
    ];
    return requirements.every((regex) => regex.test(password));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!validatePassword(formData.password)) {
      setError('Hasło nie spełnia wymagań bezpieczeństwa.');
      return;
    }

    if (!acceptTerms) {
      setError('Musisz zaakceptować regulamin, aby się zarejestrować.');
      return;
    }

    setMessage('🔄 Rejestracja w toku...');

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/auth/register/',
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 201) {
        setMessage('✅ Rejestracja zakończona sukcesem! Przekierowanie do logowania...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      setError(`❌ ${error.response?.data?.message || 'Wystąpił błąd rejestracji'}`);
    }
  };

  return (
    <div className="register-container">
      <div className="form-wrapper">
        <h1 className="register-title">Zarejestruj się do FinApp</h1>
        <p className="description">
          Załóż konto, aby zarządzać swoimi finansami w prosty i przejrzysty sposób.
        </p>
        <img src="/finapplogo.png" alt="FinApp Logo" className="register-logo" />

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika:</label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="Nazwa użytkownika"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Hasło"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setShowPasswordInfo(true)}
              onBlur={() => setShowPasswordInfo(false)}
              required
            />
            {showPasswordInfo && (
              <>
                <small className="password-requirements">
                  Hasło musi mieć co najmniej 8 znaków, w tym wielką literę, cyfrę i znak specjalny.
                </small>
                <div className={`password-strength ${passwordStrength.toLowerCase()}`}>
                  Siła hasła: {passwordStrength}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="firstName">Imię:</label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="Imię"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Nazwisko:</label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder="Nazwisko"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <label htmlFor="acceptTerms">
              Akceptuję <a href="/terms" target="_blank" rel="noopener noreferrer">regulamin</a>
            </label>
          </div>

          <button type="submit" className="register-button">
            Zarejestruj
          </button>
        </form>

        <p className="login-link">
          Masz już konto? <a href="/login">Zaloguj się</a>
        </p>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default RegisterPage;
