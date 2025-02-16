import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../supabaseClient';
import './CategoriesAdminPage.css';

const CategoriesAdminPage = () => {
  /* ---------------- STANY ---------------- */
  // 1) Surowe dane (wszystkie kategorie pobrane z bazy)
  const [categories, setCategories] = useState([]);

  // 2) Formularz do dodawania kategorii
  const [formData, setFormData] = useState({
    category_name: '',
    category_description: '',
  });

  // 3) Filtry i sortowanie
  const [filters, setFilters] = useState({
    searchText: '',
    sortKey: 'nameAsc', // np. nameAsc / nameDesc
  });
  const [filteredCategories, setFilteredCategories] = useState([]); // wynik filtra

  // 4) Paginacja (lokalna)
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // 5) Rozwijanie szczegółów
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // 6) Modal – Edycja
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    category_name: '',
    category_description: '',
  });

  // 7) Modal – Usuwanie
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  /* =================================================================
     1. POBIERANIE KATEGORII (RAZ) – potem wszystko robimy lokalnie
  ================================================================== */
  const fetchAllCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('Categories')
        .select('*')
        .order('category_name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Błąd pobierania kategorii:', err);
    }
  };

  useEffect(() => {
    // Pobieramy raz – całą tabelę
    fetchAllCategories();
  }, []);

  /* =================================================================
     2. FILTROWANIE I SORTOWANIE (lokalne)
  ================================================================== */
  useEffect(() => {
    let arr = [...categories];
    const { searchText, sortKey } = filters;

    // a) Filtr
    if (searchText) {
      const s = searchText.toLowerCase();
      arr = arr.filter(cat => {
        const combined = `${cat.category_name} ${cat.category_description}`.toLowerCase();
        return combined.includes(s);
      });
    }

    // b) Sort
    switch (sortKey) {
      case 'nameAsc':
        arr.sort((a, b) =>
          (a.category_name || '').localeCompare(b.category_name || '', 'pl', { sensitivity: 'base' })
        );
        break;
      case 'nameDesc':
        arr.sort((a, b) =>
          (b.category_name || '').localeCompare(a.category_name || '', 'pl', { sensitivity: 'base' })
        );
        break;
      default:
        break;
    }

    setFilteredCategories(arr);
    setCurrentPage(1); // Reset do strony 1 przy zmianie filtrów
  }, [categories, filters]);

  /* =================================================================
     3. PAGINACJA LOKALNA
  ================================================================== */
  const totalRecords = filteredCategories.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const displayedCategories = filteredCategories.slice(startIndex, endIndex);

  /* =================================================================
     4. DODAWANIE KATEGORII
  ================================================================== */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      // Dodajemy nową kategorię do Supabase
      const { data, error } = await supabase
        .from('Categories')
        .insert([
          {
            category_name: formData.category_name,
            category_description: formData.category_description,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      // Dodajemy do local state
      setCategories(prev => [...prev, data]);

      // Reset formularza
      setFormData({ category_name: '', category_description: '' });
    } catch (err) {
      console.error('Błąd dodawania kategorii:', err);
    }
  };

  /* =================================================================
     5. ROZWIJANIE SZCZEGÓŁÓW
  ================================================================== */
  const toggleCategoryDetails = (id) => {
    setExpandedCategoryId(prev => (prev === id ? null : id));
  };

  /* =================================================================
     6. EDYCJA KATEGORII
  ================================================================== */
  const openEditModal = (cat) => {
    setCategoryToEdit(cat);
    setEditFormData({
      category_name: cat.category_name || '',
      category_description: cat.category_description || '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setCategoryToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const confirmEdit = async () => {
    if (!categoryToEdit) return;
    try {
      const { data, error } = await supabase
        .from('Categories')
        .update({
          category_name: editFormData.category_name,
          category_description: editFormData.category_description,
        })
        .eq('category_id', categoryToEdit.category_id)
        .select('*')
        .single();

      if (error) throw error;

      // Aktualizacja local state
      setCategories(prev =>
        prev.map(c => (c.category_id === categoryToEdit.category_id ? data : c))
      );
    } catch (err) {
      console.error('Błąd edycji kategorii:', err);
    } finally {
      closeEditModal();
    }
  };

  /* =================================================================
     7. USUWANIE KATEGORII
  ================================================================== */
  const openDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setCategoryToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const { error } = await supabase
        .from('Categories')
        .delete()
        .eq('category_id', categoryToDelete.category_id);

      if (error) throw error;

      // Usuwamy z local state
      setCategories(prev => prev.filter(c => c.category_id !== categoryToDelete.category_id));
    } catch (err) {
      console.error('Błąd usuwania kategorii:', err);
    } finally {
      closeDeleteModal();
    }
  };

  /* =================================================================
     RENDER – 3 KOLUMNY (1/5, 1/5, 3/5) 
  ================================================================== */
  return (
    <div className="admin-categories-container">
      <Navbar />
      <div className="admin-categories-content">
        
        {/* 1/5: Formularz dodania */}
        <form onSubmit={handleAddCategory} className="admin-category-form">
          <h2>Dodaj kategorię</h2>
          <input
            type="text"
            name="category_name"
            placeholder="Nazwa kategorii"
            value={formData.category_name}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="category_description"
            placeholder="Opis kategorii (opcjonalnie)"
            value={formData.category_description}
            onChange={handleInputChange}
          />
          <button type="submit" className="admin-add-category-button">
            Dodaj
          </button>
        </form>

        {/* 1/5: Filtry */}
        <div className="admin-categories-filters">
          <h2>Filtry i sortowanie</h2>
          <input
            type="text"
            name="searchText"
            placeholder="Szukaj po nazwie / opisie..."
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          />
          <select
            name="sortKey"
            value={filters.sortKey}
            onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
          >
            <option value="nameAsc">Nazwa A-Z</option>
            <option value="nameDesc">Nazwa Z-A</option>
          </select>

          <select
            name="perPage"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5 na stronę</option>
            <option value={10}>10 na stronę</option>
            <option value={20}>20 na stronę</option>
            <option value={50}>50 na stronę</option>
          </select>
        </div>

        {/* 3/5: Lista kategorii */}
        <div className="admin-categories-list">
          <h2>Lista kategorii</h2>

          {displayedCategories.map(cat => {
            const expanded = expandedCategoryId === cat.category_id;
            return (
              <div key={cat.category_id} className="admin-category-item">
                <div className="admin-category-main-info">
                  <span className="admin-category-title">{cat.category_name}</span>
                  <span className="admin-category-inline-desc">
                    {cat.category_description?.substring(0, 40)} 
                    {cat.category_description?.length > 40 && '...'}
                  </span>
                </div>
                <div className="admin-category-actions">
                  <img
                    src="/edit-pen-icon.png"
                    alt="Edytuj"
                    title="Edytuj"
                    onClick={() => openEditModal(cat)}
                  />
                  <img
                    src="/eye-icon.png"
                    alt="Szczegóły"
                    title="Szczegóły"
                    onClick={() => toggleCategoryDetails(cat.category_id)}
                  />
                  <img
                    src="/recycle-bin-line-icon.png"
                    alt="Usuń"
                    title="Usuń"
                    onClick={() => openDeleteModal(cat)}
                  />
                </div>

                {/* Szczegóły */}
                <div className={`admin-category-details ${expanded ? 'expanded' : ''}`}>
                  {expanded && (
                    <div>
                      <p><strong>ID:</strong> {cat.category_id}</p>
                      <p><strong>Nazwa:</strong> {cat.category_name}</p>
                      <p><strong>Opis:</strong> {cat.category_description || '(brak)'} </p>
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

      {/* MODAL – USUWANIE */}
      {isDeleteModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Czy na pewno chcesz usunąć tę kategorię?</h2>
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

      {/* MODAL – EDYCJA */}
      {isEditModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edytuj kategorię</h2>
            <label>Nazwa:</label>
            <input
              type="text"
              name="category_name"
              value={editFormData.category_name}
              onChange={handleEditFormChange}
            />
            <label>Opis:</label>
            <textarea
              name="category_description"
              rows={3}
              value={editFormData.category_description}
              onChange={handleEditFormChange}
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
    </div>
  );
};

export default CategoriesAdminPage;
