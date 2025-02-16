import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import './BudgetsPage.css';

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  // Inline edycja
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingLimit, setEditingLimit] = useState({});
  const [editingNotify, setEditingNotify] = useState({});

  // 1) Pobieranie budżetów
  const fetchBudgets = async (chosenMonth) => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena');

      // GET /api/category-budgets/?month=YYYY-MM
      const resp = await axios.get('http://127.0.0.1:8000/api/category-budgets/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: chosenMonth },
      });
      // resp.data = { budgets: [...] }, z polami categorybudget_id, category_name, spent, etc.
      setBudgets(resp.data.budgets || []);
    } catch (err) {
      setError('Nie udało się pobrać budżetów (GET /api/category-budgets).');
    }
  };

  useEffect(() => {
    fetchBudgets(monthFilter);
  }, [monthFilter]);

  // Obsługa filtra
  const handleMonthFilterChange = (e) => {
    setMonthFilter(e.target.value);
  };
  const handleFilterSubmit = () => {
    fetchBudgets(monthFilter);
  };

  // Rozpoczęcie edycji
  const startEditing = (b) => {
    setEditingBudgetId(b.categorybudget_id);
    // Wstępne wartości
    setEditingLimit({ ...editingLimit, [b.categorybudget_id]: b.categorybudget_limit_amount });
    setEditingNotify({ ...editingNotify, [b.categorybudget_id]: b.notify_exceed });
  };

  // Anulowanie edycji
  const cancelEditing = () => {
    setEditingBudgetId(null);
    setEditingLimit({});
    setEditingNotify({});
  };

  // Zapis (PATCH)
  const saveEditedRow = async (b) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena');

      const newLimit = editingLimit[b.categorybudget_id] || 0;
      const newNotify = editingNotify[b.categorybudget_id] || false;

      const payload = {
        categorybudget_limit_amount: Number(newLimit),
        categorybudget_currency: b.categorybudget_currency || 'PLN',
        notify_exceed: newNotify,
      };

      // PATCH /api/category-budgets/<id>/
      const url = `http://127.0.0.1:8000/api/category-budgets/${b.categorybudget_id}/`;
      const resp = await axios.patch(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.status >= 200 && resp.status < 300) {
        setSuccess('Zaktualizowano budżet.');
        fetchBudgets(monthFilter);
      } else {
        setError(`Nie udało się zaktualizować budżetu (kod=${resp.status}).`);
      }
    } catch (err) {
      console.error(err);
      setError('Błąd przy edycji budżetu.');
    } finally {
      setEditingBudgetId(null);
      setEditingLimit({});
      setEditingNotify({});
    }
  };

  // Zmiana limitu w input
  const handleLimitChange = (id, val) => {
    setEditingLimit((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  // Zmiana checkbox
  const handleNotifyChange = (id, checked) => {
    setEditingNotify((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  // Kolorowanie porównania
  const getDiffColor = (diff, spentPrev) => {
    if (!spentPrev || spentPrev <= 0) {
      if (diff < 0) return 'green';
      if (diff > 0) return 'red';
      return 'black';
    }
    if (diff < 0) return 'green';
    if (diff > 0) {
      const ratio = (diff / spentPrev) * 100;
      if (ratio <= 20) return 'yellow';
      return 'red';
    }
    return 'black';
  };

  return (
    <div className="budgets-container">
      <Navbar />
      <div className="budgets-content">
        {success && <p className="success-message">{success}</p>}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'right' }}>
          <input
            type="month"
            id="monthFilter"
            value={monthFilter}
            onChange={handleMonthFilterChange}
          />
          <button className="budget-filter-button" onClick={handleFilterSubmit}>Filtruj</button>
        </div>

        <table className="budgets-table">
          <thead>
            <tr>
              <th>Kategoria</th>
              <th>Limit (PLN)</th>
              <th>Wykorzystany budżet</th>
              <th>% wykorzystania budżetu</th>
              <th>Powiadomienie o przekroczeniu</th>
              <th>Porównanie z ub. miesiącem</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              // b: { categorybudget_id, categorybudget_category_id, category_name, categorybudget_limit_amount, spent, percentUsed, diffLastMonth, notify_exceed, ... }

              // Gdy limit=0 => 'Należy określić budżet'
              const limit = b.categorybudget_limit_amount || 0;
              const limitDisplay = limit > 0 ? limit : 'Należy określić budżet';

              // Obliczamy spent, percentUsed, diff
              const spent = b.spent || 0;
              const percentUsed = b.percentUsed || 0;
              const diff = b.diffLastMonth || 0;
              const spentPrev = (spent - diff >= 0) ? spent - diff : null;
              const diffColor = getDiffColor(diff, spentPrev);

              let diffText = 'Bez zmian';
              if (diff < 0) {
                diffText = `O ${Math.abs(diff)} PLN mniej`;
              } else if (diff > 0) {
                diffText = `O ${diff} PLN więcej`;
              }

              const isEditing = (editingBudgetId === b.categorybudget_id);
              const editingVal = editingLimit[b.categorybudget_id] ?? b.categorybudget_limit_amount;
              const editingCheck = editingNotify[b.categorybudget_id] ?? b.notify_exceed;

              return (
                <tr key={b.categorybudget_id}>
                  <td>{b.category_name}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingVal}
                        onChange={(e) => handleLimitChange(b.categorybudget_id, e.target.value)}
                      />
                    ) : (
                      limitDisplay
                    )}
                  </td>
                  <td>{spent}</td>
                  <td>{percentUsed.toFixed(1)}%</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={!!editingCheck}
                        onChange={(e) => handleNotifyChange(b.categorybudget_id, e.target.checked)}
                      />
                    ) : (
                      b.notify_exceed ? 'Włączone' : 'Wyłączone'
                    )}
                  </td>
                  <td style={{ color: diffColor }}>{diffText}</td>
                  <td>
                    {isEditing ? (
                      <>
                        <button className="save-button" onClick={() => saveEditedRow(b)}>Zapisz</button>
                        <button className="cancel-button" onClick={cancelEditing}>Anuluj</button>
                      </>
                    ) : (
                      <button className="button" onClick={() => startEditing(b)}>Edytuj</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetsPage;
