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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

/* Funkcje pomocnicze do uzyskania domyślnego roku/miesiąca */
const getCurrentYear = () => new Date().getFullYear();
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`; // np. "2025-01"
};

const HomePage = () => {
  /* ================== Stany danych do wykresów ================== */
  const [yearlyExpenses, setYearlyExpenses] = useState([]);        // Wydatki roczne
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);      // Wydatki w danym miesiącu
  const [expenseCategories, setExpenseCategories] = useState({});   // Wydatki w kategoriach
  const [incomesVsExpenses, setIncomesVsExpenses] = useState({ incomes: [], expenses: [] });

  /* Dwa nowe wykresy */
  const [weeklyAverages, setWeeklyAverages] = useState([]);         // Średnie wydatki w tygodniu
  const [sumVsCount, setSumVsCount] = useState({ sum: 0, count: 0 }); // Suma wydatków vs ilość transakcji

  /* ================== Stany filtrów ================== */
  // 1. Wydatki roczne: wybór roku
  const [yearForYearly, setYearForYearly] = useState(getCurrentYear());
  const [showYearlyFilters, setShowYearlyFilters] = useState(false); // Ukrywanie filtra

  // 2. Wydatki w danym miesiącu: wybór miesiąca (YYYY-MM)
  const [monthForMonthly, setMonthForMonthly] = useState(getCurrentMonth());
  const [showMonthlyFilters, setShowMonthlyFilters] = useState(false); // Ukrywanie filtra

  // 3. Kategorie: wybór tylko roku
  const [yearForCategories, setYearForCategories] = useState(getCurrentYear());
  const [showCategoriesFilters, setShowCategoriesFilters] = useState(false); // Ukrywanie filtra

  // 4. Przychody vs Wydatki: wybór roku
  const [yearForIncomesVsExpenses, setYearForIncomesVsExpenses] = useState(getCurrentYear());
  const [showIncomesVsExpensesFilters, setShowIncomesVsExpensesFilters] = useState(false);

  /* Dwa nowe wykresy – stany filtrów (jeśli będą potrzebne) */
  const [yearForWeekly, setYearForWeekly] = useState(getCurrentYear());
  const [showWeeklyFilters, setShowWeeklyFilters] = useState(false);

  const [yearForSumVsCount, setYearForSumVsCount] = useState(getCurrentYear());
  const [showSumVsCountFilters, setShowSumVsCountFilters] = useState(false);

  /* Komunikaty błędów */
  const [error, setError] = useState('');

  /* ================== Funkcje pobierające dane ================== */
  // 1. Wydatki roczne
  const fetchYearlyExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
        window.location.href = '/login';
        return;
      }
      const params = { year: yearForYearly };
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setYearlyExpenses(response.data.yearly_expenses || []);
    } catch (err) {
      setError('❌ Nie udało się pobrać danych rocznych.');
    }
  };

  // 2. Wydatki w danym miesiącu
  const fetchMonthlyExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
        window.location.href = '/login';
        return;
      }
      const params = { month: monthForMonthly };
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setMonthlyExpenses(response.data.monthly_expenses || []);
    } catch (err) {
      setError('❌ Nie udało się pobrać danych miesięcznych.');
    }
  };

  // 3. Kategorie (tylko rok)
  const fetchCategoriesData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
        window.location.href = '/login';
        return;
      }
      const params = { year: yearForCategories };
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setExpenseCategories(response.data.expense_categories || {});
    } catch (err) {
      setError('❌ Nie udało się pobrać danych kategorii wydatków.');
    }
  };

  // 4. Przychody vs Wydatki
  const fetchIncomesVsExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego. Zaloguj się ponownie.');
        window.location.href = '/login';
        return;
      }
      const params = { year: yearForIncomesVsExpenses };
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setIncomesVsExpenses(response.data.incomes_vs_expenses || { incomes: [], expenses: [] });
    } catch (err) {
      setError('❌ Nie udało się pobrać danych przychody vs wydatki.');
    }
  };

  // 5. Nowy wykres: Średnie wydatki tygodniowe (zakładamy param "year")
  const fetchWeeklyAverages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego.');
        window.location.href = '/login';
        return;
      }
      const params = { year: yearForWeekly, chart: 'weekly_averages' }; 
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      // Oczekujemy array 7-elementowy
      setWeeklyAverages(response.data.weekly_averages || []);
    } catch (err) {
      setError('❌ Nie udało się pobrać średnich wydatków tygodniowych.');
    }
  };

  // 6. Nowy wykres: Suma wydatków vs liczba transakcji
  const fetchSumVsCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('❌ Brak tokena autoryzacyjnego.');
        window.location.href = '/login';
        return;
      }
      const params = { year: yearForSumVsCount, chart: 'sum_vs_count' };
      const response = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      // Oczekujemy obiektu { sum: number, count: number }
      setSumVsCount(response.data.sum_vs_count || { sum: 0, count: 0 });
    } catch (err) {
      setError('❌ Nie udało się pobrać danych: suma wydatków vs ilość transakcji.');
    }
  };

  // Pierwsze pobranie – wczytanie domyślnych danych
  useEffect(() => {
    fetchYearlyExpenses();
    fetchMonthlyExpenses();
    fetchCategoriesData();
    fetchIncomesVsExpenses();
    fetchWeeklyAverages();
    fetchSumVsCount();
  }, []);

  /* ================== Definicje danych do istniejących wykresów ================== */
  const monthsLabels = [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
  ];

  // 1. Wydatki roczne
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

  // 2. Wydatki w danym miesiącu
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

  // 3. Kategorie
  const categoryLabels = Object.keys(expenseCategories);
  const categoryValues = Object.values(expenseCategories);
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

  // 4. Przychody vs Wydatki
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

  /* ================== 2 nowe wykresy ================== */

  // 5. Średnie wydatki tygodniowe (Line)
  // Zakładamy array 7-elementowy: [pon, wt, sr, czw, pt, sob, niedz]
  const weeklyLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  const weeklyAveragesData = {
    labels: weeklyLabels,
    datasets: [
      {
        label: 'Średnie wydatki (PLN) - tygodniowo',
        data: weeklyAverages,
        borderColor: '#8B008B',
        backgroundColor: 'rgba(139, 0, 139, 0.2)',
      }
    ],
  };

  // 6. Suma wydatków vs liczba transakcji (Bar)
  // Mamy obiekt { sum: number, count: number }
  // Zaprezentujemy to jako 2 słupki: Suma, Liczba transakcji
  const sumVsCountLabels = [''];
  const sumVsCountData = {
    labels: sumVsCountLabels,
    datasets: [
      {
        label: 'Suma wydatków (PLN)',
        data: [sumVsCount.sum],
        backgroundColor: 'rgba(255, 165, 0, 0.6)'
      },
      {
        label: 'Liczba transakcji',
        data: [sumVsCount.count],
        backgroundColor: 'rgba(54,162,235, 0.6)'
      }
    ]
  };

  return (
    <div className="homepage-container">
      <Navbar />
      <div className="content">
        {/* Wyśrodkowany tytuł */}
        {error && <p className="error-message">{error}</p>}

        <div className="charts-container">

          {/* === 1. Wydatki roczne (Line Chart) === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Wydatki miesięczne w ciągu roku</h3>
              <button className="button" onClick={() => setShowYearlyFilters(!showYearlyFilters)}>
                Filtry
              </button>
            </div>
            {showYearlyFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForYearly}
                  onChange={(e) => setYearForYearly(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchYearlyExpenses}>
                  Filtruj
                </button>
              </div>
            )}
            <Line data={yearlyExpensesData} />
          </div>

          {/* === 2. Wydatki w danym miesiącu (Line Chart) === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Wydatki w bieżącym miesiącu</h3>
              <button className="button" onClick={() => setShowMonthlyFilters(!showMonthlyFilters)}>
                Filtry
              </button>
            </div>
            {showMonthlyFilters && (
              <div className="filter-container">
                <input
                  type="month"
                  value={monthForMonthly}
                  onChange={(e) => setMonthForMonthly(e.target.value)}
                />
                <button className="button" onClick={fetchMonthlyExpenses}>
                  Filtruj
                </button>
              </div>
            )}
            <Line data={monthlyExpensesData} />
          </div>

          {/* === 3. Kategorie wydatków (Bar Chart) – TYLKO ROK === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Kategorie wydatków</h3>
              <button className="button" onClick={() => setShowCategoriesFilters(!showCategoriesFilters)}>
                Filtry
              </button>
            </div>
            {showCategoriesFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForCategories}
                  onChange={(e) => setYearForCategories(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchCategoriesData}>
                  Filtruj
                </button>
              </div>
            )}
            <Bar data={categoriesLineData} />
          </div>

          {/* === 4. Przychody vs Wydatki (Bar Chart) === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Przychody vs Wydatki</h3>
              <button className="button" onClick={() => setShowIncomesVsExpensesFilters(!showIncomesVsExpensesFilters)}>
                Filtry
              </button>
            </div>
            {showIncomesVsExpensesFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForIncomesVsExpenses}
                  onChange={(e) => setYearForIncomesVsExpenses(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchIncomesVsExpenses}>
                  Filtruj
                </button>
              </div>
            )}
            <Bar data={incomesVsExpensesData} />
          </div>

          {/* === 5. Nowy wykres: Średnie wydatki tygodniowe (Line) === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Średnie wydatki tygodniowe</h3>
              <button className="button" onClick={() => setShowWeeklyFilters(!showWeeklyFilters)}>
                Filtry
              </button>
            </div>
            {showWeeklyFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForWeekly}
                  onChange={(e) => setYearForWeekly(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchWeeklyAverages}>
                  Filtruj
                </button>
              </div>
            )}
            <Line data={weeklyAveragesData} />
          </div>

          {/* === 6. Nowy wykres: Suma wydatków vs liczba transakcji (Bar) === */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ textAlign: 'center', flex: 1 }}>Suma wydatków vs ilość transakcji</h3>
              <button className="button" onClick={() => setShowSumVsCountFilters(!showSumVsCountFilters)}>
                Filtry
              </button>
            </div>
            {showSumVsCountFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForSumVsCount}
                  onChange={(e) => setYearForSumVsCount(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchSumVsCount}>
                  Filtruj
                </button>
              </div>
            )}
            <Bar data={sumVsCountData} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
