import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './CategoriesPage.css';
import axios from 'axios';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get('http://127.0.0.1:8000/api/categories/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCategories(response.data.categories || []);
      } catch (err) {
        console.error('❌ Błąd pobierania kategorii:', err.response?.data || err.message);
        setError('Nie udało się pobrać kategorii.');
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="categories-container">
      <Navbar />
      {error && <p className="error-message">{error}</p>}
      <ul className="categories-list">
        {categories.map((category) => (
          <li key={category.category_id} className="category-item">
            <h3>{category.category_name}</h3>
            <p>{category.category_description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoriesPage;
