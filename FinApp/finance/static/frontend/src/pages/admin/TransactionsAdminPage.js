// src/pages/admin/TransactionsAdminPage.js

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import './TransactionsAdminPage.css';
import { supabase } from '../../supabaseClient';

const TransactionsAdminPage = () => {
  // Lista wszystkich transakcji
  const [transactions, setTransactions] = useState([]);

  // Filtry
  const [filters, setFilters] = useState({
    searchEmail: '',
    transactionType: '',
    sortKey: 'newest',
    dateFrom: '',
    dateTo: '',
  });

  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Paginacja
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // Rozwijanie szczegółów
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  // Modal Edycji
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    transaction_amount: '',
    transaction_type: 'Wydatek',
    transcation_data: '',
    transaction_description: '',
    transaction_currency: 'PLN',
  });

  // Modal Usuwania
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  /* ==================== 1. Pobieranie transakcji (Supabase) ==================== */
  const fetchTransactions = async () => {
    try {
      // Obliczamy offset
      const offset = (currentPage - 1) * perPage;

      // Pobieramy transakcje + dane właściciela (email, username)
      const { data, error, count } = await supabase
        .from('Transactions')
        .select(`*, owner:transaction_owner(user_email, username)`, { count: 'exact' })
        .order('transcation_data', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) throw error;

      setTransactions(data || []);
      if (count) {
        setTotalPages(Math.ceil(count / perPage));
      }
      setFilteredTransactions(data || []);
    } catch (err) {
      console.error('Błąd pobierania transakcji (admin):', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage]);

  /* ==================== 2. Filtrowanie / Sortowanie Lokalnie ==================== */
  useEffect(() => {
    let arr = [...transactions];
    const { searchEmail, transactionType, sortKey, dateFrom, dateTo } = filters;

    // Filtr po emailu
    if (searchEmail) {
      const search = searchEmail.toLowerCase();
      arr = arr.filter(t => {
        const email = (t.owner?.user_email || '').toLowerCase();
        return email.includes(search);
      });
    }
    // Filtr po typie transakcji
    if (transactionType) {
      arr = arr.filter(t => t.transaction_type === transactionType);
    }
    // Filtr dat (od–do)
    if (dateFrom) {
      arr = arr.filter(t => t.transcation_data >= dateFrom);
    }
    if (dateTo) {
      arr = arr.filter(t => t.transcation_data <= dateTo);
    }

    // Sort
    switch (sortKey) {
      case 'newest':
        arr.sort((a, b) =>
          new Date(b.transcation_data).getTime() - new Date(a.transcation_data).getTime()
        );
        break;
      case 'oldest':
        arr.sort((a, b) =>
          new Date(a.transcation_data).getTime() - new Date(b.transcation_data).getTime()
        );
        break;
      case 'highest':
        arr.sort((a, b) => b.transaction_amount - a.transaction_amount);
        break;
      case 'lowest':
        arr.sort((a, b) => a.transaction_amount - b.transaction_amount);
        break;
      default:
        break;
    }

    setFilteredTransactions(arr);
  }, [transactions, filters]);

  /* ==================== 3. Rozwijanie Szczegółów ==================== */
  const toggleTransactionDetails = (id) => {
    setExpandedTransactionId(prev => (prev === id ? null : id));
  };

  /* ==================== 4. Edycja Transakcji ==================== */
  const openEditModal = (tx) => {
    setTransactionToEdit(tx);
    setEditFormData({
      transaction_amount: tx.transaction_amount,
      transaction_type: tx.transaction_type,
      transcation_data: tx.transcation_data,
      transaction_description: tx.transaction_description || '',
      transaction_currency: tx.transaction_currency || 'PLN',
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setTransactionToEdit(null);
    setIsEditModalOpen(false);
  };
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  const confirmEdit = async () => {
    if (!transactionToEdit) return;
    try {
      const { error, data } = await supabase
        .from('Transactions')
        .update({
          transaction_amount: Number(editFormData.transaction_amount),
          transaction_type: editFormData.transaction_type,
          transcation_data: editFormData.transcation_data,
          transaction_description: editFormData.transaction_description,
          transaction_currency: editFormData.transaction_currency,
        })
        .eq('transaction_id', transactionToEdit.transaction_id)
        .select('*')
        .single();

      if (error) throw error;

      // Aktualizacja w stanie
      setTransactions(prev =>
        prev.map(t => t.transaction_id === transactionToEdit.transaction_id ? data : t)
      );
      setFilteredTransactions(prev =>
        prev.map(t => t.transaction_id === transactionToEdit.transaction_id ? data : t)
      );
    } catch (err) {
      console.error('Błąd edycji transakcji (admin):', err);
    } finally {
      closeEditModal();
    }
  };

  /* ==================== 5. Usuwanie Transakcji ==================== */
  const openDeleteModal = (tx) => {
    setTransactionToDelete(tx);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setTransactionToDelete(null);
    setIsDeleteModalOpen(false);
  };
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const { error } = await supabase
        .from('Transactions')
        .delete()
        .eq('transaction_id', transactionToDelete.transaction_id);

      if (error) throw error;

      // Usuwamy z local state
      setTransactions(prev =>
        prev.filter(t => t.transaction_id !== transactionToDelete.transaction_id)
      );
      setFilteredTransactions(prev =>
        prev.filter(t => t.transaction_id !== transactionToDelete.transaction_id)
      );
    } catch (err) {
      console.error('Błąd usuwania transakcji (admin):', err);
    } finally {
      closeDeleteModal();
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <div className="transactions-admin-container">
      <Navbar />
      <div className="transactions-admin-content">
        {/* LEWA KOLUMNA: filtry (2/5) */}
        <div className="admin-filters">
          <h2>Filtry oraz sortowanie</h2>

          {/* Email użytkownika */}
          <input
            type="text"
            name="searchEmail"
            placeholder="Szukaj po emailu użytkownika..."
            value={filters.searchEmail}
            onChange={e => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />

          {/* Typ transakcji */}
          <select
            name="transactionType"
            value={filters.transactionType}
            onChange={e => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="">Wybierz typ</option>
            <option value="Wydatek">Wydatek</option>
            <option value="Przychód">Przychód</option>
          </select>

          {/* Date range */}
          <label>Data od:</label>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={e => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />

          <label>Data do:</label>
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={e => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />

          {/* Sortowanie */}
          <label>Sortuj:</label>
          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={e => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="highest">Największa kwota</option>
            <option value="lowest">Najmniejsza kwota</option>
          </select>

          {/* Ile wyników na stronę */}
          <label>Na stronę:</label>
          <select
            name="perPage"
            value={perPage}
            onChange={e => {
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

        {/* PRAWA KOLUMNA: lista (3/5) */}
        <div className="admin-transactions-list">
          <h2>Transakcje wszystkich użytkowników</h2>
          {filteredTransactions.map(tx => (
            <div key={tx.transaction_id} className="admin-transaction-item">
              <div className="admin-transaction-header">
                {/* Data transakcji + kwota */}
                <span>{tx.transcation_data}</span>
                <span
                  className={
                    tx.transaction_type === 'Wydatek' ? 'tx-amount expense' : 'tx-amount income'
                  }
                >
                  {tx.transaction_type === 'Wydatek' ? '-' : '+'}
                  {tx.transaction_amount} {tx.transaction_currency || 'PLN'}
                </span>
              </div>
              <div className="admin-transaction-subheader">
                <span>Użytkownik: {tx.owner?.username || '??'} ({tx.owner?.user_email || '??'})</span>
              </div>

              <div className="admin-transaction-actions">
                {/* Edycja */}
                <img
                  src="/edit-pen-icon.png"
                  alt="Edytuj"
                  title="Edytuj"
                  onClick={() => openEditModal(tx)}
                  className="action-icon"
                />
                {/* Szczegóły */}
                <img
                  src="/eye-icon.png"
                  alt="Szczegóły"
                  title="Szczegóły"
                  onClick={() => toggleTransactionDetails(tx.transaction_id)}
                  className="action-icon"
                />
                {/* Usunięcie */}
                <img
                  src="/recycle-bin-line-icon.png"
                  alt="Usuń"
                  title="Usuń"
                  onClick={() => openDeleteModal(tx)}
                  className="action-icon"
                />
              </div>

              {/* Rozwijane szczegóły */}
              {expandedTransactionId === tx.transaction_id && (
                <div className="admin-transaction-details">
                  <p>Typ: {tx.transaction_type}</p>
                  <p>Opis: {tx.transaction_description || 'Brak opisu'}</p>
                  {/* Jeśli chcesz więcej pól, dodaj je tutaj */}
                </div>
              )}
            </div>
          ))}

          {/* PAGINACJA */}
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

      {/* MODAL EDYCJI */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj transakcję</h2>

            <label>Kwota:</label>
            <input
              type="number"
              name="transaction_amount"
              value={editFormData.transaction_amount}
              onChange={handleEditInputChange}
              required
            />

            <label>Typ transakcji:</label>
            <select
              name="transaction_type"
              value={editFormData.transaction_type}
              onChange={handleEditInputChange}
              required
            >
              <option value="Wydatek">Wydatek</option>
              <option value="Przychód">Przychód</option>
            </select>

            <label>Data transakcji:</label>
            <input
              type="date"
              name="transcation_data"
              value={editFormData.transcation_data}
              onChange={handleEditInputChange}
              required
            />

            <label>Opis transakcji:</label>
            <textarea
              name="transaction_description"
              value={editFormData.transaction_description}
              onChange={handleEditInputChange}
            />

            <label>Waluta:</label>
            <input
              type="text"
              name="transaction_currency"
              value={editFormData.transaction_currency}
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
            <h2>Czy na pewno chcesz usunąć transakcję?</h2>
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

export default TransactionsAdminPage;
