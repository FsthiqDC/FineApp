// src/pages/admin/RemindersAdminPage.js

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import './RemindersAdminPage.css';
import { supabase } from '../../supabaseClient';

const RemindersAdminPage = () => {
  // Lista wszystkich przypomnień w pamięci
  const [reminders, setReminders] = useState([]);

  // Filtry
  const [filters, setFilters] = useState({
    searchEmail: '',
    isActive: '',
    sortKey: 'earliest',
  });

  // Lista po filtrach/sortowaniu
  const [filteredReminders, setFilteredReminders] = useState([]);

  // Paginacja
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPages = Math.ceil(filteredReminders.length / perPage);

  // Element rozsuwany (ID)
  const [expandedReminderId, setExpandedReminderId] = useState(null);

  // Modal Edycji
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    reminder_title: '',
    reminder_description: '',
    reminder_frequency: 'once',
    reminder_next_date: '',
    reminder_is_active: true,
  });

  // Modal Usuwania
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  /* ===================== 1. Pobieranie przypomnień z Supabase ===================== */
  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('Reminders')
        .select(
          `
            *,
            owner:reminder_user_id ( user_email, username )
          `
        )
        .order('reminder_next_date', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (err) {
      console.error('Błąd pobierania przypomnień (admin):', err);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  /* ===================== 2. Filtrowanie i sortowanie lokalne ===================== */
  useEffect(() => {
    let arr = [...reminders];
    const { searchEmail, isActive, sortKey } = filters;

    // Filtr: email właściciela
    if (searchEmail) {
      const search = searchEmail.toLowerCase();
      arr = arr.filter((r) => {
        const email = (r.owner?.user_email || '').toLowerCase();
        return email.includes(search);
      });
    }

    // Filtr: isActive
    if (isActive === 'true') {
      arr = arr.filter((r) => r.reminder_is_active === true);
    } else if (isActive === 'false') {
      arr = arr.filter((r) => r.reminder_is_active === false);
    }

    // Sortowanie
    switch (sortKey) {
      case 'earliest':
        arr.sort(
          (a, b) =>
            new Date(a.reminder_next_date) - new Date(b.reminder_next_date)
        );
        break;
      case 'latest':
        arr.sort(
          (a, b) =>
            new Date(b.reminder_next_date) - new Date(a.reminder_next_date)
        );
        break;
      default:
        break;
    }

    setFilteredReminders(arr);
    setCurrentPage(1);
  }, [reminders, filters]);

  /* ===================== 3. Lokalna paginacja ===================== */
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const displayedReminders = filteredReminders.slice(startIndex, endIndex);

  /* ===================== 4. Rozwijanie szczegółów ===================== */
  const toggleReminderDetails = (id) => {
    setExpandedReminderId((prev) => (prev === id ? null : id));
  };

  const isReminderExpanded = (id) => expandedReminderId === id;

  /* ===================== 5. Edycja przypomnienia ===================== */
  const openEditModal = (rem) => {
    setReminderToEdit(rem);
    setEditFormData({
      reminder_title: rem.reminder_title || '',
      reminder_description: rem.reminder_description || '',
      reminder_frequency: rem.reminder_frequency || 'once',
      reminder_next_date: rem.reminder_next_date || '',
      reminder_is_active: rem.reminder_is_active ?? true,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setReminderToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setEditFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const confirmEdit = async () => {
    if (!reminderToEdit) return;
    try {
      const payload = {
        reminder_title: editFormData.reminder_title,
        reminder_description: editFormData.reminder_description,
        reminder_frequency: editFormData.reminder_frequency,
        reminder_next_date: editFormData.reminder_next_date,
        reminder_is_active: editFormData.reminder_is_active,
      };

      const { data, error } = await supabase
        .from('Reminders')
        .update(payload)
        .eq('reminder_id', reminderToEdit.reminder_id)
        .select('*')
        .single();

      if (error) throw error;

      // Aktualizujemy w local state
      setReminders((prev) =>
        prev.map((r) =>
          r.reminder_id === reminderToEdit.reminder_id ? data : r
        )
      );
    } catch (err) {
      console.error('Błąd edycji przypomnienia (admin):', err);
    } finally {
      closeEditModal();
    }
  };

  /* ===================== 6. Usuwanie przypomnienia ===================== */
  const openDeleteModal = (rem) => {
    setReminderToDelete(rem);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setReminderToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;
    try {
      const { error } = await supabase
        .from('Reminders')
        .delete()
        .eq('reminder_id', reminderToDelete.reminder_id);

      if (error) throw error;

      // Usuwamy z local state
      setReminders((prev) =>
        prev.filter((r) => r.reminder_id !== reminderToDelete.reminder_id)
      );
    } catch (err) {
      console.error('Błąd usuwania przypomnienia (admin):', err);
    } finally {
      closeDeleteModal();
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="reminders-admin-container">
      <Navbar />

      <div className="reminders-admin-content">
        {/* LEWA KOLUMNA: Filtry */}
        <div className="reminders-admin-filters">
          <h2>Filtry (Admin)</h2>

          <input
            type="text"
            name="searchEmail"
            placeholder="Szukaj po emailu użytkownika..."
            value={filters.searchEmail}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          />

          <label>Czy aktywne?</label>
          <select
            name="isActive"
            value={filters.isActive}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          >
            <option value="">Wszystkie</option>
            <option value="true">Tylko aktywne</option>
            <option value="false">Nieaktywne</option>
          </select>

          <label>Sortowanie:</label>
          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          >
            <option value="earliest">Najwcześniejszy termin</option>
            <option value="latest">Najpóźniejszy termin</option>
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

        {/* PRAWA KOLUMNA: Lista przypomnień */}
        <div className="reminders-admin-list">
          <h2>Wszystkie Przypomnienia</h2>

          {displayedReminders.map((rem) => {
            const expanded = isReminderExpanded(rem.reminder_id);

            return (
              <div key={rem.reminder_id} className="reminder-admin-item">
                <div className="reminder-admin-header">
                  <span>{rem.reminder_title}</span>
                  <span className="reminder-admin-frequency">
                    {rem.reminder_frequency}
                  </span>
                </div>

                <div className="reminder-admin-subheader">
                  <span>
                    Użytkownik: {rem.owner?.username || '??'} (
                    {rem.owner?.user_email || '??'})
                  </span>
                  <span
                    className={
                      rem.reminder_is_active
                        ? 'reminder-admin-active'
                        : 'reminder-admin-inactive'
                    }
                  >
                    {rem.reminder_is_active ? 'Aktywne' : 'Nieaktywne'}
                  </span>
                </div>

                <div className="reminder-admin-actions">
                  <img
                    src="/edit-pen-icon.png"
                    alt="Edytuj"
                    title="Edytuj"
                    onClick={() => openEditModal(rem)}
                    className="admin-action-icon"
                  />
                  <img
                    src="/eye-icon.png"
                    alt="Szczegóły"
                    title="Szczegóły"
                    onClick={() => toggleReminderDetails(rem.reminder_id)}
                    className="admin-action-icon"
                  />
                  <img
                    src="/recycle-bin-line-icon.png"
                    alt="Usuń"
                    title="Usuń"
                    onClick={() => openDeleteModal(rem)}
                    className="admin-action-icon"
                  />
                </div>

                {/* Szczegóły */}
                <div
                  className={`reminder-admin-details ${
                    expanded ? 'expanded' : ''
                  }`}
                >
                  <p>
                    <strong>ID:</strong> {rem.reminder_id}
                  </p>
                  <p>
                    <strong>Opis:</strong> {rem.reminder_description}
                  </p>
                  <p>
                    <strong>Częstotliwość:</strong> {rem.reminder_frequency}
                  </p>
                  <p>
                    <strong>Najbliższa data:</strong> {rem.reminder_next_date}
                  </p>
                  <p>
                    <strong>Data utworzenia:</strong> {rem.reminder_created_at}
                  </p>
                  <p>
                    <strong>Aktywne:</strong>{' '}
                    {rem.reminder_is_active ? 'Tak' : 'Nie'}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Paginacja */}
          <div className="admin-pagination">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Poprzednia
            </button>
            <span>
              Strona {currentPage} z {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Następna
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Edycja */}
      {isEditModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h2>Edytuj Przypomnienie</h2>

            <label>Tytuł:</label>
            <input
              type="text"
              name="reminder_title"
              value={editFormData.reminder_title}
              onChange={handleEditInputChange}
            />

            <label>Opis:</label>
            <textarea
              name="reminder_description"
              value={editFormData.reminder_description}
              onChange={handleEditInputChange}
            />

            <label>Częstotliwość:</label>
            <select
              name="reminder_frequency"
              value={editFormData.reminder_frequency}
              onChange={handleEditInputChange}
            >
              <option value="once">Jednorazowe</option>
              <option value="weekly">Co tydzień</option>
              <option value="monthly">Co miesiąc</option>
              <option value="yearly">Co rok</option>
            </select>

            <label>Następna data:</label>
            <input
              type="date"
              name="reminder_next_date"
              value={editFormData.reminder_next_date}
              onChange={handleEditInputChange}
            />

            <label>Czy aktywne?</label>
            <input
              type="checkbox"
              name="reminder_is_active"
              checked={editFormData.reminder_is_active}
              onChange={handleEditInputChange}
            />

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}
            >
              <button className="admin-cancel-button" onClick={closeEditModal}>
                Anuluj
              </button>
              <button
                className="admin-save-button"
                onClick={confirmEdit}
                style={{ marginLeft: '10px' }}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Usunięcie */}
      {isDeleteModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h2>Czy na pewno chcesz usunąć to przypomnienie?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="admin-cancel-button" onClick={closeDeleteModal}>
                Anuluj
              </button>
              <button
                className="admin-delete-button"
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

export default RemindersAdminPage;
