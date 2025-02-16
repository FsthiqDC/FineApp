// src/pages/admin/UsersAdminPage.js

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import './UsersAdminPage.css';
import { supabase } from '../../supabaseClient';
import bcrypt from 'bcryptjs'; // do hashowania hasła (demo)

// Symuluje losowanie hasła
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const UsersAdminPage = () => {
  /* =================== STANY =================== */
  const [users, setUsers] = useState([]);

  // Formularz dodawania usera
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    user_type: 'user',
    is_active: true,
  });

  // Filtry i sort
  const [filters, setFilters] = useState({
    searchText: '',
    sortKey: 'newest', // newest, oldest, alpha, byType
  });
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Modal EDYCJI
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    user_type: 'user',
    is_active: true,
    newPassword: '',
  });

  // Modal BLOKOWANIA
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);

  // Modal USUNIĘCIA
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Rozwijanie szczegółów
  const [expandedUserId, setExpandedUserId] = useState(null);

  /* =================== PAGINACJA =================== */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // =================== 1. Pobieranie userów ===================
  const fetchUsers = async () => {
    try {
      const offset = (currentPage - 1) * perPage;
      const { data, error, count } = await supabase
        .from('App_Users')
        .select('*', { count: 'exact' })
        .range(offset, offset + perPage - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
      if (count) {
        setTotalPages(Math.ceil(count / perPage));
      }
      setFilteredUsers(data || []);
    } catch (err) {
      console.error('Błąd pobierania userów:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage]);

  // =================== 2. Filtrowanie/sortowanie lokalne ===================
  useEffect(() => {
    let arr = [...users];
    const { searchText, sortKey } = filters;

    // Filtr
    if (searchText) {
      const st = searchText.toLowerCase();
      arr = arr.filter(u => {
        const combined = `${u.user_email} ${u.username} ${u.first_name} ${u.last_name}`.toLowerCase();
        return combined.includes(st);
      });
    }

    // Sort
    switch (sortKey) {
      case 'newest':
        arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'alpha':
        arr.sort((a, b) =>
          (a.username || '').localeCompare(b.username || '', 'pl', { sensitivity: 'base' })
        );
        break;
      case 'byType':
        // admin > user
        arr.sort((a, b) => (a.user_type > b.user_type ? -1 : 1));
        break;
      default:
        break;
    }
    setFilteredUsers(arr);
  }, [users, filters]);

  // =================== 3. Dodawanie usera z hasłem i wysyłanie maila ===================
  const handleFormChange = e => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // **Funkcja** wysyłania e-maila z hasłem przez Supabase Edge Function
  const sendEmailWithPassword = async (targetEmail, plainPass) => {
    try {
      // Wywołanie edge function "send-mail"
      // Załóżmy, że w folderze supabase/functions/send-mail/index.js
      // jest kod obsługujący wysyłanie maila (np. nodemailer + klucz SendGrid).
      const { data, error } = await supabase.functions.invoke('send-mail', {
        body: {
          email: targetEmail,
          password: plainPass,
        },
      });
      if (error) {
        console.error('Błąd invoke send-mail:', error);
      } else {
        console.log('Funkcja send-mail OK:', data);
      }
    } catch (err) {
      console.error('Błąd wywołania edge function send-mail:', err);
    }
  };

  const handleAddUser = async e => {
    e.preventDefault();
    try {
      const plainPass = generateRandomPassword(10);
      // Hash
      const salt = bcrypt.genSaltSync(10);
      const hashedPass = bcrypt.hashSync(plainPass, salt);

      // Tworzymy usera w Supabase
      const { data, error } = await supabase
        .from('App_Users')
        .insert([
          {
            user_email: formData.email,
            username: formData.username,
            first_name: formData.first_name,
            last_name: formData.last_name,
            user_type: formData.user_type,
            is_active: formData.is_active,
            password: hashedPass,
            created_at: new Date().toISOString(),
            last_login: null,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      setUsers(prev => [...prev, data]);
      setFilteredUsers(prev => [...prev, data]);

      // Wyślij mail z hasłem do usera
      await sendEmailWithPassword(formData.email, plainPass);

      // Reset
      setFormData({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        user_type: 'user',
        is_active: true,
      });
    } catch (err) {
      console.error('Błąd dodawania usera:', err);
    }
  };

  // =================== 4. Rozwijanie szczegółów ===================
  const toggleUserDetails = id => {
    setExpandedUserId(prev => (prev === id ? null : id));
  };

  // =================== 5. Usuwanie ===================
  const openDeleteModal = user => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setUserToDelete(null);
    setIsDeleteModalOpen(false);
  };
  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await supabase
        .from('App_Users')
        .delete()
        .eq('user_id', userToDelete.user_id);
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
      setFilteredUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
    } catch (err) {
      console.error('Błąd usuwania usera:', err);
    } finally {
      closeDeleteModal();
    }
  };

  // =================== 6. Edycja (z możliwością zmiany hasła) ===================
  const openEditModal = user => {
    setUserToEdit(user);
    setEditFormData({
      email: user.user_email || '',
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      user_type: user.user_type || 'user',
      is_active: user.is_active || false,
      newPassword: '',
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setUserToEdit(null);
    setIsEditModalOpen(false);
  };
  const handleEditFormChange = e => {
    const { name, type, checked, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const confirmEdit = async () => {
    if (!userToEdit) return;
    try {
      let fieldsToUpdate = {
        user_email: editFormData.email,
        username: editFormData.username,
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        user_type: editFormData.user_type,
        is_active: editFormData.is_active,
      };
      if (editFormData.newPassword) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPass = bcrypt.hashSync(editFormData.newPassword, salt);
        fieldsToUpdate.password = hashedPass;
      }
      const { data, error } = await supabase
        .from('App_Users')
        .update(fieldsToUpdate)
        .eq('user_id', userToEdit.user_id)
        .select('*')
        .single();
      if (error) throw error;

      setUsers(prev => prev.map(u => (u.user_id === userToEdit.user_id ? data : u)));
      setFilteredUsers(prev => prev.map(u => (u.user_id === userToEdit.user_id ? data : u)));
      closeEditModal();
    } catch (err) {
      console.error('Błąd edycji usera:', err);
    }
  };

  // =================== 7. Blokowanie ===================
  const openBlockModal = user => {
    setUserToBlock(user);
    setIsBlockModalOpen(true);
  };
  const closeBlockModal = () => {
    setUserToBlock(null);
    setIsBlockModalOpen(false);
  };
  const confirmBlock = async () => {
    if (!userToBlock) return;
    try {
      const { data, error } = await supabase
        .from('App_Users')
        .update({ is_active: false })
        .eq('user_id', userToBlock.user_id)
        .select('*')
        .single();
      if (error) throw error;

      setUsers(prev => prev.map(u => (u.user_id === userToBlock.user_id ? data : u)));
      setFilteredUsers(prev => prev.map(u => (u.user_id === userToBlock.user_id ? data : u)));
    } catch (err) {
      console.error('Błąd blokowania usera:', err);
    } finally {
      closeBlockModal();
    }
  };

  // =================== RENDER ===================
  return (
    <div className="users-container">
      <Navbar />
      <div className="users-content">

        {/* 1/5: Dodawanie użytkownika */}
        <form onSubmit={handleAddUser} className="user-form">
          <h2>Dodaj użytkownika</h2>
          <input
            type="email"
            name="email"
            placeholder="Adres email"
            value={formData.email}
            onChange={handleFormChange}
            required
          />
          <input
            type="text"
            name="username"
            placeholder="Nazwa użytkownika"
            value={formData.username}
            onChange={handleFormChange}
            required
          />
          <input
            type="text"
            name="first_name"
            placeholder="Imię"
            value={formData.first_name}
            onChange={handleFormChange}
          />
          <input
            type="text"
            name="last_name"
            placeholder="Nazwisko"
            value={formData.last_name}
            onChange={handleFormChange}
          />
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleFormChange}
          >
            <option value="user">Zwykły użytkownik</option>
            <option value="admin">Administrator</option>
          </select>
          <label className="active-checkbox-label">
          Użytkownik aktywny
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
            />

          </label>
          <button type="submit" className="add-user-button">
            Dodaj
          </button>
        </form>

        {/* 1/5: Filtry i sortowanie */}
        <div className="users-filters">
          <h2>Filtry i sortowanie</h2>
          <input
            type="text"
            name="searchText"
            placeholder="Szukaj po imieniu, emailu..."
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />

          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="newest">Najnowsi</option>
            <option value="oldest">Najstarsi</option>
            <option value="alpha">Alfabetycznie (username)</option>
            <option value="byType">Typ konta (admin na górze)</option>
          </select>

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

        {/* 3/5: Lista userów */}
        <div className="users-list">
          <h2>Lista użytkowników</h2>
          {filteredUsers.map(user => (
            <div key={user.user_id} className="user-item">
              <div className="user-main-info">
                <div>
                  <span className="user-username">{user.username}</span>
                  <span className="user-email">({user.user_email})</span>
                </div>
                <span className={user.is_active ? 'active-status' : 'blocked-status'}>
                  {user.is_active ? 'Aktywny' : 'Zablokowany'}
                </span>
              </div>

              <div className="user-actions">
                <img
                  src="/edit-pen-icon.png"
                  alt="Edytuj"
                  title="Edytuj"
                  onClick={() => openEditModal(user)}
                  className="action-icon"
                />
                <img
                  src="/lock-icon.png"
                  alt="Zablokuj"
                  title="Zablokuj"
                  onClick={() => openBlockModal(user)}
                  className="action-icon"
                />
                <img
                  src="/eye-icon.png"
                  alt="Szczegóły"
                  title="Szczegóły"
                  onClick={() => toggleUserDetails(user.user_id)}
                  className="action-icon"
                />
                <img
                  src="/recycle-bin-line-icon.png"
                  alt="Usuń"
                  title="Usuń"
                  onClick={() => openDeleteModal(user)}
                  className="action-icon"
                />
              </div>

              <div className={`user-details ${expandedUserId === user.user_id ? 'expanded' : ''}`}>
                {expandedUserId === user.user_id && (
                  <div className="user-details-content">
                    <p>Imię: {user.first_name}</p>
                    <p>Nazwisko: {user.last_name}</p>
                    <p>Typ konta: {user.user_type}</p>
                    <p>Data utworzenia: {user.created_at}</p>
                    <p>Ostatnie logowanie: {user.last_login}</p>
                    <p>Konto aktywne: {user.is_active ? 'Tak' : 'Nie'}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Paginacja */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Poprzednia
            </button>
            <span>
              Strona {currentPage} z {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Następna
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Usuwanie */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć użytkownika?</h2>
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

      {/* Modal: Edycja */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj użytkownika</h2>

            <label>Email:</label>
            <input
              type="email"
              name="email"
              placeholder="Adres email"
              value={editFormData.email}
              onChange={handleEditFormChange}
            />

            <label>Nazwa użytkownika:</label>
            <input
              type="text"
              name="username"
              placeholder="Nazwa użytkownika"
              value={editFormData.username}
              onChange={handleEditFormChange}
            />

            <label>Imię:</label>
            <input
              type="text"
              name="first_name"
              placeholder="Imię"
              value={editFormData.first_name}
              onChange={handleEditFormChange}
            />

            <label>Nazwisko:</label>
            <input
              type="text"
              name="last_name"
              placeholder="Nazwisko"
              value={editFormData.last_name}
              onChange={handleEditFormChange}
            />

            <label>Typ konta:</label>
            <select
              name="user_type"
              value={editFormData.user_type}
              onChange={handleEditFormChange}
            >
              <option value="user">Zwykły użytkownik</option>
              <option value="admin">Administrator</option>
            </select>

            <label>Nowe hasło (opcjonalnie):</label>
            <input
              type="password"
              name="newPassword"
              placeholder="Zostaw puste, jeśli bez zmian"
              value={editFormData.newPassword}
              onChange={handleEditFormChange}
            />


            <div className="active-checkbox-label">
            <label>Konto aktywne:</label>
              <input
                type="checkbox"
                name="is_active"
                checked={editFormData.is_active}
                onChange={handleEditFormChange}
              />
            </div>

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

      {/* Modal: Blokowanie */}
      {isBlockModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz zablokować użytkownika?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="cancel-button" onClick={closeBlockModal}>Anuluj</button>
              <button
                className="delete-button"
                onClick={confirmBlock}
                style={{ marginLeft: '10px' }}
              >
                Zablokuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersAdminPage;
