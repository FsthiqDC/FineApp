// src/pages/admin/AdminDashboard.js

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../supabaseClient.js';
import './AdminDashboard.css';

// Rejestrowanie elementów Chart.js
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

/** 
 * Funkcja generująca listę dat (YYYY-MM-DD) między startDate a endDate włącznie.
 * startDate, endDate w formacie 'YYYY-MM-DD'.
 */
function generateDateRange(startDate, endDate) {
  const result = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    result.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * Grupuje rekordy wg dni (YYYY-MM-DD) i zwraca tablicę zliczeń w kolejności daysList
 * rows: tablica obiektów
 * dateFieldName: np. "created_at" lub "reminder_created_at"
 * daysList: np. ["2025-02-01","2025-02-02",...]
 */
function groupByDay(rows, dateFieldName, daysList) {
  const counts = Array(daysList.length).fill(0);
  rows.forEach(row => {
    const dtStr = row[dateFieldName];
    if (!dtStr) return; // brak daty
    const dt = new Date(dtStr);
    const iso = dt.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const idx = daysList.indexOf(iso);
    if (idx !== -1) {
      counts[idx]++;
    }
  });
  return counts;
}

const AdminDashboard = () => {
  const [error, setError] = useState('');

  // ================== STATYSTYKI TABEL (kafelki) ==================
  const [usersCount, setUsersCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [categoryBudgetsCount, setCategoryBudgetsCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [savingsGoalsCount, setSavingsGoalsCount] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);

  // ================== 4 WYKRESY ==================
  // 1) Przyrost użytkowników (Line)
  const [userGrowthData, setUserGrowthData] = useState({ labels: [], datasets: [] });

  // 2) Aktywni vs. zablokowani (Bar)
  const [activeBlockedData, setActiveBlockedData] = useState({ labels: [], datasets: [] });

  // 3) Najpopularniejsze kategorie w transakcjach (Bar)
  const [topCategoriesData, setTopCategoriesData] = useState({ labels: [], datasets: [] });

  // 4) Przyrost przypomnień (Line)
  const [remindersGrowthData, setRemindersGrowthData] = useState({ labels: [], datasets: [] });

  // =================================================================
  // 1. Pobieranie statystyk (kafelków)
  // =================================================================
  const fetchCounts = async () => {
    try {
      // App_Users
      const { data: usersData, error: usersErr } = await supabase
        .from('App_Users')
        .select('*', { count: 'exact' });
      if (usersErr) throw usersErr;
      setUsersCount(usersData.length);

      // Categories
      const { data: catData, error: catErr } = await supabase
        .from('Categories')
        .select('*', { count: 'exact' });
      if (catErr) throw catErr;
      setCategoriesCount(catData.length);

      // CategoryBudgets
      const { data: cbData, error: cbErr } = await supabase
        .from('CategoryBudgets')
        .select('*', { count: 'exact' });
      if (cbErr) throw cbErr;
      setCategoryBudgetsCount(cbData.length);

      // Reminders
      const { data: remData, error: remErr } = await supabase
        .from('Reminders')
        .select('*', { count: 'exact' });
      if (remErr) throw remErr;
      setRemindersCount(remData.length);

      // SavingsGoals
      const { data: sgData, error: sgErr } = await supabase
        .from('SavingsGoals')
        .select('*', { count: 'exact' });
      if (sgErr) throw sgErr;
      setSavingsGoalsCount(sgData.length);

      // Transactions
      const { data: txData, error: txErr } = await supabase
        .from('Transactions')
        .select('*', { count: 'exact' });
      if (txErr) throw txErr;
      setTransactionsCount(txData.length);

    } catch (err) {
      console.error(err);
      setError('Błąd pobierania liczby rekordów: ' + err.message);
    }
  };

  // =================================================================
  // 2. Przyrost użytkowników (Line) + Aktywni vs Zablokowani (Bar)
  // =================================================================
  const fetchUsersCharts = async () => {
    try {
      const { data: usersData, error: usersErr } = await supabase
        .from('App_Users')
        .select('created_at, is_active'); 
      if (usersErr) throw usersErr;

      // A) Przyrost użytkowników w ostatnich 14 dniach
      // Sprawdzamy, czy w ogóle mamy userów i czy w polu created_at są jakieś daty
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 13); // 14 dni (0..13)

      const dateList = generateDateRange(
        startDate.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      ); // ["2025-02-01",..., "2025-02-14"]
      
      const creationCounts = groupByDay(usersData, 'created_at', dateList);

      setUserGrowthData({
        labels: dateList,
        datasets: [
          {
            label: 'Przyrost użytkowników (dziennie)',
            data: creationCounts,
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54,162,235,0.2)',
          }
        ]
      });

      // B) Aktywni vs zablokowani (Bar)
      let active = 0;
      let blocked = 0;
      usersData.forEach(u => {
        if (u.is_active) active++;
        else blocked++;
      });
      setActiveBlockedData({
        labels: ['Aktywni', 'Zablokowani'],
        datasets: [
          {
            label: 'Status użytkowników',
            data: [active, blocked],
            backgroundColor: ['rgba(75,192,192, 0.6)', 'rgba(255,99,132,0.6)']
          }
        ]
      });
    } catch (err) {
      console.error(err);
      setError('Błąd przy fetchUsersCharts: ' + err.message);
    }
  };

  // =================================================================
  // 3. Najpopularniejsze kategorie (Bar) - top 5
  // =================================================================
  const fetchTopCategories = async () => {
    try {
      // Pobieramy transakcje
      const { data: txData, error: txErr } = await supabase
        .from('Transactions')
        .select('transaction_category_id');
      if (txErr) throw txErr;

      // Pobieramy kategorie
      const { data: catData, error: catErr } = await supabase
        .from('Categories')
        .select('category_id, category_name');
      if (catErr) throw catErr;

      // Mapa category_id -> nazwa
      const catMap = {};
      catData.forEach(c => {
        catMap[c.category_id] = c.category_name;
      });

      // Zliczamy transakcje wg category_id
      const counts = {};
      txData.forEach(tx => {
        const cid = tx.transaction_category_id;
        if (!counts[cid]) counts[cid] = 0;
        counts[cid]++;
      });

      // Sortujemy i bierzemy top 5
      const sorted = Object.keys(counts)
        .map(cid => ({
          cid,
          name: catMap[cid] || 'Nieznana kategoria',
          count: counts[cid]
        }))
        .sort((a, b) => b.count - a.count);

      const top5 = sorted.slice(0, 5);

      setTopCategoriesData({
        labels: top5.map(item => item.name),
        datasets: [
          {
            label: 'Najpopularniejsze kategorie (transakcje)',
            data: top5.map(item => item.count),
            backgroundColor: 'rgba(255, 206, 86, 0.6)'
          }
        ]
      });
    } catch (err) {
      console.error(err);
      setError('Błąd fetchTopCategories: ' + err.message);
    }
  };

  // =================================================================
  // 4. Przyrost przypomnień (Line)
  // =================================================================
  const fetchRemindersGrowth = async () => {
    try {
      const { data, error } = await supabase
        .from('Reminders')
        .select('reminder_created_at');
      if (error) throw error;

      // Okres 14 dni
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 13);

      const dateList = generateDateRange(
        startDate.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      const counts = groupByDay(data, 'reminder_created_at', dateList);

      setRemindersGrowthData({
        labels: dateList,
        datasets: [
          {
            label: 'Przypomnienia utworzone (dziennie)',
            data: counts,
            borderColor: '#8B008B',
            backgroundColor: 'rgba(139,0,139,0.2)'
          }
        ]
      });
    } catch (err) {
      console.error(err);
      setError('Błąd fetchRemindersGrowth: ' + err.message);
    }
  };

  // =================================================================
  // useEffect – ładowanie danych
  // =================================================================
  useEffect(() => {
    // Statystyki główne (kafelki)
    fetchCounts();
    // Wykresy
    fetchUsersCharts();
    fetchTopCategories();
    fetchRemindersGrowth();
  }, []);

  return (
    <div className="admin-dashboard-container">
      <Navbar />
      <div className="admin-dashboard-content">

        {/* Komunikat ogólny */}
        <h2>Panel Administratora – Statystyki i Wykresy</h2>
        {error && <p className="error-message">{error}</p>}

        {/* Kafelki statystyk */}
        <div className="stats-container">
          <div className="stat-card">
            <h3>Użytkownicy</h3>
            <p>{usersCount}</p>
          </div>
          <div className="stat-card">
            <h3>Kategorie</h3>
            <p>{categoriesCount}</p>
          </div>
          <div className="stat-card">
            <h3>CategoryBudgets</h3>
            <p>{categoryBudgetsCount}</p>
          </div>
          <div className="stat-card">
            <h3>Reminders</h3>
            <p>{remindersCount}</p>
          </div>
          <div className="stat-card">
            <h3>SavingsGoals</h3>
            <p>{savingsGoalsCount}</p>
          </div>
          <div className="stat-card">
            <h3>Transactions</h3>
            <p>{transactionsCount}</p>
          </div>
        </div>

        {/* Sekcja wykresów */}
        <div className="charts-container">
          {/* 1) Przyrost użytkowników (Line) */}
          <div className="chart">
            <h3>Przyrost liczby użytkowników (dziennie)</h3>
            <Line data={userGrowthData} />
          </div>

          {/* 2) Aktywni vs. Zablokowani (Bar) */}
          <div className="chart">
            <h3>Aktywni vs Zablokowani</h3>
            <Bar data={activeBlockedData} />
          </div>

          {/* 3) Najpopularniejsze kategorie (Bar) */}
          <div className="chart">
            <h3>Najpopularniejsze kategorie (transakcje)</h3>
            <Bar data={topCategoriesData} />
          </div>

          {/* 4) Przyrost przypomnień (Line) */}
          <div className="chart">
            <h3>Przyrost przypomnień (dziennie)</h3>
            <Line data={remindersGrowthData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
