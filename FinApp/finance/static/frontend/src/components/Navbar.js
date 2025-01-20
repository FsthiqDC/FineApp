import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo">
        <img src="/finapplogo.png" alt="FinApp Logo" />
      </div>

      {/* Desktop Navbar */}
      <ul className={`nav-links ${isMobileMenuOpen ? 'nav-active' : ''}`}>
        <li><a href="/">Strona główna</a></li>
        <li><a href="/transactions">Transakcje</a></li>
        <li><a href="/targets">Cele oszczędnościowe</a></li>
        <li><a href="/budgets">Budżety</a></li>
        <li><a href="/reminders">Przypomnienia</a></li>
        <li><a href="/categories">Kategorie</a></li>
      </ul>

      {/* Zarządzanie kontem */}
      <div className="user-menu-wrapper" onMouseEnter={toggleUserMenu} onMouseLeave={toggleUserMenu}>
        <span className="user-text">Moje Konto</span>
        {isUserMenuOpen && (
          <div className="user-menu">
            <a href="/settings">Ustawienia konta</a>
            <a onClick={handleLogout} className="logout-button">Wyloguj</a>
          </div>
        )}
      </div>

      {/* Burger Menu */}
      <div className={`burger ${isMobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
        <div className="burger-line"></div>
        <div className="burger-line"></div>
        <div className="burger-line"></div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <ul className="mobile-user-menu">
            <li><a href="/">Strona główna</a></li>
            <li><a href="/transactions">Transakcje</a></li>
            <li><a href="/targets">Cele oszczędnościowe</a></li>
            <li><a href="/budgets">Budżety</a></li>
            <li><a href="/reminders">Przypomnienia</a></li>
            <li><a href="/categories">Kategorie</a></li>
          </ul>
          <hr />
          <div className="mobile-user-menu">
            <a href="/profile">Mój profil</a>
            <a href="/settings">Ustawienia konta</a>
            <a onClick={handleLogout} className="logout-button">Wyloguj</a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
