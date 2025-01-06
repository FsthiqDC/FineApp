import React, { createContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (user) {
        try {
          const token = user.access_token || localStorage.getItem('supabaseToken');
          const response = await axios.get('http://127.0.0.1:8000/api/auth/user/', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });

          setUser(response.data);
        } catch (err) {
          console.error('Błąd autoryzacji:', err);
          setUser(null);
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
