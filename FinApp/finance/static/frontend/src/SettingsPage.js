import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import './SettingsPage.css';

const SettingsPage = () => {
  // Dane użytkownika
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
  const [editData, setEditData] = useState(userData);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Walidacja imienia i nazwiska
  const [nameErrors, setNameErrors] = useState({ first_name: '', last_name: '' });

  // Dane do zmiany hasła (pozostałe funkcjonalności nie zmienione)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswordInstructions, setShowPasswordInstructions] = useState(false);

  // Funkcja pobierająca dane użytkownika – dodajemy parametr, aby wymusić świeże dane
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
        window.location.href = '/login';
        return;
      }
      // Używamy template literal, aby dodać parametr timestamp i uniknąć cachowania
      const response = await axios.get(
        `http://127.0.0.1:8000/api/user-profile/?t=${new Date().getTime()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData(response.data);
      setEditData(response.data); // Ustawiamy edytowalne dane na świeżo pobrane
    } catch (err) {
      setError('Nie udało się pobrać danych użytkownika.');
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Walidacja imienia oraz nazwiska – max 50 znaków i brak cyfr
  const validateName = (name) => {
    if (name.length > 50) {
      return "Maksymalna długość to 50 znaków.";
    }
    if (/\d/.test(name)) {
      return "Pole nie może zawierać cyfr.";
    }
    return "";
  };

  // Obsługa zmian w formularzu edycji profilu
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "first_name" || name === "last_name") {
      const errorMsg = validateName(value);
      setNameErrors({ ...nameErrors, [name]: errorMsg });
    }
    setEditData({ ...editData, [name]: value });
  };

  // Obsługa zapisu zmian – tworzymy payload z kluczem "username" (zgodnie z widokiem Django)
  const handleSaveChanges = async () => {
    if (nameErrors.first_name || nameErrors.last_name) {
      setError("Proszę poprawić błędy w imieniu lub nazwisku.");
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        username: editData.username, // teraz klucz jest "username"
        first_name: editData.first_name,
        last_name: editData.last_name,
        user_email: editData.user_email,
      };
      await axios.put('http://127.0.0.1:8000/api/user-profile/', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      setUserData(editData);
      setIsEditing(false);
      setSuccessMessage('Dane zostały pomyślnie zaktualizowane.');
      await fetchUserData();
    } catch (err) {
      setError('Nie udało się zapisać zmian.');
    }
  };

  // Obsługa zmian w polach zmiany hasła
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const computePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (strength < 2) {
      return { label: "słabe", color: "red" };
    } else if (strength === 2) {
      return { label: "średnie", color: "orange" };
    } else {
      return { label: "silne", color: "green" };
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (newPassword.length < 8) {
      setPasswordError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Hasło musi zawierać co najmniej jedną cyfrę.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setPasswordError("Hasło musi zawierać znak specjalny.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Nowe hasło i potwierdzenie nie są zgodne.");
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const resp = await axios.post(
        'http://127.0.0.1:8000/api/change-password/',
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.status === 200) {
        setPasswordSuccess("Hasło zostało zmienione pomyślnie.");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      setPasswordError("Nie udało się zmienić hasła. " + (error.response?.data?.error || ""));
    }
  };

  const { label: passwordStrengthLabel, color: passwordStrengthColor } = computePasswordStrength(passwordData.newPassword || "");

  return (
    <div className="settings-container">
      <Navbar />
      <div className="settings-content">
        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">{error}</p>}

        <h3 className="h3-settings">Ustawienia profilu</h3>
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
            {nameErrors.first_name && <p className="error-message">{nameErrors.first_name}</p>}
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
            {nameErrors.last_name && <p className="error-message">{nameErrors.last_name}</p>}
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
              <button type="button" className="settings-save-button" onClick={handleSaveChanges}>
                Zapisz
              </button>
              <button type="button" className="settings-cancel-button" onClick={() => setIsEditing(false)}>
                Anuluj
              </button>
            </>
          ) : (
            <button type="button" className="button" onClick={() => setIsEditing(true)}>
              Edytuj
            </button>
          )}
        </div>

        {/* Sekcja zmiany hasła – umieszczona nad informacjami dodatkowymi */}
        <h3 className="h3-settings">Zmiana hasła</h3>
        <div className="change-password">
          {passwordError && <p className="error-message">{passwordError}</p>}
          {passwordSuccess && <p className="success-message">{passwordSuccess}</p>}
          <div className="form-group">
            <label>Aktualne hasło:</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
            />
          </div>
          <div className="form-group">
            <label>Nowe hasło:</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              onFocus={() => setShowPasswordInstructions(true)}
              onBlur={() => setShowPasswordInstructions(false)}
            />
            {showPasswordInstructions && (
              <div className="password-instructions">
                <p>Hasło musi mieć co najmniej 8 znaków, zawierać co najmniej jedną cyfrę oraz jeden znak specjalny.</p>
                <p>
                  Siła hasła: <span style={{ color: passwordStrengthColor }}>{passwordStrengthLabel}</span>
                </p>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Potwierdź nowe hasło:</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
            />
          </div>
          <button type="button" className="settings-save-button" onClick={handleChangePassword}>
            Zmień hasło
          </button>
        </div>

        <h3 className="h3-settings">Informacje dodatkowe</h3>
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
