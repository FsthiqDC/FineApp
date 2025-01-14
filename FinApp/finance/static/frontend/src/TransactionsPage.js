import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './TransactionsPage.css';
import axios from 'axios';

const TransactionsPage = () => {
  /* Stany przechowujące listy transakcji i kategorii */
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

  /* Filtry i sortowanie */
  const [filters, setFilters] = useState({
    categoryId: '',
    paymentMethod: '',
    transactionType: '',
    status: '',
    searchText: '',
    sortKey: '',
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

  /* ------------------------------------
     1. Pobieranie kategorii i transakcji 
     ------------------------------------ */
  useEffect(() => {
    const fetchCategoriesAndTransactions = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const [categoriesResponse, transactionsResponse] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/categories/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://127.0.0.1:8000/api/transactions/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        /* Mapowanie ID kategorii na nazwę, by w transakcjach móc wyświetlać bezpośrednio nazwy */
        const categoryMap = {};
        categoriesResponse.data.categories.forEach((cat) => {
          categoryMap[cat.category_id] = cat.category_name;
        });

        /* Łączenie danych o transakcji z nazwą kategorii */
        const enrichedTransactions = transactionsResponse.data.transactions.map((transaction) => ({
          ...transaction,
          category_name: categoryMap[transaction.transaction_category_id] || 'Brak kategorii',
        }));

        setCategories(categoriesResponse.data.categories || []);
        setTransactions(enrichedTransactions || []);
        setFilteredTransactions(enrichedTransactions || []);
      } catch (error) {
        console.error('Błąd podczas pobierania danych:', error);
      }
    };
    fetchCategoriesAndTransactions();
  }, []);

  /* ------------------------------------
     2. Filtrowanie i sortowanie
     ------------------------------------ */
  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = [...transactions];

      /* Filtrowanie */
      if (filters.categoryId) {
        filtered = filtered.filter(
          (t) => t.transaction_category_id === filters.categoryId
        );
      }
      if (filters.paymentMethod) {
        filtered = filtered.filter(
          (t) => t.transaction_payment_method === filters.paymentMethod
        );
      }
      if (filters.transactionType) {
        filtered = filtered.filter(
          (t) => t.transaction_type === filters.transactionType
        );
      }
      if (filters.status) {
        filtered = filtered.filter(
          (t) => t.transaction_status === filters.status
        );
      }
      if (filters.searchText) {
        filtered = filtered.filter((t) =>
          t.transaction_description
            .toLowerCase()
            .includes(filters.searchText.toLowerCase())
        );
      }

      /* Sortowanie - wg najmniejszych / największych kwot oraz najstarszych / najmłodszych dat */
      switch (filters.sortKey) {
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
          /* Brak sortowania */
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
        /* Tworzymy obiekt nowej transakcji - 
           w zależności od tego, co faktycznie zwraca backend, 
           trzeba uzupełnić odpowiednie pola */
        const newTransaction = {
          /* Przy założeniu, że backend zwraca np. response.data.transaction */
          ...response.data.transaction,
          transaction_id: response.data.transaction_id,
          transaction_amount: formData.amount,
          transaction_category_id: formData.categoryId,
          transaction_payment_method: formData.paymentMethod,
          transaction_type: formData.transactionType,
          transcation_data: formData.date,
          transaction_description: formData.description,
          transaction_status: formData.status,
          transaction_currency: formData.currency,
          category_name:
            categories.find(
              (cat) => cat.category_id === formData.categoryId
            )?.category_name || 'Brak kategorii',
        };

        setTransactions((prev) => [...prev, newTransaction]);
        setFilteredTransactions((prev) => [...prev, newTransaction]);

        /* Czyszczenie formularza */
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
      /* Po udanym usunięciu - aktualizujemy stan */
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

      /* Wysyłamy PUT lub PATCH w zależności od implementacji backendu */
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

      /* Po udanym update - aktualizujemy transakcję w stanie */
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
          <input
            type="text"
            name="searchText"
            placeholder="Szukaj..."
            value={filters.searchText}
            onChange={(e) =>
              setFilters({ ...filters, [e.target.name]: e.target.value })
            }
          />
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
        </div>

        {/* Sekcja: Lista Transakcji */}
        <div className="transactions-list">
          <h2>Lista transakcji</h2>
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
                  onClick={() => openEditModal(transaction)}
                  className="action-icon"
                />
                <img
                  src="eye-icon.png"
                  alt="Szczegóły"
                  onClick={() =>
                    toggleTransactionDetails(transaction.transaction_id)
                  }
                  className="action-icon"
                />
                <img
                  src="recycle-bin-line-icon.png"
                  alt="Usuń"
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
        </div>
      </div>

      {/* Modal: USUWANIE */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć transakcję?</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={closeDeleteModal}>Anuluj</button>
              <button onClick={confirmDelete} style={{ marginLeft: '10px' }}>
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
              <button onClick={closeEditModal}>Anuluj</button>
              <button onClick={confirmEdit} style={{ marginLeft: '10px' }}>
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
