import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './TransactionsPage.css';
import { supabase } from './supabaseClient';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    paymentMethod: '',
    date: '',
    description: '',
    status: '',
    currency: 'PLN',
  });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error) setUserId(user?.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('Categories').select('category_id, category_name');
      if (!error) setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    await supabase.from('Transactions').insert([
      { ...formData, transaction_owner: userId }
    ]);
  };

  return (
    <div className="transactions-container">
      <Navbar />
      <h2>➕ Dodaj Transakcję</h2>
      <form onSubmit={handleAddTransaction} className="transaction-form">
        <input type="number" name="amount" placeholder="Kwota" onChange={handleChange} required />
        <select name="categoryId" onChange={handleChange} required>
          <option value="">Wybierz kategorię</option>
          {categories.map(cat => (
            <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
          ))}
        </select>
        <input type="date" name="date" onChange={handleChange} required />
        <textarea name="description" placeholder="Opis transakcji" onChange={handleChange} />
        <button type="submit">Dodaj Transakcję</button>
      </form>
    </div>
  );
};

export default TransactionsPage;
