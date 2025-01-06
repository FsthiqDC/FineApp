import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('Rejestracja w toku...');

    try {
      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw new Error(`Błąd autoryzacji: ${authError.message}`);
      }

      const { error: profileError } = await supabase.from('App_Users').insert([
        {
          user_id: userData?.user?.id || null,
          username: formData.username,
          user_email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          is_active: true,
          langauge: 'PL', // Ustawiamy domyślnie jako PL
          currency: 'PLN', // Ustawiamy domyślnie jako PLN
          user_type: 'user'
        },
      ]);

      if (profileError) {
        throw new Error(`Błąd tworzenia profilu użytkownika: ${profileError.message}`);
      }

      setMessage('Rejestracja zakończona sukcesem! Przekierowanie do logowania...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Błąd:', error.message);
      setMessage(`Błąd: ${error.message}`);
    }
  };

  return (
    <div className="register-container">
      <div className="form-wrapper">
        <h2>🔑 Rejestracja Użytkownika</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Nazwa użytkownika:</label>
            <input
              type="text"
              name="username"
              placeholder="Nazwa użytkownika"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Hasło:</label>
            <input
              type="password"
              name="password"
              placeholder="Hasło"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Imię:</label>
            <input
              type="text"
              name="firstName"
              placeholder="Imię"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Nazwisko:</label>
            <input
              type="text"
              name="lastName"
              placeholder="Nazwisko"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="register-button">Zarejestruj</button>
        </form>
        <p className="message">{message}</p>
      </div>
    </div>
  );
};

export default RegisterPage;
