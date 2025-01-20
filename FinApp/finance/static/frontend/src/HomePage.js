import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './HomePage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const HomePage = () => {
  /* Stany przechowujące dane do wykresów */
  const [yearlyExpenses, setYearlyExpenses] = useState([]);       // Wydatki roczne
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);     // Wydatki w danym miesiącu
  const [expenseCategories, setExpenseCategories] = useState({});  // Wydatki w kategoriach
  const [incomesVsExpenses, setIncomesVsExpenses] = useState({
    incomes: [],
    expenses: []
  });

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

        console.log('🔑 Token:', token);

        /* 
          Zakładamy, że endpoint /api/home/ zwraca np.:
          {
            "yearly_expenses": [200, 300, 150, 400, 260, 310, 180, 220, 340, 210, 270, 390],
            "monthly_expenses": [ ... ],
            "expense_categories": { "Jedzenie": 300, "Transport": 150, ... },
            "incomes_vs_expenses": { 
              "incomes": [...],
              "expenses": [...] 
            }
          }
        */
        const response = await axios.get('http://127.0.0.1:8000/api/home/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        console.log('✅ Dane pobrane:', response.data);

        setYearlyExpenses(response.data.yearly_expenses || []);
        setMonthlyExpenses(response.data.monthly_expenses || []);
        setExpenseCategories(response.data.expense_categories || {});
        setIncomesVsExpenses(response.data.incomes_vs_expenses || { incomes: [], expenses: [] });

      } catch (error) {
        console.error('❌ Błąd podczas pobierania danych:', error.response || error.message);
        setError('❌ Nie udało się pobrać danych. Sprawdź autoryzację.');
      }
    };

    fetchSummary();
  }, []);

  /* 
    1. Wydatki miesięczne w ciągu roku - line chart
      Zakładamy, że yearlyExpenses ma 12 elementów, po jednym na każdy miesiąc.
  */
  const monthsLabels = [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
  ];

  const yearlyExpensesData = {
    labels: monthsLabels,
    datasets: [
      {
        label: 'Wydatki roczne (PLN)',
        data: yearlyExpenses,
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }
    ],
  };

  /* 
    2. Wydatki w danym miesiącu - line chart
      monthlyExpenses np. 30 lub 31 elementów (każdy dzień) 
  */
  const daysInMonth = monthlyExpenses.map((_, idx) => idx + 1);
  const monthlyExpensesData = {
    labels: daysInMonth,
    datasets: [
      {
        label: 'Wydatki w tym miesiącu (PLN)',
        data: monthlyExpenses,
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54,162,235,0.2)',
      }
    ],
  };

  /* 
    3. Wydatki w danych kategoriach - line chart (zamiast Pie)
      expenseCategories: np. { "Jedzenie": 300, "Transport": 150, ... }
      Zamieniamy klucze w tablicę etykiet, wartości w tablicę data.
  */
  const categoryLabels = Object.keys(expenseCategories);      // ["Jedzenie", "Transport", ...]
  const categoryValues = Object.values(expenseCategories);    // [300, 150, ...]

  const categoriesLineData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Wydatki wg kategorii (PLN)',
        data: categoryValues,
        borderColor: '#FFA500',
        backgroundColor: 'rgba(255,165,0, 0.2)', 
      }
    ],
  };

  /*
    4. Porównanie przychodów do wydatków - bar chart
      incomesVsExpenses: { incomes: [...], expenses: [...] }
      X-axis: monthsLabels
  */
  const incomesVsExpensesData = {
    labels: monthsLabels,
    datasets: [
      {
        label: 'Przychody',
        data: incomesVsExpenses.incomes,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Wydatki',
        data: incomesVsExpenses.expenses,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  return (
    <div className="homepage-container">
      <Navbar />
      <div className="content">
        <h2>📊 Podsumowanie</h2>
        {error && <p className="error-message">{error}</p>}

        <div className="charts-container">

          {/* 1. Wydatki roczne (Line Chart) */}
          <div className="chart">
            <h3>Wydatki miesięczne w ciągu roku</h3>
            <Line data={yearlyExpensesData} />
          </div>

          {/* 2. Wydatki w danym miesiącu (Line Chart) */}
          <div className="chart">
            <h3>Wydatki w bieżącym miesiącu</h3>
            <Line data={monthlyExpensesData} />
          </div>

          {/* 3. Wydatki wg kategorii (Line Chart) */}
          <div className="chart">
            <h3>Kategorie wydatków</h3>
            <Bar data={categoriesLineData} />
          </div>

          {/* 4. Przychody vs Wydatki (Bar Chart) */}
          <div className="chart">
            <h3>Przychody vs Wydatki</h3>
            <Bar data={incomesVsExpensesData} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
