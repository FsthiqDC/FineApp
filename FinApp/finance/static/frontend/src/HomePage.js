import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import './HomePage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

const HomePage = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setError('❌ Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
          window.location.href = '/login';
          return;
        }

        console.log('🔑 Token:', token); // Wydrukuj token do konsoli

        const response = await axios.get('http://127.0.0.1:8000/api/home/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        console.log('✅ Dane pobrane:', response.data);
        setMonthlyExpenses(response.data.monthly_expenses || []);
        setExpenseCategories(response.data.expense_categories || {});
      } catch (error) {
        console.error('❌ Błąd podczas pobierania danych:', error.response || error.message);
        setError('❌ Nie udało się pobrać danych. Sprawdź autoryzację.');
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="homepage-container">
      <Navbar />
      <div className="content">
        <h2>📊 Podsumowanie Wydatków</h2>
        {error && <p className="error-message">{error}</p>}
        <div className="charts-container">
          <div className="chart">
            <h3>Wydatki miesięczne</h3>
            <Line data={{ labels: [], datasets: [] }} />
          </div>
          <div className="chart">
            <h3>Kategorie wydatków</h3>
            <Pie data={{ labels: [], datasets: [] }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
