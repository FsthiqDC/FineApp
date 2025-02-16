import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './RemindersPage.css';
import axios from 'axios';

// Mapa częstotliwości – przetłumaczone wartości
const frequencyMap = {
  once: "jednorazowo",
  weekly: "co tydzień",
  monthly: "miesięcznie",
  yearly: "co rok"
};

const RemindersPage = () => {
  // Lista przypomnień pobrana z backendu
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);

  // Formularz dodawania nowego przypomnienia
  const [formData, setFormData] = useState({
    reminder_title: '',
    reminder_description: '',
    reminder_frequency: 'once',
    reminder_next_date: '',
    reminder_is_active: true,
  });

  // Filtry – rozszerzone o status
  const [filters, setFilters] = useState({
    searchText: '',
    frequency: '',
    status: 'all'
  });

  // Modal edycji
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    reminder_title: '',
    reminder_description: '',
    reminder_frequency: 'once',
    reminder_next_date: '',
    reminder_is_active: true,
  });

  // Modal usuwania
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  // Pobranie przypomnień z backendu – filtrujemy przypomnienia jednorazowe, których data już minęła
  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Brak tokena');
      const resp = await axios.get('http://127.0.0.1:8000/api/reminders/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const backendReminders = resp.data.reminders || [];
      const now = new Date();
      const validReminders = backendReminders.filter(r => {
        if (r.reminder_frequency === 'once') {
          return new Date(r.reminder_next_date) > now;
        }
        return true;
      });
      setReminders(validReminders);
      setFilteredReminders(validReminders);
    } catch (error) {
      console.error('Błąd pobierania przypomnień:', error);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  // Lokalna filtracja – według tekstu, częstotliwości i statusu (aktywne/nieaktywne)
  useEffect(() => {
    let filtered = [...reminders];
    const { searchText, frequency, status } = filters;
    if (frequency) {
      filtered = filtered.filter(r => r.reminder_frequency === frequency);
    }
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.reminder_title.toLowerCase().includes(lowerSearch) ||
          (r.reminder_description || '').toLowerCase().includes(lowerSearch)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(r =>
        status === 'active' ? r.reminder_is_active : !r.reminder_is_active
      );
    }
    setFilteredReminders(filtered);
  }, [reminders, filters]);

  // Obsługa zmian w formularzu dodawania
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        reminder_title: formData.reminder_title,
        reminder_description: formData.reminder_description,
        reminder_frequency: formData.reminder_frequency,
        reminder_next_date: formData.reminder_next_date,
        reminder_is_active: formData.reminder_is_active
      };
      const resp = await axios.post('http://127.0.0.1:8000/api/reminders/', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 201) {
        console.log('Dodano przypomnienie:', resp.data);
        fetchReminders();
        setFormData({
          reminder_title: '',
          reminder_description: '',
          reminder_frequency: 'once',
          reminder_next_date: '',
          reminder_is_active: true,
        });
      }
    } catch (error) {
      console.error('Błąd podczas dodawania przypomnienia:', error);
    }
  };

  // Obsługa modala usuwania
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
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://127.0.0.1:8000/api/reminders/${reminderToDelete.reminder_id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReminders(prev => prev.filter(r => r.reminder_id !== reminderToDelete.reminder_id));
      setFilteredReminders(prev => prev.filter(r => r.reminder_id !== reminderToDelete.reminder_id));
      closeDeleteModal();
    } catch (error) {
      console.error('Błąd przy usuwaniu przypomnienia:', error);
    }
  };

  // Obsługa modala edycji
  const openEditModal = (rem) => {
    setReminderToEdit(rem);
    setEditFormData({
      reminder_title: rem.reminder_title,
      reminder_description: rem.reminder_description,
      reminder_frequency: rem.reminder_frequency,
      reminder_next_date: rem.reminder_next_date,
      reminder_is_active: rem.reminder_is_active
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setReminderToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const confirmEdit = async () => {
    if (!reminderToEdit) return;
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        reminder_title: editFormData.reminder_title,
        reminder_description: editFormData.reminder_description,
        reminder_frequency: editFormData.reminder_frequency,
        reminder_next_date: editFormData.reminder_next_date,
        reminder_is_active: editFormData.reminder_is_active
      };
      const resp = await axios.patch(
        `http://127.0.0.1:8000/api/reminders/${reminderToEdit.reminder_id}/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.status === 200) {
        setReminders(prev =>
          prev.map(r =>
            r.reminder_id === reminderToEdit.reminder_id ? { ...r, ...payload } : r
          )
        );
        setFilteredReminders(prev =>
          prev.map(r =>
            r.reminder_id === reminderToEdit.reminder_id ? { ...r, ...payload } : r
          )
        );
        closeEditModal();
      }
    } catch (error) {
      console.error('Błąd podczas edycji przypomnienia:', error);
    }
  };

  return (
    <div className="reminders-container">
      <Navbar />
      <div className="reminders-content">
        {/* Sekcja: Dodaj przypomnienie (lewa kolumna) */}
        <form onSubmit={handleAddReminder} className="reminder-form">
          <h2>Dodaj przypomnienie</h2>
          <input
            type="text"
            id="reminder_title"
            name="reminder_title"
            placeholder="Nazwa przypomnienia (np. Opłata za rachunki)"
            value={formData.reminder_title}
            onChange={handleFormChange}
            required
          />
          <textarea
            id="reminder_description"
            name="reminder_description"
            placeholder="Dodatkowe szczegóły..."
            value={formData.reminder_description}
            onChange={handleFormChange}
          />
          <label htmlFor="reminder_frequency">Częstotliwość:</label>
          <select
            id="reminder_frequency"
            name="reminder_frequency"
            value={formData.reminder_frequency}
            onChange={handleFormChange}
            required
          >
            <option value="once">Jednorazowo</option>
            <option value="weekly">Co tydzień</option>
            <option value="monthly">Miesięcznie</option>
            <option value="yearly">Co rok</option>
          </select>
          <label htmlFor="reminder_next_date">Data najbliższego przypomnienia:</label>
          <input
            type="date"
            id="reminder_next_date"
            name="reminder_next_date"
            value={formData.reminder_next_date}
            onChange={handleFormChange}
            required
          />
          <label className="reminder-active-label">
            Przypomnienie aktywne
            <input
              type="checkbox"
              name="reminder_is_active"
              checked={formData.reminder_is_active}
              onChange={handleFormChange}
            />
          </label>
          <button type="submit" className="add-reminder-button">Dodaj</button>
        </form>

        {/* Sekcja: Filtry (środkowa kolumna) */}
        <div className="reminders-filters">
          <h2>Filtry</h2>
          <input
            type="text"
            id="searchText"
            name="searchText"
            placeholder="Szukaj po tytule lub opisie..."
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />
          <select
            id="frequency"
            name="frequency"
            value={filters.frequency}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="">Wszystkie częstotliwości</option>
            <option value="once">Jednorazowo</option>
            <option value="weekly">Co tydzień</option>
            <option value="monthly">Miesięcznie</option>
            <option value="yearly">Co rok</option>
          </select>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="all">Wszystkie</option>
            <option value="active">Aktywne</option>
            <option value="inactive">Nieaktywne</option>
          </select>
        </div>

        {/* Sekcja: Lista przypomnień (prawa kolumna) */}
        <div className="reminders-list">
          <h2>Lista przypomnień</h2>
          {filteredReminders.map(rem => (
            <div key={rem.reminder_id} className={`reminder-item ${!rem.reminder_is_active ? "inactive" : ""}`}>
              <div className="reminder-header">
                <h3 className="reminder-title">{rem.reminder_title}</h3>
                <span className="reminder-active-status">
                  {rem.reminder_is_active ? "Przypomnienie aktywne" : "Przypomnienie nieaktywne"}
                </span>
              </div>
              <div className="reminder-details">
                <span className="reminder-frequency">
                  {frequencyMap[rem.reminder_frequency] || rem.reminder_frequency}
                </span>
                <span className="reminder-date">
                  {new Date(rem.reminder_next_date).toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="reminder-actions">
                <img
                  src="edit-pen-icon.png"
                  alt="Edytuj"
                  title="Edytuj"
                  onClick={() => openEditModal(rem)}
                />
                <img
                  src="recycle-bin-line-icon.png"
                  alt="Usuń"
                  title="Usuń"
                  onClick={() => openDeleteModal(rem)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal usuwania */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć to przypomnienie?</h2>
            <div className="modal-actions">
              <button className="cancel-button" onClick={closeDeleteModal}>Anuluj</button>
              <button className="delete-button" onClick={confirmDelete}>Usuń</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj przypomnienie</h2>
            <label>Tytuł przypomnienia:</label>
            <input
              type="text"
              name="reminder_title"
              value={editFormData.reminder_title}
              onChange={handleEditFormChange}
              required
            />
            <label>Opis:</label>
            <textarea
              name="reminder_description"
              value={editFormData.reminder_description}
              onChange={handleEditFormChange}
            />
            <label>Częstotliwość:</label>
            <select
              name="reminder_frequency"
              value={editFormData.reminder_frequency}
              onChange={handleEditFormChange}
              required
            >
              <option value="once">Jednorazowo</option>
              <option value="weekly">Co tydzień</option>
              <option value="monthly">Miesięcznie</option>
              <option value="yearly">Co rok</option>
            </select>
            <label>Data najbliższego przypomnienia:</label>
            <input
              type="date"
              name="reminder_next_date"
              value={editFormData.reminder_next_date}
              onChange={handleEditFormChange}
              required
            />
            <label className="reminder-active-label">
              Przypomnienie aktywne
              <input
                type="checkbox"
                name="reminder_is_active"
                checked={editFormData.reminder_is_active}
                onChange={handleEditFormChange}
              />
            </label>
            <div className="modal-actions">
              <button className="save-button" onClick={confirmEdit}>Zapisz</button>
              <button className="cancel-button" onClick={closeEditModal}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;
