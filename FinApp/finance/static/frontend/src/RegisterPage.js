import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './RegisterPage.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    language: 'en', // Domyślny język
    currency: 'USD', // Domyślna waluta
  });
  const [message, setMessage] = useState('');

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
      // Tworzenie użytkownika w Supabase Authentication
      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw new Error(`Błąd autoryzacji: ${authError.message}`);
      }

      console.log('User Data:', userData);

      // Dodanie danych użytkownika do tabeli `users`
      const { data: profileData, error: profileError } = await supabase
        .from('App_Users')
        .insert([
          {
            user_id: userData?.user?.id || null,
            username: formData.username,
            user_email: formData.email,
            password: formData.password, // UWAGA: Nigdy nie przechowuj haseł w czystym tekście w produkcji
            first_name: formData.firstName,
            last_name: formData.lastName,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            is_active: true,
            langauge: formData.language,
            currency: formData.currency,
          },
        ]);

      console.log('Profile Data:', profileData);
      console.log('Profile Error:', profileError);

      if (profileError) {
        throw new Error(`Błąd tworzenia profilu użytkownika: ${profileError.message || 'Nieznany błąd'}`);
      }

      setMessage('Rejestracja zakończona sukcesem! Sprawdź swój e-mail.');
    } catch (error) {
      console.error('Błąd:', error.message);
      setMessage(`Błąd: ${error.message}`);
    }
  };

  return (
    <div className="register-container">
      <h2>Rejestracja Użytkownika</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          name="username"
          placeholder="Nazwa użytkownika"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Hasło"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="firstName"
          placeholder="Imię"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Nazwisko"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
        <select
          name="language"
          value={formData.language}
          onChange={handleChange}
          required
        >
          <option value="en">English</option>
          <option value="pl">Polski</option>
        </select>
        <select
          name="currency"
          value={formData.currency}
          onChange={handleChange}
          required
        >
          <option value="USD">USD</option>
          <option value="PLN">PLN</option>
        </select>
        <button type="submit">Zarejestruj</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default RegisterPage;
