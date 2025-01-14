import React, { useState, useEffect } from 'react';
import './Cookies.css';

const CookiesBanner = () => {
  const [cookiesAccepted, setCookiesAccepted] = useState(null);

  useEffect(() => {
    const savedPreference = localStorage.getItem('cookiesAccepted');
    if (savedPreference) {
      const isAccepted = JSON.parse(savedPreference);
      setCookiesAccepted(isAccepted);

      if (isAccepted) {
        enableCookies();
      } else {
        disableCookies();
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', true);
    setCookiesAccepted(true);
    enableCookies();
  };

  const handleReject = () => {
    localStorage.setItem('cookiesAccepted', false);
    setCookiesAccepted(false);
    disableCookies();
  };

  const enableCookies = () => {
    console.log('Cookies zostały zaakceptowane. Uruchamiam logikę dla cookies...');
    // Przykład: Włączenie Google Analytics
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'GA_TRACKING_ID'); // Zamień na swój ID Google Analytics
  };

  const disableCookies = () => {
    console.log('Cookies zostały odrzucone. Czyszczenie cookies...');
    // Przykład: Usunięcie cookies związanych z Google Analytics
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  };

  if (cookiesAccepted !== null) {
    return null; // Nie wyświetlaj bannera, jeśli decyzja została już podjęta
  }

  return (
    <div className="cookies-banner">
      <p>
        Ta strona korzysta z plików cookies, aby zapewnić Ci najlepsze możliwe doświadczenie. 
        Klikając "Akceptuję", wyrażasz zgodę na przetwarzanie plików cookies. 
        Możesz dowiedzieć się więcej, odwiedzając naszą{' '}
        <a href="/cookies-policy" target="_blank" rel="noopener noreferrer">
          politykę cookies
        </a>.
      </p>
      <div className="cookies-actions">
        <button className="cookies-accept" onClick={handleAccept}>
          Akceptuję
        </button>
        <button className="cookies-reject" onClick={handleReject}>
          Odrzucam
        </button>
      </div>
    </div>
  );
};

export default CookiesBanner;

