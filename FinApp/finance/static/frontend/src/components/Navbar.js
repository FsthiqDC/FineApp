import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import axios from 'axios';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userType, setUserType] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Odczyt userType z localStorage
  useEffect(() => {
    const storedUserType = localStorage.getItem("userType");
    console.log('Navbar: userType =', storedUserType);
    if (storedUserType) {
      setUserType(storedUserType);
    }
  }, []);

  // Sprawdzenie, czy użytkownik jest administratorem
  const isAdmin = userType === 'admin';

  // getHomeLink: decyduje /admin czy /home
  const getHomeLink = () => {
    return isAdmin ? '/admin' : '/home';
  };

  // Toggle burger menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  // Pobranie powiadomień
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const resp = await axios.get('http://127.0.0.1:8000/api/reminders/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allNotifs = resp.data.reminders || [];
      const now = new Date();
      const validNotifs = allNotifs.filter(item => {
        if (item.reminder_frequency === 'once') {
          return new Date(item.reminder_next_date) > now;
        }
        return true;
      });
      setNotifications(validNotifs);
    } catch (err) {
      console.error('Navbar: Błąd pobierania powiadomień:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Funkcja sprawdzająca, czy dany link jest aktywny
  const isActive = (path) => location.pathname === path;

  // Kliknięcie w logo -> do /admin jeśli admin, /home w innym wypadku
  const handleLogoClick = () => {
    navigate(getHomeLink());
  };

  // Obsługa kliknięć poza menu użytkownika lub powiadomieniami
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Lewa część – logo i linki */}
      <div className="navbar-left">
        <div className="navbar-logo" onClick={handleLogoClick}>
          <img src="/finapplogo.png" alt="FinApp Logo" />
        </div>
        <ul className={`nav-links ${isMobileMenuOpen ? 'nav-active' : ''}`}>
          {/* Link "Strona Główna" */}
          <li>
            <Link to={getHomeLink()} className={isActive(getHomeLink()) ? 'active' : ''}>
              Strona główna
            </Link>
          </li>

          {isAdmin ? (
            <>
              <li>
                <Link to="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>
                  Użytkownicy
                </Link>
              </li>
              <li>
                <Link to="/admin/transactions" className={isActive('/admin/transactions') ? 'active' : ''}>
                  Transakcje
                </Link>
              </li>
              <li>
                <Link to="/admin/saving-goals" className={isActive('/admin/saving-goals') ? 'active' : ''}>
                  Cele oszczędnościowe
                </Link>
              </li>
              <li>
                <Link to="/admin/reminders" className={isActive('/admin/reminders') ? 'active' : ''}>
                  Przypomnienia
                </Link>
              </li>
              <li>
                <Link to="/admin/categories" className={isActive('/admin/categories') ? 'active' : ''}>
                  Kategorie
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/transactions" className={isActive('/transactions') ? 'active' : ''}>
                  Transakcje
                </Link>
              </li>
              <li>
                <Link to="/targets" className={isActive('/targets') ? 'active' : ''}>
                  Cele oszczędnościowe
                </Link>
              </li>
              <li>
                <Link to="/reminders" className={isActive('/reminders') ? 'active' : ''}>
                  Przypomnienia
                </Link>
              </li>
              <li>
                <Link to="/budgets" className={isActive('/budgets') ? 'active' : ''}>
                  Budżety
                </Link>
              </li>
              <li>
                <Link to="/categories" className={isActive('/categories') ? 'active' : ''}>
                  Kategorie
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Prawa część */}
      <div className="navbar-right">
        <div
          className="bell-icon"
          ref={notificationsRef}
          onClick={() => setIsNotificationsOpen(prev => !prev)}
        >
          <img src="/bell-icon.png" alt="Notifications" />
          {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
          {isNotificationsOpen && (
            <div className="notification-dropdown">
              {notifications.length === 0 ? (
                <div className="notification-item">Brak powiadomień</div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.reminder_id}
                    className="notification-item"
                    onClick={() =>
                      setNotifications(prev => prev.filter(r => r.reminder_id !== item.reminder_id))
                    }
                  >
                    <strong>{item.reminder_title}</strong>
                    <br />
                    <span>
                      Następne: {new Date(item.reminder_next_date).toLocaleString('pl-PL')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="user-menu-wrapper" ref={userMenuRef}>
          <span className="user-text" onClick={() => setIsUserMenuOpen(prev => !prev)}>
            Moje Konto
          </span>
          {isUserMenuOpen && (
            <div className="user-menu">
              <Link to="/settings">Ustawienia konta</Link>
              <a onClick={handleLogout} className="logout-button">
                Wyloguj
              </a>
            </div>
          )}
        </div>

        {/* Burger Menu */}
        <div
          className={`burger ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
        >
          <div className="burger-line"></div>
          <div className="burger-line"></div>
          <div className="burger-line"></div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <div className="mobile-burger-wrapper">
              <div
                className={`burger ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={toggleMobileMenu}
              >
                <div className="burger-line"></div>
                <div className="burger-line"></div>
                <div className="burger-line"></div>
              </div>
            </div>
            <div className="mobile-bell-icon" onClick={() => setIsNotificationsOpen(prev => !prev)}>
              <img src="/bell-icon.png" alt="Notifications" />
              {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
              {isNotificationsOpen && (
                <div className="notification-dropdown">
                  {notifications.length === 0 ? (
                    <div className="notification-item">Brak powiadomień</div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.reminder_id}
                        className="notification-item"
                        onClick={() =>
                          setNotifications(prev => prev.filter(r => r.reminder_id !== item.reminder_id))
                        }
                      >
                        <strong>{item.reminder_title}</strong>
                        <br />
                        <span>
                          Następne: {new Date(item.reminder_next_date).toLocaleString('pl-PL')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <ul className="mobile-nav-links">
            {/* Link "Strona Główna" */}
            <li>
              <Link
                to={getHomeLink()}
                onClick={() => setIsMobileMenuOpen(false)}
                className={isActive(getHomeLink()) ? 'active' : ''}
              >
                Strona Główna
              </Link>
            </li>

            {isAdmin ? (
              <>
                <li>
                  <Link
                    to="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/admin/users') ? 'active' : ''}
                  >
                    Użytkownicy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/transactions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/admin/transactions') ? 'active' : ''}
                  >
                    Transakcje
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/saving-goals"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/admin/saving-goals') ? 'active' : ''}
                  >
                    Cele oszczędnościowe
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/reminders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/admin/reminders') ? 'active' : ''}
                  >
                    Przypomnienia
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/admin/categories') ? 'active' : ''}
                  >
                    Kategorie
                  </Link>
                </li>
                <li>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/transactions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/transactions') ? 'active' : ''}
                  >
                    Transakcje
                  </Link>
                </li>
                <li>
                  <Link
                    to="/targets"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/targets') ? 'active' : ''}
                  >
                    Cele oszczędnościowe
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reminders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/reminders') ? 'active' : ''}
                  >
                    Przypomnienia
                  </Link>
                </li>
                <li>
                  <Link
                    to="/budgets"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/budgets') ? 'active' : ''}
                  >
                    Budżety
                  </Link>
                </li>
                <li>
                  <Link
                    to="/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={isActive('/categories') ? 'active' : ''}
                  >
                    Kategorie
                  </Link>
                </li>
              </>
            )}
          </ul>
          <div className="mobile-user-menu">
            <Link
              to="/settings"
              className="mobile-user-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Ustawienia konta
            </Link>
            <a onClick={handleLogout} className="mobile-logout-button">
              Wyloguj
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
