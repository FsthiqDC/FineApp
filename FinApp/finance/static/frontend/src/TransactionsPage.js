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
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/categories/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (response.status === 200) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error('❌ Błąd podczas pobierania kategorii:', error);
        setMessage('Wystąpił błąd podczas pobierania kategorii.');
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/transactions/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (response.status === 200) {
          const transactionsData = response.data.transactions || [];
          if (transactionsData.length === 0) {
            setMessage('Brak transakcji. Wprowadź swoją pierwszą transakcję.');
          } else {
            setTransactions(transactionsData);
            setMessage('');
          }
        }
      } catch (error) {
        console.error('❌ Błąd podczas pobierania transakcji:', error);
        setMessage('Wystąpił błąd podczas pobierania transakcji.');
      }
    };

    fetchTransactions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setMessage('');
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
        setMessage('✅ Transakcja została dodana.');
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
        setTransactions((prev) => [...prev, response.data.transaction]);
      }
    } catch (error) {
      console.error('❌ Błąd podczas dodawania transakcji:', error);
      setMessage('❌ Wystąpił błąd podczas dodawania transakcji.');
    }
  };

  return (
    <div className="transactions-container">
      <Navbar />
      <form onSubmit={handleAddTransaction} className="transaction-form">
        <div className="form-row">
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
        </div>
        <div className="form-row">
          <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
            <option value="Karta">Karta</option>
            <option value="Gotówka">Gotówka</option>
            <option value="Przelew">Przelew</option>
          </select>
          <select name="transactionType" value={formData.transactionType} onChange={handleChange} required>
            <option value="Wydatek">Wydatek</option>
            <option value="Przychód">Przychód</option>
          </select>
        </div>
        <div className="form-row">
          <select name="status" value={formData.status} onChange={handleChange} required>
            <option value="Zrealizowana">Zrealizowana</option>
            <option value="Do zrealizowania">Do zrealizowania</option>
          </select>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        <textarea
          name="description"
          placeholder="Opis transakcji"
          value={formData.description}
          onChange={handleChange}
        />
        <button type="submit" className="add-transaction-button">Dodaj</button>
      </form>

      <h2>Twoje Transakcje</h2>
      {message && <p className="message">{message}</p>}

      <ul className="transaction-list">
        {transactions.map((transaction) => (
          <li key={transaction.transaction_id} className="transaction-item">
            <p>Kwota: {transaction.transaction_amount}</p>
            <p>Kategoria: {transaction.transaction_category_id}</p>
            <p>Metoda Płatności: {transaction.transaction_payment_method}</p>
            <p>Typ: {transaction.transaction_type}</p>
            <p>Status: {transaction.transaction_status}</p>
            <p>Data: {transaction.transcation_data}</p>
            <p>Opis: {transaction.transaction_description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransactionsPage;
