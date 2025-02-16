import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import './SavingGoalsAdminPage.css';
import { supabase } from '../../supabaseClient';

const SavingGoalsAdminPage = () => {
  // Lista wszystkich celów
  const [goals, setGoals] = useState([]);

  // Filtry
  const [filters, setFilters] = useState({
    searchEmail: '',     // filtry po emailu właściciela
    status: '',          // 'Aktywny', 'Ukończony' lub ''
    sortKey: 'largestTarget', // 'largestTarget', 'smallestTarget'
  });

  const [filteredGoals, setFilteredGoals] = useState([]);

  // Paginacja
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Rozwijanie
  const [expandedGoalId, setExpandedGoalId] = useState(null);

  // Modal EDYCJA
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    savingsgoals_name: '',
    savingsgoals_target_amount: '',
    savingsgoals_amount: '',
    savingsgoals_status: 'Aktywny',
    savingsgoals_currency: 'PLN',
  });

  // Modal USUWANIA
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  /* ================== 1. Pobieranie z Supabase ================== */
  const fetchGoals = async () => {
    try {
      // Tabela: SavingsGoals
      // W relacji: savingsgoals_owner_id -> owner (user_email, username)
      const { data, error } = await supabase
        .from('SavingsGoals')
        .select(`
          *,
          owner:savingsgoals_owner_id ( user_email, username )
        `)
        .order('savingsgoals_target_amount', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error('Błąd pobierania celów (admin):', err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  /* ================== 2. Filtrowanie i sortowanie ================== */
  useEffect(() => {
    let arr = [...goals];
    const { searchEmail, status, sortKey } = filters;

    // Filtr: email
    if (searchEmail) {
      const search = searchEmail.toLowerCase();
      arr = arr.filter(g => {
        const email = (g.owner?.user_email || '').toLowerCase();
        return email.includes(search);
      });
    }
    // Filtr: status
    if (status) {
      arr = arr.filter(g => g.savingsgoals_status === status);
    }

    // Sort
    switch (sortKey) {
      case 'largestTarget':
        arr.sort((a, b) => b.savingsgoals_target_amount - a.savingsgoals_target_amount);
        break;
      case 'smallestTarget':
        arr.sort((a, b) => a.savingsgoals_target_amount - b.savingsgoals_target_amount);
        break;
      default:
        break;
    }

    setFilteredGoals(arr);
    setCurrentPage(1);
  }, [goals, filters]);

  /* ================== 3. Lokalna paginacja ================== */
  const totalRecords = filteredGoals.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const displayedGoals = filteredGoals.slice(startIndex, endIndex);

  /* ================== 4. Rozwijanie szczegółów ================== */
  const toggleGoalDetails = (id) => {
    setExpandedGoalId(prev => (prev === id ? null : id));
  };

  const isGoalExpanded = (id) => expandedGoalId === id;

  /* ================== 5. Edycja ================== */
  const openEditModal = (goal) => {
    setGoalToEdit(goal);
    setEditFormData({
      savingsgoals_name: goal.savingsgoals_name || '',
      savingsgoals_target_amount: String(goal.savingsgoals_target_amount || ''),
      savingsgoals_amount: String(goal.savingsgoals_amount || ''),
      savingsgoals_status: goal.savingsgoals_status || 'Aktywny',
      savingsgoals_currency: goal.savingsgoals_currency || 'PLN',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setGoalToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const confirmEdit = async () => {
    if (!goalToEdit) return;
    try {
      const payload = {
        savingsgoals_name: editFormData.savingsgoals_name,
        savingsgoals_target_amount: Number(editFormData.savingsgoals_target_amount),
        savingsgoals_amount: Number(editFormData.savingsgoals_amount),
        savingsgoals_status: editFormData.savingsgoals_status,
        savingsgoals_currency: editFormData.savingsgoals_currency,
      };

      const { data, error } = await supabase
        .from('SavingsGoals')
        .update(payload)
        .eq('savingsgoals_id', goalToEdit.savingsgoals_id)
        .select('*')
        .single();

      if (error) throw error;

      // Aktualizacja w local state
      setGoals(prev =>
        prev.map(g => g.savingsgoals_id === goalToEdit.savingsgoals_id ? data : g)
      );
    } catch (err) {
      console.error('Błąd edycji celu (admin):', err);
    } finally {
      closeEditModal();
    }
  };

  /* ================== 6. Usuwanie ================== */
  const openDeleteModal = (goal) => {
    setGoalToDelete(goal);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setGoalToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    try {
      const { error } = await supabase
        .from('SavingsGoals')
        .delete()
        .eq('savingsgoals_id', goalToDelete.savingsgoals_id);

      if (error) throw error;

      setGoals(prev => prev.filter(g => g.savingsgoals_id !== goalToDelete.savingsgoals_id));
    } catch (err) {
      console.error('Błąd usuwania celu (admin):', err);
    } finally {
      closeDeleteModal();
    }
  };

  /* ================== RENDER ================== */
  return (
    <div className="savinggoals-admin-container">
      <Navbar />

      <div className="savinggoals-admin-content">
        {/* LEWA KOLUMNA: Filtry */}
        <div className="savinggoals-admin-filters">
          <h2>Filtry (Admin)</h2>

          <input
            type="text"
            name="searchEmail"
            placeholder="Szukaj po emailu..."
            value={filters.searchEmail}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />

          <label>Status:</label>
          <select
            name="status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="">Wszystkie</option>
            <option value="Aktywny">Aktywny</option>
            <option value="Ukończony">Ukończony</option>
          </select>

          <label>Sortowanie:</label>
          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="largestTarget">Największy cel</option>
            <option value="smallestTarget">Najmniejszy cel</option>
          </select>

          <label>Na stronę:</label>
          <select
            name="perPage"
            value={perPage}
            onChange={(e) => {
              setCurrentPage(1);
              setPerPage(Number(e.target.value));
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* PRAWA KOLUMNA: Lista */}
        <div className="savinggoals-admin-list">
          <h2>Wszystkie Cele</h2>

          {displayedGoals.map((goal) => {
            const expanded = isGoalExpanded(goal.savingsgoals_id);
            return (
              <div key={goal.savingsgoals_id} className="savinggoals-admin-item">
                <div className="savinggoals-header">
                  <span>{goal.savingsgoals_name}</span>
                  <span className="goals-amount">
                    {goal.savingsgoals_target_amount} {goal.savingsgoals_currency}
                  </span>
                </div>

                <div className="savinggoals-subheader">
                  <span>
                    Użytkownik: {goal.owner?.username || '??'} ({goal.owner?.user_email || '??'})
                  </span>
                  <span
                    className={
                      goal.savingsgoals_status === 'Ukończony'
                        ? 'goals-status done'
                        : 'goals-status active'
                    }
                  >
                    {goal.savingsgoals_status}
                  </span>
                </div>

                <div className="savinggoals-actions">
                  <img
                    src="/edit-pen-icon.png"
                    alt="Edytuj"
                    title="Edytuj"
                    onClick={() => openEditModal(goal)}
                    className="action-icon"
                  />
                  <img
                    src="/eye-icon.png"
                    alt="Szczegóły"
                    title="Szczegóły"
                    onClick={() => toggleGoalDetails(goal.savingsgoals_id)}
                    className="action-icon"
                  />
                  <img
                    src="/recycle-bin-line-icon.png"
                    alt="Usuń"
                    title="Usuń"
                    onClick={() => openDeleteModal(goal)}
                    className="action-icon"
                  />
                </div>

                {/* Szczegóły */}
                <div className={`savinggoals-details ${expanded ? 'expanded' : ''}`}>
                  {expanded && (
                    <div>
                      <p><strong>ID:</strong> {goal.savingsgoals_id}</p>
                      <p><strong>OwnerID:</strong> {goal.savingsgoals_owner_id}</p>
                      <p><strong>Nazwa:</strong> {goal.savingsgoals_name}</p>
                      <p><strong>Cel (kwota docelowa):</strong> {goal.savingsgoals_target_amount} {goal.savingsgoals_currency}</p>
                      <p><strong>Uzyskana kwota:</strong> {goal.savingsgoals_amount} {goal.savingsgoals_currency}</p>
                      <p><strong>Status:</strong> {goal.savingsgoals_status}</p>
                      <p><strong>Waluta:</strong> {goal.savingsgoals_currency}</p>
                      {/* Dodaj tu inne pola, jeśli są */}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Paginacja */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Poprzednia
            </button>
            <span>Strona {currentPage} z {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Następna
            </button>
          </div>
        </div>
      </div>

      {/* MODAL EDYCJI */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj Cel</h2>

            <label>Nazwa Celu:</label>
            <input
              type="text"
              name="savingsgoals_name"
              value={editFormData.savingsgoals_name}
              onChange={handleEditInputChange}
            />

            <label>Kwota docelowa:</label>
            <input
              type="number"
              step="0.01"
              name="savingsgoals_target_amount"
              value={editFormData.savingsgoals_target_amount}
              onChange={handleEditInputChange}
            />

            <label>Zgromadzona kwota:</label>
            <input
              type="number"
              step="0.01"
              name="savingsgoals_amount"
              value={editFormData.savingsgoals_amount}
              onChange={handleEditInputChange}
            />

            <label>Status:</label>
            <select
              name="savingsgoals_status"
              value={editFormData.savingsgoals_status}
              onChange={handleEditInputChange}
            >
              <option value="Aktywny">Aktywny</option>
              <option value="Ukończony">Ukończony</option>
            </select>

            <label>Waluta:</label>
            <input
              type="text"
              name="savingsgoals_currency"
              value={editFormData.savingsgoals_currency}
              onChange={handleEditInputChange}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="cancel-button" onClick={closeEditModal}>Anuluj</button>
              <button
                className="save-button"
                onClick={confirmEdit}
                style={{ marginLeft: '10px' }}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL USUNIĘCIA */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć ten cel?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="cancel-button" onClick={closeDeleteModal}>Anuluj</button>
              <button
                className="delete-button"
                onClick={confirmDelete}
                style={{ marginLeft: '10px' }}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingGoalsAdminPage;
