import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './TransactionsPage.css';
import axios from 'axios';

const TransactionsPage = () => {
  /* ========== STANY ========== */
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  /* Formularz do dodawania nowej transakcji */
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    paymentMethod: 'Karta',
    transactionType: 'Wydatek',
    status: 'Ukończona',
    date: '',
    description: '',
    currency: 'PLN',
  });

  /* Filtry i sortowanie (lokalne), + filtr "month" (serwerowy) */
  const [filters, setFilters] = useState({
    categoryId: '',
    paymentMethod: '',
    transactionType: '',
    status: '',
    searchText: '',
    sortKey: 'newest',
    month: '', // <-- Dodane pole do filtrowania po miesiącu
  });

  const [filteredTransactions, setFilteredTransactions] = useState([]);

  /* Modal EDYCJI */
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    categoryId: '',
    paymentMethod: 'Karta',
    transactionType: 'Wydatek',
    status: 'Ukończona',
    date: '',
    description: '',
    currency: 'PLN',
  });

  /* Modal USUWANIA */
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  /* Stan do rozwijania / zwijania szczegółów transakcji */
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  /* ========== PAGINACJA ========== */
  const [currentPage, setCurrentPage] = useState(1); // aktualna strona
  const [totalPages, setTotalPages] = useState(1);   // łączna liczba stron
  const perPage = 10;                                // ilość transakcji na stronę (możesz dostosować)

  /* ------------------------------------
     1. Pobieranie kategorii i transakcji (z uwzgl. paginacji i filtra month)
     ------------------------------------ */
  const fetchCategoriesAndTransactions = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Wyciągamy wartości z filters, które mają być przekazywane do serwera
      const { month } = filters;

      // Parametry zapytania GET do pobrania transakcji
      // page – bieżąca strona
      // per_page – ile wyników na stronę
      // month – jeśli ustawione, np. "2023-12"
      const transactionsParams = {
        page: currentPage,
        per_page: perPage,
      };
      if (month) {
        transactionsParams.month = month;
      }

      const [categoriesResponse, transactionsResponse] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/categories/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://127.0.0.1:8000/api/transactions/', {
          headers: { Authorization: `Bearer ${token}` },
          params: transactionsParams,
        }),
      ]);

      /* Mapowanie ID kategorii na nazwę, by w transakcjach móc wyświetlać bezpośrednio nazwy */
      const categoryMap = {};
      categoriesResponse.data.categories.forEach((cat) => {
        categoryMap[cat.category_id] = cat.category_name;
      });

      /* Zakładamy, że backend zwraca w transactionsResponse.data:
         {
           transactions: [...],
           total_pages: X,
           current_page: Y
         }
      */
      const backendTransactions = transactionsResponse.data.transactions || [];
      const enrichedTransactions = backendTransactions.map((transaction) => ({
        ...transaction,
        category_name:
          categoryMap[transaction.transaction_category_id] || 'Brak kategorii',
      }));

      setCategories(categoriesResponse.data.categories || []);
      setTransactions(enrichedTransactions);

      // Ustawienie paginacji na podstawie wartości z serwera
      setTotalPages(transactionsResponse.data.total_pages || 1);
      setCurrentPage(transactionsResponse.data.current_page || 1);

      // Na starcie, po pobraniu, od razu ustawiamy filteredTransactions na pełny zestaw
      setFilteredTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Błąd podczas pobierania danych:', error);
    }
  };

  // Pobieramy dane za każdym razem, gdy zmieni się currentPage lub filters.month.
  useEffect(() => {
    fetchCategoriesAndTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.month]);

  /* ------------------------------------
     2. Filtrowanie (lokalne) i sortowanie
     ------------------------------------ */
  useEffect(() => {
    // Filtr "month" został przeniesiony na serwer, więc tutaj go nie obejmujemy.
    // Cała reszta filtrów dalej działa lokalnie na liście transactions.

    const applyFiltersAndSort = () => {
      let filtered = [...transactions];

      const {
        categoryId,
        paymentMethod,
        transactionType,
        status,
        searchText,
        sortKey,
      } = filters;

      // Filtrowanie
      if (categoryId) {
        filtered = filtered.filter(
          (t) => t.transaction_category_id === categoryId
        );
      }
      if (paymentMethod) {
        filtered = filtered.filter(
          (t) => t.transaction_payment_method === paymentMethod
        );
      }
      if (transactionType) {
        filtered = filtered.filter(
          (t) => t.transaction_type === transactionType
        );
      }
      if (status) {
        filtered = filtered.filter(
          (t) => t.transaction_status === status
        );
      }
      if (searchText) {
        filtered = filtered.filter((t) =>
          t.transaction_description
            .toLowerCase()
            .includes(searchText.toLowerCase())
        );
      }

      // Sortowanie - wg kwot i dat
      switch (sortKey) {
        case 'lowest':
          filtered.sort((a, b) => a.transaction_amount - b.transaction_amount);
          break;
        case 'highest':
          filtered.sort((a, b) => b.transaction_amount - a.transaction_amount);
          break;
        case 'oldest':
          filtered.sort(
            (a, b) =>
              new Date(a.transcation_data).getTime() -
              new Date(b.transcation_data).getTime()
          );
          break;
        case 'newest':
          filtered.sort(
            (a, b) =>
              new Date(b.transcation_data).getTime() -
              new Date(a.transcation_data).getTime()
          );
          break;
        default:
          // Brak sortowania
          break;
      }

      setFilteredTransactions(filtered);
    };

    applyFiltersAndSort();
  }, [filters, transactions]);

  /* ------------------------------------
     3. Dodawanie nowej transakcji
     ------------------------------------ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        'http://127.0.0.1:8000/api/transactions/',
        { ...formData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        /* Załóżmy, że backend zwraca w polu `transaction` nowo utworzony obiekt
           i dodatkowe pole `transaction_id` (jak w kodzie Django). */
        const newBackendTrans = response.data.transaction;
        const newTransaction = {
          // Łączymy dane z backendu i to co mamy w formData
          ...newBackendTrans,
          transaction_id: response.data.transaction_id,
          category_name:
            categories.find(
              (cat) => cat.category_id === formData.categoryId
            )?.category_name || 'Brak kategorii',
        };

        // Dodajemy nową transakcję do stanu
        setTransactions((prev) => [...prev, newTransaction]);
        setFilteredTransactions((prev) => [...prev, newTransaction]);

        // Reset formularza
        setFormData({
          amount: '',
          categoryId: '',
          paymentMethod: 'Karta',
          transactionType: 'Wydatek',
          status: 'Ukończona',
          date: '',
          description: '',
          currency: 'PLN',
        });
      }
    } catch (error) {
      console.error('Błąd podczas dodawania transakcji:', error);
    }
  };

  /* ------------------------------------
     4. Rozwijanie szczegółów transakcji
     ------------------------------------ */
  const toggleTransactionDetails = (id) => {
    setExpandedTransactionId((prevId) => (prevId === id ? null : id));
  };

  /* ------------------------------------
     5. Usuwanie transakcji
     ------------------------------------ */
  const openDeleteModal = (transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setTransactionToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `http://127.0.0.1:8000/api/transactions/${transactionToDelete.transaction_id}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Usuwamy z lokalnego stanu
      setTransactions((prev) =>
        prev.filter((t) => t.transaction_id !== transactionToDelete.transaction_id)
      );
      setFilteredTransactions((prev) =>
        prev.filter((t) => t.transaction_id !== transactionToDelete.transaction_id)
      );
    } catch (error) {
      console.error('Błąd podczas usuwania transakcji:', error);
    } finally {
      closeDeleteModal();
    }
  };

  /* ------------------------------------
     6. Edycja transakcji
     ------------------------------------ */
  const openEditModal = (transaction) => {
    setTransactionToEdit(transaction);
    setEditFormData({
      amount: transaction.transaction_amount,
      categoryId: transaction.transaction_category_id,
      paymentMethod: transaction.transaction_payment_method,
      transactionType: transaction.transaction_type,
      status: transaction.transaction_status,
      date: transaction.transcation_data,
      description: transaction.transaction_description,
      currency: transaction.transaction_currency,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setTransactionToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const confirmEdit = async () => {
    if (!transactionToEdit) return;
    try {
      const token = localStorage.getItem('authToken');
      const updatedData = {
        amount: editFormData.amount,
        categoryId: editFormData.categoryId,
        paymentMethod: editFormData.paymentMethod,
        transactionType: editFormData.transactionType,
        status: editFormData.status,
        date: editFormData.date,
        description: editFormData.description,
        currency: editFormData.currency,
      };

      await axios.put(
        `http://127.0.0.1:8000/api/transactions/${transactionToEdit.transaction_id}/`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Aktualizacja w stanie
      setTransactions((prev) =>
        prev.map((t) =>
          t.transaction_id === transactionToEdit.transaction_id
            ? {
                ...t,
                transaction_amount: updatedData.amount,
                transaction_category_id: updatedData.categoryId,
                transaction_payment_method: updatedData.paymentMethod,
                transaction_type: updatedData.transactionType,
                transaction_status: updatedData.status,
                transcation_data: updatedData.date,
                transaction_description: updatedData.description,
                transaction_currency: updatedData.currency,
                category_name:
                  categories.find((cat) => cat.category_id === updatedData.categoryId)
                    ?.category_name || 'Brak kategorii',
              }
            : t
        )
      );

      closeEditModal();
    } catch (error) {
      console.error('Błąd podczas edycji transakcji:', error);
    }
  };

  /* ------------------------------------
     7. Renderowanie komponentu
     ------------------------------------ */
  return (
    <div className="transactions-container">
      <Navbar />
      <div className="transactions-content">
        {/* Sekcja: Dodaj Transakcję */}
        <form onSubmit={handleAddTransaction} className="transaction-form">
          <h2>Dodaj transakcję</h2>
          <input
            type="number"
            name="amount"
            placeholder="Kwota"
            value={formData.amount}
            onChange={handleChange}
            required
          />
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            required
          >
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            required
          >
            <option value="Karta">Karta</option>
            <option value="Gotówka">Gotówka</option>
            <option value="Przelew">Przelew</option>
          </select>
          <select
            name="transactionType"
            value={formData.transactionType}
            onChange={handleChange}
            required
          >
            <option value="Wydatek">Wydatek</option>
            <option value="Przychód">Przychód</option>
          </select>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="Opis transakcji"
            value={formData.description}
            onChange={handleChange}
          />
          <button type="submit" className="add-transaction-button">
            Dodaj
          </button>
        </form>

        {/* Sekcja: Filtry */}
        <div className="filters">
          <h2>Filtry i sortowanie</h2>

          {/* Szukaj po opisie */}
          <input
            type="text"
            name="searchText"
            placeholder="Szukaj..."
            value={filters.searchText}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          />

          {/* Filtrowanie po kategorii */}
          <select
            name="categoryId"
            value={filters.categoryId}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          >
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>

          {/* Filtrowanie po typie transakcji */}
          <select
            name="transactionType"
            value={filters.transactionType}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          >
            <option value="">Wybierz typ</option>
            <option value="Wydatek">Wydatek</option>
            <option value="Przychód">Przychód</option>
          </select>

          {/* Sortowanie */}
          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          >
            <option value="">Sortuj według...</option>
            <option value="lowest">Najmniejsza kwota</option>
            <option value="highest">Największa kwota</option>
            <option value="oldest">Najstarsze transakcje</option>
            <option value="newest">Najnowsze transakcje</option>
          </select>

          {/* Filtrowanie po miesiącu (YYYY-MM) - wysyłane do backendu */}
          <input
            type="month"
            name="month"
            value={filters.month}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          />
        </div>

        {/* Sekcja: Lista Transakcji */}
        <div className="transactions-list">
          <h2>Twoje transakcje</h2>
          {filteredTransactions.map((transaction) => (
            <div key={transaction.transaction_id} className="transaction-item">
              <div className="transaction-left">
                <span>{transaction.transcation_data}</span>
                <span>{transaction.category_name}</span>
                <span
                  className={`transaction-amount ${
                    transaction.transaction_type === 'Wydatek'
                      ? 'expense'
                      : 'income'
                  }`}
                >
                  {transaction.transaction_type === 'Wydatek' ? '-' : '+'}
                  {transaction.transaction_amount} {transaction.transaction_currency}
                </span>
              </div>
              <div className="transaction-actions">
                <img
                  src="edit-pen-icon.png"
                  alt="Edytuj"
                  title='Edytuj'
                  onClick={() => openEditModal(transaction)}
                  className="action-icon"
                />
                <img
                  src="eye-icon.png"
                  alt="Szczegóły"
                  title='Zobacz szczegóły'
                  onClick={() =>
                    toggleTransactionDetails(transaction.transaction_id)
                  }
                  className="action-icon"
                />
                <img
                  src="recycle-bin-line-icon.png"
                  alt="Usuń"
                  title='Usuń'
                  onClick={() => openDeleteModal(transaction)}
                  className="action-icon"
                />
              </div>
              {expandedTransactionId === transaction.transaction_id && (
                <div className="transaction-details">
                  <p>Metoda płatności: {transaction.transaction_payment_method}</p>
                  <p>Typ transakcji: {transaction.transaction_type}</p>
                  <p>Opis transakcji: {transaction.transaction_description}</p>
                  <p>Status: {transaction.transaction_status}</p>
                </div>
              )}
            </div>
          ))}

          {/* PAGINACJA – proste przyciski poprzednia/następna strona */}
          <div className="pagination">
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Następna
            </button>
          </div>
        </div>
      </div>

      {/* Modal: USUWANIE */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć transakcję?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button class="cancel-button" onClick={closeDeleteModal}>Anuluj</button>
              <button class="delete-button" onClick={confirmDelete} style={{ marginLeft: '10px' }}>
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: EDYCJA */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj transakcję</h2>
            <input
              type="number"
              name="amount"
              value={editFormData.amount}
              onChange={handleEditFormChange}
              placeholder="Kwota"
              required
            />
            <select
              name="categoryId"
              value={editFormData.categoryId}
              onChange={handleEditFormChange}
              required
            >
              <option value="">Wybierz kategorię</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
            <select
              name="paymentMethod"
              value={editFormData.paymentMethod}
              onChange={handleEditFormChange}
              required
            >
              <option value="Karta">Karta</option>
              <option value="Gotówka">Gotówka</option>
              <option value="Przelew">Przelew</option>
            </select>
            <select
              name="transactionType"
              value={editFormData.transactionType}
              onChange={handleEditFormChange}
              required
            >
              <option value="Wydatek">Wydatek</option>
              <option value="Przychód">Przychód</option>
            </select>
            <input
              type="date"
              name="date"
              value={editFormData.date}
              onChange={handleEditFormChange}
              required
            />
            <textarea
              name="description"
              placeholder="Opis transakcji"
              value={editFormData.description}
              onChange={handleEditFormChange}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button class="cancel-button" onClick={closeEditModal}>Anuluj</button>
              <button class="save-button" onClick={confirmEdit} style={{ marginLeft: '10px' }}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
