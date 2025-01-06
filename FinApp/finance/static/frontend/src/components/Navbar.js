import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import do przekierowań
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate(); // Inicjalizacja nawigacji

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    // Usuń token lub informacje użytkownika z localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Przekierowanie do strony logowania
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Linki Nawigacyjne */}
      <ul className={`nav-links ${isMobileMenuOpen ? 'nav-active' : ''}`}>
        <li><a href="/">Strona główna</a></li>
        <span className="nav-divider">|</span>
        <li><a href="/transactions">Transakcje</a></li>
        <span className="nav-divider">|</span>
        <li><a href="/categories">Kategorie</a></li>
        <span className="nav-divider">|</span>
        <li><a href="/budgets">Budżety</a></li>
        <span className="nav-divider">|</span>
        <li><a href="/goals">Cele oszczędnościowe</a></li>
        <span className="nav-divider">|</span>
        <li><a href="/reminders">Przypomnienia</a></li>
      </ul>

      {/* Menu Użytkownika */}
      <div className="user-menu-wrapper">
        <span className="user-text">Moje Konto</span>
        <div className="user-menu">
          <a href="/profile">Mój profil</a>
          <a href="/settings">Ustawienia konta</a>
          <button onClick={handleLogout}>Wyloguj</button>
        </div>
      </div>

      {/* Ikona Menu Mobilnego */}
      <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
        ☰
      </div>
    </nav>
  );
};

export default Navbar;
