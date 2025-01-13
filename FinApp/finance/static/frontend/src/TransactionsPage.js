import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './TransactionsPage.css';
import axios from 'axios';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [filters, setFilters] = useState({
    categoryId: '',
    paymentMethod: '',
    transactionType: '',
    status: '',
    searchText: '',
    sortKey: '',
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

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
        const categoryMap = {};
        categoriesResponse.data.categories.forEach((cat) => {
          categoryMap[cat.category_id] = cat.category_name;
        });
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

  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = transactions;

      if (filters.categoryId) {
        filtered = filtered.filter((t) => t.transaction_category_id === filters.categoryId);
      }
      if (filters.paymentMethod) {
        filtered = filtered.filter((t) => t.transaction_payment_method === filters.paymentMethod);
      }
      if (filters.transactionType) {
        filtered = filtered.filter((t) => t.transaction_type === filters.transactionType);
      }
      if (filters.status) {
        filtered = filtered.filter((t) => t.transaction_status === filters.status);
      }
      if (filters.searchText) {
        filtered = filtered.filter((t) =>
          t.transaction_description.toLowerCase().includes(filters.searchText.toLowerCase())
        );
      }

      if (filters.sortKey === 'date') {
        filtered.sort((a, b) => new Date(a.transcation_data) - new Date(b.transcation_data));
      } else if (filters.sortKey === 'amount') {
        filtered.sort((a, b) => a.transaction_amount - b.transaction_amount);
      }

      setFilteredTransactions(filtered);
    };

    applyFiltersAndSort();
  }, [filters, transactions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
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
        const newTransaction = {
          ...response.data.transaction,
          category_name:
            categories.find((cat) => cat.category_id === response.data.transaction.transaction_category_id)?.category_name || 'Brak kategorii',
        };
        setTransactions((prev) => [...prev, newTransaction]);
        setFilteredTransactions((prev) => [...prev, newTransaction]);
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

  const toggleTransactionDetails = (id) => {
    setExpandedTransactionId((prevId) => (prevId === id ? null : id));
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions((prev) => prev.filter((t) => t.transaction_id !== id));
      setFilteredTransactions((prev) => prev.filter((t) => t.transaction_id !== id));
    } catch (error) {
      console.error('Błąd podczas usuwania transakcji:', error);
    }
  };

  return (
    <div className="transactions-container">
      <Navbar />
      <div className="transactions-content">
        {/* Dodaj Transakcję */}
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
          <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
          <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
            <option value="Karta">Karta</option>
            <option value="Gotówka">Gotówka</option>
            <option value="Przelew">Przelew</option>
          </select>
          <select name="transactionType" value={formData.transactionType} onChange={handleChange} required>
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
          ></textarea>
          <button type="submit" className="add-transaction-button">Dodaj</button>
        </form>

        {/* Filtry */}
        <div className="filters">
          <h2>Filtry i sortowanie</h2>
          <input
            type="text"
            name="searchText"
            placeholder="Szukaj..."
            value={filters.searchText}
            onChange={handleFilterChange}
          />
          <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange}>
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
          <select name="transactionType" value={filters.transactionType} onChange={handleFilterChange}>
            <option value="">Wybierz typ</option>
            <option value="Wydatek">Wydatek</option>
            <option value="Przychód">Przychód</option>
          </select>
          <select name="sortKey" value={filters.sortKey} onChange={handleFilterChange}>
            <option value="">Sortuj według</option>
            <option value="date">Data</option>
            <option value="amount">Kwota</option>
          </select>
        </div>

        {/* Lista Transakcji */}
        <div className="transactions-list">
        <h2>Lista transakcji</h2>
          {filteredTransactions.map((transaction) => (
            <div key={transaction.transaction_id} className="transaction-item">
              <div className="transaction-left">
              <span
                  className={`transaction-amount ${
                    transaction.transaction_type === 'Wydatek' ? 'expense' : 'income'
                  }`}
                >
                  {transaction.transaction_type === 'Wydatek' ? '-' : '+'}
                  {transaction.transaction_amount} PLN
                </span>
                <span>{transaction.transcation_data}</span>
                <span>{transaction.category_name}</span>
              </div>
              <div className="transaction-actions">
                <img
                  src="edit-pen-icon.png"
                  alt="Edytuj"
                  onClick={() => toggleTransactionDetails(transaction.transaction_id)}
                  className="action-icon"
                />
                <img
                  src="eye-icon.png"
                  alt="Szczegóły"
                  onClick={() => toggleTransactionDetails(transaction.transaction_id)}
                  className="action-icon"
                />
                <img
                  src="recycle-bin-line-icon.png"
                  alt="Usuń"
                  onClick={() => handleDeleteTransaction(transaction.transaction_id)}
                  className="action-icon"
                />
              </div>
              {expandedTransactionId === transaction.transaction_id && (
                <div className="transaction-details">
                  <p>Metoda płatności: {transaction.transaction_payment_method}</p>
                  <p>Typ transakcji: {transaction.transaction_type}</p>
                  <p>Opis transakcji: {transaction.transaction_description}</p>
                  <p>Status: {transaction.transaction_status}</p>
                  <p>Waluta: {transaction.transaction_currency}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
