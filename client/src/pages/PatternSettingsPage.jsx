import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Scissors,
  RotateCcw,
} from 'lucide-react';
import { patternsApi } from '../api/patternsApi';
import { useToast } from '../context/ToastContext';
import { SearchInput } from '../components/common/SearchInput';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Loading } from '../components/common/Loading';
import { DataTablePagination } from '../components/common/DataTablePagination';
import { notifyPatternsUpdated } from '../hooks/useTenantPatterns';

export const PatternSettingsPage = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('shirt'); // 'shirt' | 'pant' for responsive switching

  // Pattern states
  const [shirtPatterns, setShirtPatterns] = useState([]);
  const [pantPatterns, setPantPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search terms
  const [shirtSearch, setShirtSearch] = useState('');
  const [pantSearch, setPantSearch] = useState('');

  // New pattern input fields
  const [newShirtName, setNewShirtName] = useState('');
  const [addingShirt, setAddingShirt] = useState(false);

  const [newPantName, setNewPantName] = useState('');
  const [addingPant, setAddingPant] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all patterns
  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const [shirtRes, pantRes] = await Promise.all([
        patternsApi.getPatterns({ type: 'shirt' }),
        patternsApi.getPatterns({ type: 'pant' }),
      ]);
      setShirtPatterns(shirtRes.data || []);
      setPantPatterns(pantRes.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to load patterns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  // Validation: Check duplicate in list (case-insensitive + trimmed)
  const isDuplicate = (name, list, currentId = null) => {
    const clean = name.trim().toLowerCase();
    return list.some(
      (p) => p._id !== currentId && p.name.trim().toLowerCase() === clean
    );
  };

  // Add Shirt Pattern
  const handleAddShirtPattern = async (e) => {
    e.preventDefault();
    const cleanName = newShirtName.trim();
    if (!cleanName) {
      toastError('Please enter a shirt pattern name');
      return;
    }
    if (isDuplicate(cleanName, shirtPatterns)) {
      toastError(`Shirt pattern "${cleanName}" already exists`);
      return;
    }

    setAddingShirt(true);
    try {
      const res = await patternsApi.createPattern({
        name: cleanName,
        type: 'shirt',
      });
      success(res.message || 'Shirt pattern added successfully');
      setNewShirtName('');
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to add shirt pattern');
    } finally {
      setAddingShirt(false);
    }
  };

  // Add Pant Pattern
  const handleAddPantPattern = async (e) => {
    e.preventDefault();
    const cleanName = newPantName.trim();
    if (!cleanName) {
      toastError('Please enter a pant pattern name');
      return;
    }
    if (isDuplicate(cleanName, pantPatterns)) {
      toastError(`Pant pattern "${cleanName}" already exists`);
      return;
    }

    setAddingPant(true);
    try {
      const res = await patternsApi.createPattern({
        name: cleanName,
        type: 'pant',
      });
      success(res.message || 'Pant pattern added successfully');
      setNewPantName('');
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to add pant pattern');
    } finally {
      setAddingPant(false);
    }
  };

  // Start Editing
  const startEditing = (pattern) => {
    setEditingId(pattern._id);
    setEditingName(pattern.name);
  };

  // Save Edit
  const handleSaveEdit = async (pattern) => {
    const cleanName = editingName.trim();
    if (!cleanName) {
      toastError('Pattern name cannot be empty');
      return;
    }

    const currentList = pattern.type === 'shirt' ? shirtPatterns : pantPatterns;
    if (isDuplicate(cleanName, currentList, pattern._id)) {
      toastError(`A ${pattern.type} pattern with name "${cleanName}" already exists`);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await patternsApi.updatePattern(pattern._id, {
        name: cleanName,
      });
      success(res.message || 'Pattern updated successfully');
      setEditingId(null);
      setEditingName('');
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to update pattern');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Pattern Confirmation
  const confirmDelete = (pattern) => {
    setDeleteTarget(pattern);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await patternsApi.deletePattern(deleteTarget._id);
      success(res.message || 'Pattern deleted successfully');
      setDeleteTarget(null);
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to delete pattern');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered patterns by search
  const filteredShirtPatterns = shirtPatterns.filter((p) =>
    p.name.toLowerCase().includes(shirtSearch.trim().toLowerCase())
  );

  const filteredPantPatterns = pantPatterns.filter((p) =>
    p.name.toLowerCase().includes(pantSearch.trim().toLowerCase())
  );

  // Client-side pagination for shirt patterns
  const [shirtPage, setShirtPage] = useState(1);
  const [shirtPageSize, setShirtPageSize] = useState(10);

  useEffect(() => {
    setShirtPage(1);
  }, [shirtSearch]);

  const shirtTotalRecords = filteredShirtPatterns.length;
  const shirtTotalPages = Math.ceil(shirtTotalRecords / shirtPageSize) || 1;
  const shirtCurrentPage = Math.min(Math.max(1, shirtPage), shirtTotalPages);
  const shirtStartIndex = (shirtCurrentPage - 1) * shirtPageSize;
  const shirtEndIndex = shirtStartIndex + shirtPageSize;
  const displayedShirtPatterns = filteredShirtPatterns.slice(shirtStartIndex, shirtEndIndex);

  // Client-side pagination for pant patterns
  const [pantPage, setPantPage] = useState(1);
  const [pantPageSize, setPantPageSize] = useState(10);

  useEffect(() => {
    setPantPage(1);
  }, [pantSearch]);

  const pantTotalRecords = filteredPantPatterns.length;
  const pantTotalPages = Math.ceil(pantTotalRecords / pantPageSize) || 1;
  const pantCurrentPage = Math.min(Math.max(1, pantPage), pantTotalPages);
  const pantStartIndex = (pantCurrentPage - 1) * pantPageSize;
  const pantEndIndex = pantStartIndex + pantPageSize;
  const displayedPantPatterns = filteredPantPatterns.slice(pantStartIndex, pantEndIndex);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar with Back to Settings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/settings')}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        {/* Tab switch for mobile view */}
        <div className="pattern-tab-switcher" style={{ display: 'none', gap: '8px', background: 'rgba(11, 31, 58, 0.06)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('shirt')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'shirt' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'shirt' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Shirt Patterns (શર્ટ પેટર્ન)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pant')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'pant' ? 'var(--secondary)' : 'transparent',
              color: activeTab === 'pant' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Pant Patterns (પેન્ટ પેટર્ન)
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0b1f3a 0%, #142d4e 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-md)',
          borderLeft: '5px solid var(--accent-gold)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scissors size={16} /> Pattern Settings
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            Pattern Settings (પેટર્ન સેટિંગ્સ)
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '4px' }}>
            Manage shirt patterns and pant patterns used when creating orders.
          </p>
        </div>
      </div>

      {loading ? (
        <Loading text="Loading pattern settings..." />
      ) : (
        <div className="grid-2">
          {/* Section 1: Shirt Patterns */}
          <div
            className={`card pattern-col-shirt ${activeTab !== 'shirt' ? 'pattern-hidden-mobile' : ''}`}
            style={{
              borderTop: '4px solid var(--primary)',
            }}
          >
            <div className="card-header">
              <div className="card-title">
                <Scissors size={20} color="var(--primary)" />
                <span>Shirt Patterns (શર્ટ પેટર્ન)</span>
              </div>
            </div>

            {/* Add New Shirt Pattern Form */}
            <form onSubmit={handleAddShirtPattern} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chex, Plain, Striped..."
                  value={newShirtName}
                  onChange={(e) => setNewShirtName(e.target.value)}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingShirt || !newShirtName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  {addingShirt ? 'Adding...' : 'Add Shirt Pattern'}
                </button>
              </div>
            </form>

            {/* Real-Time Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <SearchInput
                value={shirtSearch}
                onChange={setShirtSearch}
                placeholder="Search shirt patterns..."
              />
            </div>

            {/* Shirt Patterns Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Shirt Pattern</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShirtPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '30px 14px', color: 'var(--text-muted)' }}>
                        {shirtSearch ? 'No shirt patterns match your search.' : 'No shirt patterns configured yet.'}
                      </td>
                    </tr>
                  ) : (
                    displayedShirtPatterns.map((pat) => (
                      <tr key={pat._id}>
                        <td>
                          {editingId === pat._id ? (
                            <input
                              type="text"
                              className="form-control"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pat.name}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {editingId === pat._id ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveEdit(pat)}
                                className="btn btn-sm btn-primary"
                                disabled={savingEdit}
                                title="Save pattern"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="btn btn-sm btn-outline"
                                title="Cancel edit"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => startEditing(pat)}
                                className="btn btn-sm btn-outline"
                                title="Edit pattern"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => confirmDelete(pat)}
                                className="btn btn-sm btn-danger"
                                title="Delete pattern"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={shirtCurrentPage}
              totalPages={shirtTotalPages}
              totalRecords={shirtTotalRecords}
              pageSize={shirtPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setShirtPage(newPage)}
              onPageSizeChange={(newSize) => {
                const newTotalPages = Math.ceil(shirtTotalRecords / newSize) || 1;
                if (shirtCurrentPage > newTotalPages) {
                  setShirtPage(1);
                }
                setShirtPageSize(newSize);
              }}
            />
          </div>

          {/* Section 2: Pant Patterns */}
          <div
            className={`card pattern-col-pant ${activeTab !== 'pant' ? 'pattern-hidden-mobile' : ''}`}
            style={{
              borderTop: '4px solid var(--secondary)',
            }}
          >
            <div className="card-header">
              <div className="card-title">
                <Layers size={20} color="var(--secondary)" />
                <span>Pant Patterns (પેન્ટ પેટર્ન)</span>
              </div>
            </div>

            {/* Add New Pant Pattern Form */}
            <form onSubmit={handleAddPantPattern} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Two Pocket, Plain, Formal..."
                  value={newPantName}
                  onChange={(e) => setNewPantName(e.target.value)}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={addingPant || !newPantName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  {addingPant ? 'Adding...' : 'Add Pant Pattern'}
                </button>
              </div>
            </form>

            {/* Real-Time Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <SearchInput
                value={pantSearch}
                onChange={setPantSearch}
                placeholder="Search pant patterns..."
              />
            </div>

            {/* Pant Patterns Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pant Pattern</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPantPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '30px 14px', color: 'var(--text-muted)' }}>
                        {pantSearch ? 'No pant patterns match your search.' : 'No pant patterns configured yet.'}
                      </td>
                    </tr>
                  ) : (
                    displayedPantPatterns.map((pat) => (
                      <tr key={pat._id}>
                        <td>
                          {editingId === pat._id ? (
                            <input
                              type="text"
                              className="form-control"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pat.name}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {editingId === pat._id ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveEdit(pat)}
                                className="btn btn-sm btn-primary"
                                disabled={savingEdit}
                                title="Save pattern"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="btn btn-sm btn-outline"
                                title="Cancel edit"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => startEditing(pat)}
                                className="btn btn-sm btn-outline"
                                title="Edit pattern"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => confirmDelete(pat)}
                                className="btn btn-sm btn-danger"
                                title="Delete pattern"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={pantCurrentPage}
              totalPages={pantTotalPages}
              totalRecords={pantTotalRecords}
              pageSize={pantPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setPantPage(newPage)}
              onPageSizeChange={(newSize) => {
                const newTotalPages = Math.ceil(pantTotalRecords / newSize) || 1;
                if (pantCurrentPage > newTotalPages) {
                  setPantPage(1);
                }
                setPantPageSize(newSize);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title={`Delete ${deleteTarget.type === 'shirt' ? 'Shirt' : 'Pant'} Pattern`}
          message={`Are you sure you want to delete pattern "${deleteTarget.name}"? Historical orders using this pattern will remain intact.`}
          confirmText="Delete Pattern"
          confirmVariant="danger"
          danger={true}
          loading={deleting}
          onConfirm={handleExecuteDelete}
          onClose={() => !deleting && setDeleteTarget(null)}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .pattern-tab-switcher {
            display: flex !important;
          }
          .pattern-hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
