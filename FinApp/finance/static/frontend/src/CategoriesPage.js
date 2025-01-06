import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './CategoriesPage.css';
import { supabase } from './supabaseClient';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('Categories').select('*');
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('❌ Błąd pobierania kategorii:', err.message);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="categories-container">
      <Navbar />
      <h2>📚 Kategorie</h2>
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
