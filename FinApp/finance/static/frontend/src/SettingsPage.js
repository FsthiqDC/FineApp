import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import './SettingsPage.css';

const SettingsPage = () => {
  // Ustaw domyślne dane użytkownika na pusty obiekt
  const [userData, setUserData] = useState({
    username: '',
    created_at: '',
    last_login: '',
    is_active: false,
    first_name: '',
    last_name: '',
    user_email: '',
    langauge: '',
    currency: '',
  });
  const [editData, setEditData] = useState(userData); // Dane do edycji
  const [isEditing, setIsEditing] = useState(false); // Tryb edycji
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pobierz dane użytkownika
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
          window.location.href = '/login';
          return;
        }

        const response = await axios.get('http://127.0.0.1:8000/api/user-profile/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserData(response.data);
        setEditData(response.data); // Ustaw dane edycyjne jako początkowe
      } catch (err) {
        setError('Nie udało się pobrać danych użytkownika.');
      }
    };

    fetchUserData();
  }, []);

  // Obsługa zmian w formularzu
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  // Obsługa zapisu zmian
  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put('http://127.0.0.1:8000/api/user-profile/', editData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData(editData); // Aktualizuj dane wyświetlane po edycji
      setIsEditing(false);
      setSuccessMessage('Dane zostały pomyślnie zaktualizowane.');
    } catch (err) {
      setError('Nie udało się zapisać zmian.');
    }
  };

  return (
    <div className="settings-container">
      <Navbar />
      <h2>Ustawienia profilu</h2>
      <div className="settings-content">
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        <h3>Edytuj informacje</h3>
        <form className="edit-form">
          <div className="form-group">
            <label>Nick:</label>
            <input
              type="text"
              name="username"
              value={editData.username || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Imię:</label>
            <input
              type="text"
              name="first_name"
              value={editData.first_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Nazwisko:</label>
            <input
              type="text"
              name="last_name"
              value={editData.last_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Adres e-mail:</label>
            <input
              type="email"
              name="user_email"
              value={editData.user_email || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>
        </form>

        <div className="buttons">
          {isEditing ? (
            <>
              <button className="button" onClick={handleSaveChanges}>
                Zapisz zmiany
              </button>
              <button className="button" onClick={() => setIsEditing(false)}>
                Anuluj
              </button>
            </>
          ) : (
            <button className="button" onClick={() => setIsEditing(true)}>
              Edytuj
            </button>
          )}
        </div>

        <h3>Informacje dodatkowe</h3>
        <div className="profile-info">
          <div className="field">
            <label>Język:</label>
            <span>{userData.langauge || 'Brak danych'}</span>
          </div>
          <div className="field">
            <label>Waluta:</label>
            <span>{userData.currency || 'Brak danych'}</span>
          </div>
          <div className="field">
            <label>Data utworzenia:</label>
            <span>
              {userData.created_at
                ? new Date(userData.created_at).toLocaleString()
                : 'Brak danych'}
            </span>
          </div>
          <div className="field">
            <label>Ostatnie logowanie:</label>
            <span>
              {userData.last_login
                ? new Date(userData.last_login).toLocaleString()
                : 'Brak danych'}
            </span>
          </div>
          <div className="field">
            <label>Status konta:</label>
            <span>{userData.is_active ? 'Aktywne' : 'Nieaktywne'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
