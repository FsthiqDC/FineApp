import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import axios from 'axios';
import './TargetsPage.css';

/**
 * Komponent obsługujący listę celów z tabeli SavingsGoals.
 * Struktura w DB:
 *  - SavingsGoals_id (uuid)
 *  - savingsgoals_owner_id (uuid)
 *  - savingsgoals_name (text)
 *  - savingsgoals_target_amount (float8)
 *  - savingsgoals_amount (float8)
 *  - savingsgoals_status (text) [np. "Aktywny"/"Ukończony"]
 *  - savingsgoals_currency (text)
 */

const TargetsPage = () => {
  /* ============== STANY PODSTAWOWE ============== */
  const [activeGoals, setActiveGoals] = useState([]);
  const [completedGoals, setCompletedGoals] = useState([]);

  // Filtry
  const [searchName, setSearchName] = useState('');
  const [completionRange, setCompletionRange] = useState([0, 100]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [showTab, setShowTab] = useState('active');  // 'active' | 'completed'

  // Formularz dodawania nowego celu
  const [newGoalData, setNewGoalData] = useState({
    name: '',
    targetAmount: '',
    currency: 'PLN',
  });

  // Edycja celu
  const [editGoalId, setEditGoalId] = useState(null);
  const [editGoalData, setEditGoalData] = useState({
    name: '',
    targetAmount: '',
    currency: 'PLN',
  });

  // Obsługa komunikatów
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Paginacja
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Suwaki – wartości lokalne w trakcie przesuwania (bez części dziesiętnych)
  const [sliderValues, setSliderValues] = useState({});

  // Modal usuwania
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // Stan do wyświetlania fanfar (gdy cel osiągnięty)
  // Przechowujemy ID celu, który właśnie osiągnął 100%
  const [fanfareGoalId, setFanfareGoalId] = useState(null);

  /* ============== 1. POBIERANIE CELÓW (GET) ============== */
  const fetchGoals = async () => {
    try {
      setError('');
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena.');

      // /api/savings-goals/ (GET)
      const resp = await axios.get('http://127.0.0.1:8000/api/savings-goals/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.status >= 200 && resp.status < 300) {
        const data = resp.data.goals || [];
        // Normalizacja
        const normalized = data.map((g) => ({
          id: g.SavingsGoals_id,
          name: g.savingsgoals_name,
          targetAmount: g.savingsgoals_target_amount || 1,
          currentAmount: g.savingsgoals_amount || 0,
          status: g.savingsgoals_status || 'Aktywny',
          currency: g.savingsgoals_currency || 'PLN',
        }));

        // Rozdzielenie
        const actives = normalized.filter((goal) => goal.status !== 'Ukończony');
        const done = normalized.filter((goal) => goal.status === 'Ukończony');

        setActiveGoals(actives);
        setCompletedGoals(done);

        // Ustawianie suwaków (aktualna wartość = currentAmount)
        const sliders = {};
        normalized.forEach((goal) => {
          sliders[goal.id] = goal.currentAmount;
        });
        setSliderValues(sliders);

      } else {
        setError('Nie udało się pobrać celów (kod != 2xx).');
      }
    } catch (err) {
      console.error(err);
      setError('Błąd pobierania celów.');
    }
  };

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line
  }, []);

  /* ============== 2. DODAWANIE NOWEGO CELU (POST) ============== */
  const handleAddGoal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena.');

      const payload = {
        savingsgoals_name: newGoalData.name,
        savingsgoals_target_amount: newGoalData.targetAmount,
        savingsgoals_currency: newGoalData.currency,
      };

      // /api/savings-goals/ (POST)
      const resp = await axios.post('http://127.0.0.1:8000/api/savings-goals/', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.status >= 200 && resp.status < 300) {
        setSuccessMessage('Cel dodany pomyślnie.');
        setNewGoalData({
          name: '',
          targetAmount: '',
          currency: 'PLN',
        });
        fetchGoals();
      } else {
        setError('Nie udało się dodać celu (kod != 2xx).');
      }
    } catch (err) {
      console.error(err);
      setError('Błąd dodawania celu.');
    }
  };

  /* ============== 3. SUWAK (ZMIANA AMOUNT) ============== */
  /**
   * Funkcja, która wywołuje PATCH do bazy w momencie, gdy
   * użytkownik puści suwak (onMouseUp).
   */
  const handleSliderUpdate = async (goalId, newVal, isComplete) => {
    try {
      setError('');
      setSuccessMessage('');
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena.');

      const patchPayload = {
        savingsgoals_amount: newVal,
        savingsgoals_status: isComplete ? 'Ukończony' : 'Aktywny',
      };

      // PATCH /api/savings-goals/<goalId>/
      const resp = await axios.patch(
        `http://127.0.0.1:8000/api/savings-goals/${goalId}/`,
        patchPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp.status >= 200 && resp.status < 300) {
        // Jeśli isComplete => wywołaj fanfary
        if (isComplete) {
          setFanfareGoalId(goalId); // Otwórz okienko fanfar
        }
        // Pobrane najnowsze dane
        fetchGoals();
      } else {
        setError('Błąd aktualizacji suwaka (kod != 2xx).');
      }
    } catch (err) {
      console.error(err);
      setError('Błąd aktualizacji wartości celu.');
    }
  };

  /**
   * Główny suwak - onChange => ustawia stan sliderValues (bez wysyłania do bazy)
   * onMouseUp => wywołuje PATCH (handleSliderUpdate)
   */
  const handleSliderChange = (goal, newValue) => {
    const intVal = parseInt(newValue, 10); // zawsze integer
    setSliderValues((prev) => ({
      ...prev,
      [goal.id]: intVal,
    }));
  };

  const handleSliderMouseUp = (goal) => {
    const newVal = sliderValues[goal.id];
    const isComplete = newVal >= goal.targetAmount;
    handleSliderUpdate(goal.id, newVal, isComplete);
  };

  /* ============== 4. EDYCJA CELU (PATCH) ============== */
  const handleEditClick = (goal) => {
    setEditGoalId(goal.id);
    setEditGoalData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currency: goal.currency,
    });
  };

  const handleCancelEdit = () => {
    setEditGoalId(null);
    setEditGoalData({
      name: '',
      targetAmount: '',
      currency: 'PLN',
    });
  };

  const handleSaveEditedGoal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena.');

      const payload = {
        savingsgoals_name: editGoalData.name,
        savingsgoals_target_amount: editGoalData.targetAmount,
        savingsgoals_currency: 'PLN',
      };

      // PATCH /api/savings-goals/<editGoalId>/
      const resp = await axios.patch(
        `http://127.0.0.1:8000/api/savings-goals/${editGoalId}/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp.status >= 200 && resp.status < 300) {
        setSuccessMessage('Zmiany zapisane pomyślnie.');
        setEditGoalId(null);
        fetchGoals();
      } else {
        setError('Nie udało się zapisać (kod != 2xx).');
      }
    } catch (err) {
      console.error(err);
      setError('Błąd zapisu edycji.');
    }
  };

  /* ============== 5. USUWANIE CELU (DELETE) ============== */
  const openDeleteModal = (goal) => {
    setGoalToDelete(goal);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    try {
      setError('');
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena.');

      // DELETE /api/savings-goals/<goalToDelete.id>/
      const resp = await axios.delete(
        `http://127.0.0.1:8000/api/savings-goals/${goalToDelete.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp.status >= 200 && resp.status < 300) {
        closeDeleteModal();
        fetchGoals();
      } else {
        setError('Nie udało się usunąć (kod != 2xx).');
      }
    } catch (err) {
      console.error(err);
      setError('Błąd usuwania celu.');
    }
  };

  /* ============== 6. FILTROWANIE + SORTOWANIE + PAGINACJA ============== */
  const rawList = showTab === 'active' ? activeGoals : completedGoals;

  // 1) Filtr nazwy
  const nameFiltered = rawList.filter((g) =>
    g.name.toLowerCase().includes(searchName.toLowerCase())
  );

  // 2) Filtr procentu (na bazie goal.currentAmount / goal.targetAmount)
  const completionFiltered = nameFiltered.filter((goal) => {
    const progress = goal.targetAmount
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0;
    return progress >= completionRange[0] && progress <= completionRange[1];
  });

  // 3) Sort - na podstawie bazy (goal.currentAmount), żeby nie przeskakiwało podczas suwaka
  const sortedList = [...completionFiltered].sort((a, b) => {
    const progA = a.targetAmount ? (a.currentAmount / a.targetAmount) * 100 : 0;
    const progB = b.targetAmount ? (b.currentAmount / b.targetAmount) * 100 : 0;
    if (sortOrder === 'asc') {
      return progA - progB;
    } else {
      return progB - progA;
    }
  });

  // 4) Paginacja
  const totalItems = sortedList.length;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = sortedList.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  // Reset paginacji po zmianach
  useEffect(() => {
    setCurrentPage(1);
  }, [showTab, sortOrder, itemsPerPage]);

  /* ============== 7. STYL SUWAKA (z wypełnieniem) ============== */
  const getSliderStyle = (goal) => {
    const val = sliderValues[goal.id] || 0; // suwak w czasie rzeczywistym
    const max = goal.targetAmount || 1;
    const pct = (val / max) * 100;

    // Białe tło, wypełnienie do pct => #007bff
    return {
      background: `linear-gradient(to right,
        #007bff 0%,
        #007bff ${pct}%,
        #ffffff ${pct}%,
        #ffffff 100%)`,
    };
  };

  /* ============== RENDER KOMPONENTU ============== */
  return (
    <div className="targets-container">
      <Navbar />

      <div className="targets-content">
        {/* LEWA KOLUMNA - Dodawanie nowego celu */}
        <div className="goal-form">
          <h2>Dodaj nowy cel</h2>
          <form onSubmit={handleAddGoal} className="goal-form-inner">
            <input
              type="text"
              placeholder="Nazwa celu"
              required
              value={newGoalData.name}
              onChange={(e) =>
                setNewGoalData({ ...newGoalData, name: e.target.value })
              }
            />
            <input
              type="number"
              min="1"
              step="1" // domyślnie 1, bo targetAmount też w całych
              placeholder="Kwota docelowa"
              required
              value={newGoalData.targetAmount}
              onChange={(e) =>
                setNewGoalData({ ...newGoalData, targetAmount: e.target.value })
              }
            />
            <input
              type="text"
              value="PLN"
              disabled
              style={{ cursor: 'not-allowed' }}
            />
            <button type="submit" className="add-goal-button">
              Dodaj
            </button>
          </form>
        </div>

        {/* ŚRODKOWA KOLUMNA - Filtry */}
        <div className="filters">
          <h2>Filtry</h2>
          <input
            type="text"
            placeholder="Szukaj po nazwie..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <div className="completion-range">
            <input
              type="number"
              min="0"
              max="100"
              value={completionRange[0]}
              onChange={(e) =>
                setCompletionRange([Number(e.target.value), completionRange[1]])
              }
            />
            <span></span>
            <input
              type="number"
              min="0"
              max="100"
              value={completionRange[1]}
              onChange={(e) =>
                setCompletionRange([completionRange[0], Number(e.target.value)])
              }
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Od największego do najmniejszego</option>
            <option value="asc">Od najmniejszego do największego</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={4}>Ilość celów na strone (4)</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>

        {/* PRAWA KOLUMNA - Lista celów */}
        <div className="goals-list">
          <h2>Twoje cele</h2>
          {successMessage && <div className="success-message">{successMessage}</div>}

          {/* Zakładki: "Aktywne" / "Ukończone" */}
          <div className="goals-tabs">
            <button
              className={showTab === 'active' ? 'tab-active' : ''}
              onClick={() => setShowTab('active')}
            >
              Aktywne ({activeGoals.length})
            </button>
            <button
              className={showTab === 'completed' ? 'tab-active' : ''}
              onClick={() => setShowTab('completed')}
            >
              Ukończone ({completedGoals.length})
            </button>
          </div>

          {currentItems.length === 0 ? (
            <p>Brak celów w tej zakładce.</p>
          ) : (
            currentItems.map((goal) => {
              // Odczyt suwaka
              const currentVal = sliderValues[goal.id] || 0;
              const progress = goal.targetAmount
                ? (currentVal / goal.targetAmount) * 100
                : 0;

              // Dobór koloru obramowania (czerwony / żółty / zielony)
              let borderColor = 'red';
              if (progress >= 50 && progress < 80) borderColor = 'yellow';
              if (progress >= 80) borderColor = 'green';

              // Edycja inline?
              if (editGoalId === goal.id) {
                return (
                  <div
                    key={goal.id}
                    className="goal-item"
                    style={{ borderLeft: `5px solid ${borderColor}` }}
                  >
                    <form onSubmit={handleSaveEditedGoal} className="edit-goal-form">
                      <input
                        type="text"
                        value={editGoalData.name}
                        onChange={(e) =>
                          setEditGoalData({ ...editGoalData, name: e.target.value })
                        }
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editGoalData.targetAmount}
                        onChange={(e) =>
                          setEditGoalData({
                            ...editGoalData,
                            targetAmount: e.target.value,
                          })
                        }
                        required
                      />
                      <input
                        type="text"
                        value="PLN"
                        disabled
                        style={{ cursor: 'not-allowed' }}
                      />
                      <div className="goal-actions">
                        <button type="submit" className="save-goal-button">
                          Zapisz
                        </button>
                        <button
                          type="button"
                          className="cancel-edit-button"
                          onClick={handleCancelEdit}
                        >
                          Anuluj
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              // Widok zwykły
              return (
                <div
                  key={goal.id}
                  className="goal-item"
                  style={{ borderLeft: `5px solid ${borderColor}` }}
                >
                  <h3>{goal.name}</h3>
                  <p>
                    Postęp: {currentVal}/{goal.targetAmount} {goal.currency} (
                    {progress.toFixed(0)}%)
                  </p>

                  <input
                    type="range"
                    min="0"
                    max={goal.targetAmount} // suwak od 0 do target
                    step="1"               // zawsze o 1
                    value={currentVal}
                    className="goal-slider"
                    style={getSliderStyle(goal)}
                    onChange={(e) => handleSliderChange(goal, e.target.value)}
                    onMouseUp={() => handleSliderMouseUp(goal)}
                  />

                  <div className="goal-actions">
                    <img
                      src="edit-pen-icon.png"
                      alt="Edytuj"
                      title='Edytuj'
                      onClick={() => handleEditClick(goal)}
                      className="action-icon"
                    />
                    <img
                      src="recycle-bin-line-icon.png"
                      alt="Usuń"
                      title='Usuń'
                      onClick={() => openDeleteModal(goal)}
                      className="action-icon"
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Paginacja */}
          {totalItems > itemsPerPage && (
            <div className="pagination">
              <button onClick={handlePrevPage} disabled={currentPage === 1}>
                Poprzednia
              </button>
              <span>
                Strona {currentPage} z {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Następna
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal usuwania */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć ten cel?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button class="cancel-button" onClick={closeDeleteModal}>Anuluj</button>
              <button class="delete-button" onClick={confirmDelete}>Usuń</button>
            </div>
          </div>
        </div>
      )}

      {/* Fanfary – proste okienko, jeśli fanfareGoalId != null */}
      {fanfareGoalId && (
        <div className="fanfare-overlay" onClick={() => setFanfareGoalId(null)}>
          <div className="fanfare-content">
            <h2>🎉 Gratulacje! Osiągnięto cel. 🎉</h2>
            <p>Kliknij, aby zamknąć</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetsPage;
