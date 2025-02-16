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

/* ====================== Funkcje pomocnicze ====================== */

// 1. Rok i miesiąc
const getCurrentYear = () => new Date().getFullYear();
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`; // np. "2025-01"
};

// 2. Tydzień ISO. Zwraca np. "2025-W03"
function getCurrentWeekISO() {
  const now = new Date();
  // Kopia daty, by nie modyfikować oryginalnej
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  // Rachunek: Dzień tygodnia wg ISO: Pon=1..Niedz=7. W JS: Niedz=0..Sob=6
  const dayNum = date.getUTCDay() || 7; 
  // Jeżeli to niedziela => dayNum=7, jeżeli pon =>1, itp.

  // Ustawić datę na czwartek w tym samym tygodniu – ISO definicja
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  // Odczyt roku z czwartku (ISOweek)
  const year = date.getUTCFullYear();

  // Numer tygodnia
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const diff = (date.getTime() - startOfYear.getTime()) / 86400000;
  // n = liczba dni od 1 stycznia do czwartku
  const weekNum = Math.ceil((diff + 1) / 7);

  // Format "YYYY-WNN" => np. 2025-W03
  const weekStr = String(weekNum).padStart(2, '0');
  return `${year}-W${weekStr}`;
}

/* ====================== Komponent główny ====================== */

const HomePage = () => {
  // ================== STANY DANYCH DO WYKRESÓW ==================
  const [yearlyExpenses, setYearlyExpenses] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState({});
  const [incomesVsExpenses, setIncomesVsExpenses] = useState({ incomes: [], expenses: [] });

  // Średnie wydatki tygodniowe
  const [weeklyAverages, setWeeklyAverages] = useState([]);
  // Cele zrealizowane vs trwające
  const [goalsStatus, setGoalsStatus] = useState({ completed: 0, active: 0 });

  // ================== STANY FILTRÓW ==================
  // 1. Wydatki roczne
  const [yearForYearly, setYearForYearly] = useState(getCurrentYear());
  const [showYearlyFilters, setShowYearlyFilters] = useState(false);

  // 2. Wydatki w miesiącu
  const [monthForMonthly, setMonthForMonthly] = useState(getCurrentMonth());
  const [showMonthlyFilters, setShowMonthlyFilters] = useState(false);

  // 3. Kategorie
  const [yearForCategories, setYearForCategories] = useState(getCurrentYear());
  const [showCategoriesFilters, setShowCategoriesFilters] = useState(false);

  // 4. Incomes vs Expenses
  const [yearForIncomesVsExpenses, setYearForIncomesVsExpenses] = useState(getCurrentYear());
  const [showIncomesVsExpensesFilters, setShowIncomesVsExpensesFilters] = useState(false);

  // 5. Średnie wydatki tygodniowe => DOMYŚLNIE aktualny tydzień
  const [weekForWeekly, setWeekForWeekly] = useState(getCurrentWeekISO());
  const [showWeeklyFilters, setShowWeeklyFilters] = useState(false);

  // 6. Cele zrealizowane vs trwające (dawne sumVsCount)
  const [yearForGoalsStatus, setYearForGoalsStatus] = useState(getCurrentYear());
  const [showGoalsStatusFilters, setShowGoalsStatusFilters] = useState(false);

  // Komunikat błędu
  const [error, setError] = useState('');

  /* ================== FUNKCJE POBIERAJĄCE ================== */
  // 1. Wydatki roczne
  const fetchYearlyExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = { year: yearForYearly };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setYearlyExpenses(resp.data.yearly_expenses || []);
    } catch {
      setError('Nie udało się pobrać danych rocznych');
    }
  };

  // 2. Wydatki miesięczne
  const fetchMonthlyExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = { month: monthForMonthly };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setMonthlyExpenses(resp.data.monthly_expenses || []);
    } catch {
      setError('Nie udało się pobrać danych miesięcznych');
    }
  };

  // 3. Kategorie
  const fetchCategoriesData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = { year: yearForCategories };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setExpenseCategories(resp.data.expense_categories || {});
    } catch {
      setError('Błąd pobierania kategorii');
    }
  };

  // 4. Incomes vs Expenses
  const fetchIncomesVsExpenses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = { year: yearForIncomesVsExpenses };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setIncomesVsExpenses(resp.data.incomes_vs_expenses || { incomes: [], expenses: [] });
    } catch {
      setError('Błąd pobierania incomes vs expenses');
    }
  };

  // 5. Średnie wydatki tygodniowe
  const fetchWeeklyAverages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Podajemy chart=weekly_averages i param week=YYYY-WNN
      const params = { chart: 'weekly_averages', week: weekForWeekly };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setWeeklyAverages(resp.data.weekly_averages || []);
    } catch {
      setError('Błąd pobierania średnich wydatków tygodniowych');
    }
  };

  // 6. Cele zrealizowane vs trwające
  const fetchGoalsStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = { chart: 'goals_status', year: yearForGoalsStatus };
      const resp = await axios.get('http://127.0.0.1:8000/api/home/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setGoalsStatus(resp.data.goals_status || { completed: 0, active: 0 });
    } catch {
      setError('Błąd pobierania stanu celów (zrealizowane vs trwające).');
    }
  };

  // Pobranie domyślne
  useEffect(() => {
    fetchYearlyExpenses();
    fetchMonthlyExpenses();
    fetchCategoriesData();
    fetchIncomesVsExpenses();
    fetchWeeklyAverages();
    fetchGoalsStatus();
  }, []);

  /* ================== DANE DO WYKRESÓW ================== */
  const monthsLabels = [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
  ];

  // 1. Wydatki roczne
  const yearlyTitle = `Wydatki na przestrzeni roku ${yearForYearly}`;
  const yearlyExpensesData = {
    labels: monthsLabels,
    datasets: [
      {
        label: yearlyTitle,
        data: yearlyExpenses,
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }
    ],
  };

  // 2. Wydatki miesięczne
  const monthlyTitle = `Wydatki za miesiąc ${monthForMonthly}`;
  const daysInMonth = monthlyExpenses.map((_, idx) => idx + 1);
  const monthlyExpensesData = {
    labels: daysInMonth,
    datasets: [
      {
        label: monthlyTitle,
        data: monthlyExpenses,
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54,162,235,0.2)',
      }
    ],
  };

  // 3. Kategorie
  const categoriesTitle = `Wydatki na poszczególne kategorie w roku ${yearForCategories}`;
  const categoryLabels = Object.keys(expenseCategories);
  const categoryValues = Object.values(expenseCategories);
  const categoriesLineData = {
    labels: categoryLabels,
    datasets: [
      {
        label: categoriesTitle,
        data: categoryValues,
        borderColor: '#FFA500',
        backgroundColor: 'rgba(255,165,0, 0.2)',
      }
    ],
  };

  // 4. Incomes vs Expenses
  const incomesTitle = `Przychody vs Wydatki w roku ${yearForIncomesVsExpenses}`;
  const incomesVsExpensesData = {
    labels: monthsLabels,
    datasets: [
      {
        label: 'Przychody',
        data: incomesVsExpenses.incomes,
        backgroundColor: 'rgba(75,192,192, 0.6)',
      },
      {
        label: 'Wydatki',
        data: incomesVsExpenses.expenses,
        backgroundColor: 'rgba(255,99,132,0.6)',
      },
    ],
  };

  // 5. Średnie wydatki tygodniowe
  const weeklyTitle = `Średnie wydatki tygodniowe ${weekForWeekly}`;
  const weeklyLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
  const weeklyAveragesData = {
    labels: weeklyLabels,
    datasets: [
      {
        label: weeklyTitle,
        data: weeklyAverages,
        borderColor: '#8B008B',
        backgroundColor: 'rgba(139, 0, 139, 0.2)',
      }
    ],
  };

  // 6. Cele zrealizowane vs trwające
  const goalsStatusTitle = `Cele zrealizowane vs trwające`;
  // Wypiszemy dwa słupki
  const goalsStatusData = {
    labels: [''],
    datasets: [
      {
        label: 'Zrealizowane',
        data: [goalsStatus.completed],
        backgroundColor: 'rgba(54,162,235, 0.6)',
      },
      {
        label: 'Trwające',
        data: [goalsStatus.active],
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
      },
    ],
  };

  return (
    <div className="homepage-container">
      <Navbar />
      <div className="content">


        <div className="charts-container">

          {/* 1) Wydatki roczne */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{yearlyTitle}</h3>
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

          {/* 2) Wydatki miesięczne */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{monthlyTitle}</h3>
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

          {/* 3) Kategorie */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{categoriesTitle}</h3>
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

          {/* 4) Przychody vs Wydatki */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{incomesTitle}</h3>
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

          {/* 5) Średnie wydatki tygodniowe */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{weeklyAveragesData.datasets[0].label}</h3>
              <button className="button" onClick={() => setShowWeeklyFilters(!showWeeklyFilters)}>
                Filtry
              </button>
            </div>
            {showWeeklyFilters && (
              <div className="filter-container">
                {/* Input type="week" nie zawsze wspierany, więc placeholder dla "YYYY-WNN" */}
                <input
                  type="text"
                  placeholder="YYYY-WNN"
                  value={weekForWeekly}
                  onChange={(e) => setWeekForWeekly(e.target.value)}
                />
                <button className="button" onClick={fetchWeeklyAverages}>
                  Filtruj
                </button>
              </div>
            )}
            <Line data={weeklyAveragesData} />
          </div>

          {/* 6) Cele zrealizowane vs trwające */}
          <div className="chart">
            <div className="chart-header">
              <h3 style={{ flex: 1 }}>{goalsStatusTitle}</h3>
              <button className="button" onClick={() => setShowGoalsStatusFilters(!showGoalsStatusFilters)}>
                Filtry
              </button>
            </div>
            {showGoalsStatusFilters && (
              <div className="filter-container">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearForGoalsStatus}
                  onChange={(e) => setYearForGoalsStatus(e.target.value)}
                  style={{ width: '80px' }}
                />
                <button className="button" onClick={fetchGoalsStatus}>
                  Filtruj
                </button>
              </div>
            )}
            <Bar data={goalsStatusData} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
