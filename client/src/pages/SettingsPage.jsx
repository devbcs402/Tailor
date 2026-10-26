import React, { useState, useEffect } from 'react';
import {
  Settings,
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

export const SettingsPage = () => {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('shirt'); // 'shirt' | 'pant'

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

  // Validation: Check duplicate in local list (case-insensitive + trimmed)
  const isDuplicate = (name, list, currentId = null) => {
    const clean = name.trim().toLowerCase();
    return list.some(
      (p) => p._id !== currentId && p.name.trim().toLowerCase() === clean
    );
  };

  // Add Shirt Pattern
  const handleAddShirtPattern = async (e) => {
    e.preventDefault();
    if (!newShirtName.trim()) {
      toastError('Please enter a shirt pattern name');
      return;
    }
    if (isDuplicate(newShirtName, shirtPatterns)) {
      toastError(`Shirt pattern "${newShirtName.trim()}" already exists`);
      return;
    }

    setAddingShirt(true);
    try {
      const res = await patternsApi.createPattern({
        name: newShirtName.trim(),
        type: 'shirt',
      });
      success(res.message || 'Shirt pattern added successfully');
      setNewShirtName('');
      fetchPatterns();
    } catch (err) {
      toastError(err.message || 'Failed to add shirt pattern');
    } finally {
      setAddingShirt(false);
    }
  };

  // Add Pant Pattern
  const handleAddPantPattern = async (e) => {
    e.preventDefault();
    if (!newPantName.trim()) {
      toastError('Please enter a pant pattern name');
      return;
    }
    if (isDuplicate(newPantName, pantPatterns)) {
      toastError(`Pant pattern "${newPantName.trim()}" already exists`);
      return;
    }

    setAddingPant(true);
    try {
      const res = await patternsApi.createPattern({
        name: newPantName.trim(),
        type: 'pant',
      });
      success(res.message || 'Pant pattern added successfully');
      setNewPantName('');
      fetchPatterns();
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
    if (!editingName.trim()) {
      toastError('Pattern name cannot be empty');
      return;
    }

    const currentList = pattern.type === 'shirt' ? shirtPatterns : pantPatterns;
    if (isDuplicate(editingName, currentList, pattern._id)) {
      toastError(`A ${pattern.type} pattern with name "${editingName.trim()}" already exists`);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await patternsApi.updatePattern(pattern._id, {
        name: editingName.trim(),
      });
      success(res.message || 'Pattern updated successfully');
      setEditingId(null);
      setEditingName('');
      fetchPatterns();
    } catch (err) {
      toastError(err.message || 'Failed to update pattern');
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await patternsApi.deletePattern(deleteTarget._id);
      success(res.message || 'Pattern deleted successfully');
      setDeleteTarget(null);
      fetchPatterns();
    } catch (err) {
      toastError(err.message || 'Failed to delete pattern');
    } finally {
      setDeleting(false);
    }
  };

  // Filter patterns by search
  const filteredShirtPatterns = shirtPatterns.filter((p) =>
    p.name.toLowerCase().includes(shirtSearch.toLowerCase().trim())
  );

  const filteredPantPatterns = pantPatterns.filter((p) =>
    p.name.toLowerCase().includes(pantSearch.toLowerCase().trim())
  );

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={16} /> Pattern Management
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              Pattern Settings (પેટર્ન સેટિંગ્સ)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '4px' }}>
              Add, edit, or remove shirt and pant patterns used across order forms.
            </p>
          </div>

          {/* Quick Tab Switcher for Mobile / Tablet */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('shirt')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'shirt' ? 'var(--accent-gold)' : 'transparent',
                color: activeTab === 'shirt' ? '#0b1f3a' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Shirt Patterns ({shirtPatterns.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pant')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'pant' ? 'var(--accent-gold)' : 'transparent',
                color: activeTab === 'pant' ? '#0b1f3a' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Pant Patterns ({pantPatterns.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading text="Loading pattern settings..." />
      ) : (
        <div className="grid-2">
          {/* Section 1: Shirt Patterns */}
          <div
            className="card"
            style={{
              borderTop: '4px solid var(--primary)',
              display: activeTab === 'shirt' || window.innerWidth > 900 ? 'block' : 'none',
            }}
          >
            <div className="card-header">
              <div className="card-title">
                <Scissors size={20} color="var(--primary)" />
                <span>Shirt Patterns (શર્ટ પેટર્ન)</span>
              </div>
              <span style={{ fontSize: '0.82rem', padding: '3px 10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                {shirtPatterns.length} Patterns
              </span>
            </div>

            {/* Add New Shirt Pattern Form */}
            <form onSubmit={handleAddShirtPattern} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chex, Plain, Striped, Mandarin..."
                  value={newShirtName}
                  onChange={(e) => setNewShirtName(e.target.value)}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button
                  type="submit"
                  disabled={addingShirt || !newShirtName.trim()}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Add Pattern
                </button>
              </div>
            </form>

            {/* Real-Time Search Bar */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SearchInput
                value={shirtSearch}
                onChange={setShirtSearch}
                placeholder="Search shirt patterns..."
                style={{ maxWidth: '100%' }}
              />
            </div>

            {/* Shirt Patterns Table */}
            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern Name</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShirtPatterns.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                        {shirtSearch ? `No shirt patterns matching "${shirtSearch}"` : 'No shirt patterns added yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredShirtPatterns.map((p) => {
                      const isEditing = editingId === p._id;
                      return (
                        <tr key={p._id}>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(p);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {p.name}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isEditing ? (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(p)}
                                  disabled={savingEdit}
                                  className="btn btn-sm btn-primary"
                                  title="Save changes"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="btn btn-sm btn-outline"
                                  title="Cancel"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => startEditing(p)}
                                  className="btn btn-sm btn-outline"
                                  title="Edit pattern"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(p)}
                                  className="btn btn-sm btn-outline"
                                  title="Delete pattern"
                                  style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Pant Patterns */}
          <div
            className="card"
            style={{
              borderTop: '4px solid var(--secondary)',
              display: activeTab === 'pant' || window.innerWidth > 900 ? 'block' : 'none',
            }}
          >
            <div className="card-header">
              <div className="card-title">
                <Layers size={20} color="var(--secondary)" />
                <span>Pant Patterns (પેન્ટ પેટર્ન)</span>
              </div>
              <span style={{ fontSize: '0.82rem', padding: '3px 10px', backgroundColor: 'var(--accent-gold-light)', color: 'var(--secondary)', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid #f3e8c2' }}>
                {pantPatterns.length} Patterns
              </span>
            </div>

            {/* Add New Pant Pattern Form */}
            <form onSubmit={handleAddPantPattern} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Two Pocket, Plain, Formal, Pleated..."
                  value={newPantName}
                  onChange={(e) => setNewPantName(e.target.value)}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button
                  type="submit"
                  disabled={addingPant || !newPantName.trim()}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Add Pattern
                </button>
              </div>
            </form>

            {/* Real-Time Search Bar */}
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SearchInput
                value={pantSearch}
                onChange={setPantSearch}
                placeholder="Search pant patterns..."
                style={{ maxWidth: '100%' }}
              />
            </div>

            {/* Pant Patterns Table */}
            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern Name</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPantPatterns.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                        {pantSearch ? `No pant patterns matching "${pantSearch}"` : 'No pant patterns added yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPantPatterns.map((p) => {
                      const isEditing = editingId === p._id;
                      return (
                        <tr key={p._id}>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(p);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {p.name}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isEditing ? (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(p)}
                                  disabled={savingEdit}
                                  className="btn btn-sm btn-primary"
                                  title="Save changes"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="btn btn-sm btn-outline"
                                  title="Cancel"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => startEditing(p)}
                                  className="btn btn-sm btn-outline"
                                  title="Edit pattern"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(p)}
                                  className="btn btn-sm btn-outline"
                                  title="Delete pattern"
                                  style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.type === 'shirt' ? 'Shirt' : 'Pant'} Pattern`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Historical orders referencing this pattern will remain intact.`}
        confirmText="Delete Pattern"
        danger={true}
      />
    </div>
  );
};
