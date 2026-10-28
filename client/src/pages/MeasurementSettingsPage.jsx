import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ruler,
  Scissors,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Power,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { measurementDefinitionsApi } from '../api/measurementDefinitionsApi';
import { patternsApi } from '../api/patternsApi';
import { useToast } from '../context/ToastContext';
import { Loading } from '../components/common/Loading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SearchInput } from '../components/common/SearchInput';
import { DataTablePagination } from '../components/common/DataTablePagination';
import { notifyMeasurementsUpdated } from '../hooks/useTenantMeasurements';
import { notifyPatternsUpdated } from '../hooks/useTenantPatterns';
import { transliterateToGujarati, getGujaratiSuggestions } from '../utils/gujaratiTransliteration';

export const MeasurementSettingsPage = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // Active Tab: 'shirt_measurement' | 'pant_measurement' | 'patterns'
  const [activeTab, setActiveTab] = useState('shirt_measurement');

  // Measurement definitions state
  const [shirtDefinitions, setShirtDefinitions] = useState([]);
  const [pantDefinitions, setPantDefinitions] = useState([]);
  const [loadingDefs, setLoadingDefs] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState(null);
  const [modalFormData, setModalFormData] = useState({
    displayName: '',
    gujaratiName: '',
    category: 'shirt_measurement',
    fieldType: 'number',
    isRequired: true,
    isActive: true,
    displayOrder: 1,
  });
  const [savingDef, setSavingDef] = useState(false);
  const [modalError, setModalError] = useState('');
  const [userEditedGujarati, setUserEditedGujarati] = useState(false);
  const [gujaratiSuggestions, setGujaratiSuggestions] = useState([]);

  // Delete measurement confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingMeasurement, setDeletingMeasurement] = useState(false);

  // Deactivate confirmation dialog state
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Patterns Tab States
  const [shirtPatterns, setShirtPatterns] = useState([]);
  const [pantPatterns, setPantPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [patternTypeTab, setPatternTypeTab] = useState('shirt');
  const [patternSearch, setPatternSearch] = useState('');
  const [newPatternName, setNewPatternName] = useState('');
  const [addingPattern, setAddingPattern] = useState(false);
  const [editingPatternId, setEditingPatternId] = useState(null);
  const [editingPatternName, setEditingPatternName] = useState('');
  const [savingPatternEdit, setSavingPatternEdit] = useState(false);
  const [deletePatternTarget, setDeletePatternTarget] = useState(null);
  const [deletingPattern, setDeletingPattern] = useState(false);

  // -----------------------------------------------------------------
  // 1. Fetch Measurement Definitions
  // -----------------------------------------------------------------
  const fetchDefinitions = async () => {
    try {
      setLoadingDefs(true);
      const [shirtRes, pantRes] = await Promise.all([
        measurementDefinitionsApi.getDefinitions({ category: 'shirt_measurement', all: true }),
        measurementDefinitionsApi.getDefinitions({ category: 'pant_measurement', all: true }),
      ]);
      setShirtDefinitions(shirtRes.data || []);
      setPantDefinitions(pantRes.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to load measurement settings');
    } finally {
      setLoadingDefs(false);
    }
  };

  // -----------------------------------------------------------------
  // 2. Fetch Patterns
  // -----------------------------------------------------------------
  const fetchPatterns = async () => {
    try {
      setLoadingPatterns(true);
      const [shirtRes, pantRes] = await Promise.all([
        patternsApi.getPatterns({ type: 'shirt' }),
        patternsApi.getPatterns({ type: 'pant' }),
      ]);
      setShirtPatterns(shirtRes.data || []);
      setPantPatterns(pantRes.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to load pattern options');
    } finally {
      setLoadingPatterns(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
    fetchPatterns();
  }, []);

  // Current list based on active tab, sorted strictly by displayOrder
  const currentCategory = activeTab === 'pant_measurement' ? 'pant_measurement' : 'shirt_measurement';
  const currentDefinitions = useMemo(() => {
    const list = activeTab === 'pant_measurement' ? pantDefinitions : shirtDefinitions;
    return [...list].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [activeTab, pantDefinitions, shirtDefinitions]);

  // Filter definitions by search query
  const filteredDefinitions = currentDefinitions.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      d.displayName.toLowerCase().includes(q) ||
      (d.gujaratiName && d.gujaratiName.toLowerCase().includes(q)) ||
      d.fieldKey.toLowerCase().includes(q)
    );
  });

  // Client-side pagination for measurement definitions
  const [measPage, setMeasPage] = useState(1);
  const [measPageSize, setMeasPageSize] = useState(10);

  useEffect(() => {
    setMeasPage(1);
  }, [activeTab, searchQuery]);

  const measTotalRecords = filteredDefinitions.length;
  const measTotalPages = Math.ceil(measTotalRecords / measPageSize) || 1;
  const measCurrentPage = Math.min(Math.max(1, measPage), measTotalPages);
  const measStartIndex = (measCurrentPage - 1) * measPageSize;
  const measEndIndex = measStartIndex + measPageSize;
  const displayedDefinitions = filteredDefinitions.slice(measStartIndex, measEndIndex);

  // -----------------------------------------------------------------
  // Open Add Modal
  // -----------------------------------------------------------------
  const handleOpenAddModal = () => {
    const nextOrder = currentDefinitions.length > 0
      ? Math.max(...currentDefinitions.map((d) => d.displayOrder || 0)) + 1
      : 1;

    setEditingDef(null);
    setUserEditedGujarati(false);
    setGujaratiSuggestions([]);
    setModalFormData({
      displayName: '',
      gujaratiName: '',
      category: currentCategory,
      fieldType: 'number',
      isRequired: true, // Default ON for new measurements
      isActive: true,
      displayOrder: nextOrder,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // -----------------------------------------------------------------
  // Open Edit Modal
  // -----------------------------------------------------------------
  const handleOpenEditModal = (def) => {
    setEditingDef(def);
    setUserEditedGujarati(Boolean(def.gujaratiName && def.gujaratiName.trim()));
    setGujaratiSuggestions(getGujaratiSuggestions(def.displayName || ''));
    setModalFormData({
      displayName: def.displayName || '',
      gujaratiName: def.gujaratiName || '',
      category: def.category || currentCategory,
      fieldType: def.fieldType || 'number',
      isRequired: Boolean(def.isRequired), // Preserve saved configuration
      isActive: Boolean(def.isActive),
      displayOrder: def.displayOrder || 1,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // -----------------------------------------------------------------
  // Gujarati Transliteration & Name Change Handlers
  // -----------------------------------------------------------------
  const handleDisplayNameChange = (e) => {
    const newName = e.target.value;
    const suggestions = getGujaratiSuggestions(newName);
    setGujaratiSuggestions(suggestions);

    if (!userEditedGujarati) {
      const autoGujarati = transliterateToGujarati(newName);
      setModalFormData((prev) => ({
        ...prev,
        displayName: newName,
        gujaratiName: autoGujarati,
      }));
    } else {
      setModalFormData((prev) => ({
        ...prev,
        displayName: newName,
      }));
    }
  };

  const handleGujaratiNameChange = (e) => {
    setUserEditedGujarati(true);
    setModalFormData((prev) => ({
      ...prev,
      gujaratiName: e.target.value,
    }));
  };

  const handleApplySuggestion = (suggestionText) => {
    setUserEditedGujarati(true);
    setModalFormData((prev) => ({
      ...prev,
      gujaratiName: suggestionText,
    }));
  };

  // -----------------------------------------------------------------
  // Save Add / Edit Definition
  // -----------------------------------------------------------------
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (savingDef) return;
    setModalError('');

    if (!modalFormData.displayName || !modalFormData.displayName.trim()) {
      setModalError('Measurement name is required.');
      return;
    }

    setSavingDef(true);
    try {
      if (editingDef) {
        const res = await measurementDefinitionsApi.updateDefinition(editingDef._id, {
          displayName: modalFormData.displayName.trim(),
          gujaratiName: modalFormData.gujaratiName.trim(),
          fieldType: modalFormData.fieldType,
          isRequired: modalFormData.isRequired,
          isActive: modalFormData.isActive,
          displayOrder: parseInt(modalFormData.displayOrder, 10) || 1,
        });
        success(res.message || 'Measurement updated successfully');
      } else {
        const res = await measurementDefinitionsApi.createDefinition({
          displayName: modalFormData.displayName.trim(),
          gujaratiName: modalFormData.gujaratiName.trim(),
          category: currentCategory,
          fieldType: modalFormData.fieldType,
          isRequired: modalFormData.isRequired,
          isActive: modalFormData.isActive,
          displayOrder: parseInt(modalFormData.displayOrder, 10) || 1,
        });
        success(res.message || 'Measurement added successfully');
      }
      setIsModalOpen(false);
      await fetchDefinitions();
      notifyMeasurementsUpdated();
    } catch (err) {
      setModalError(err.message || 'Failed to save measurement configuration');
    } finally {
      setSavingDef(false);
    }
  };

  // -----------------------------------------------------------------
  // Toggle Status / Deactivate with Confirmation
  // -----------------------------------------------------------------
  const handleToggleStatusClick = (def) => {
    if (def.isActive) {
      // Deactivating -> Ask confirmation
      setDeactivateTarget(def);
    } else {
      // Reactivating -> Immediate action
      executeToggleStatus(def, true);
    }
  };

  const executeToggleStatus = async (def, newStatus) => {
    if (togglingStatus) return;
    setTogglingStatus(true);
    try {
      const res = await measurementDefinitionsApi.toggleStatus(def._id, newStatus);
      success(res.message || `Measurement "${def.displayName}" status updated`);
      setDeactivateTarget(null);
      fetchDefinitions();
      notifyMeasurementsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to update measurement status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // -----------------------------------------------------------------
  // Delete Measurement Definition
  // -----------------------------------------------------------------
  const handleDeleteMeasurement = async () => {
    if (!deleteTarget || deletingMeasurement) return;
    setDeletingMeasurement(true);
    try {
      const res = await measurementDefinitionsApi.deleteDefinition(deleteTarget._id);
      success(res.message || `Measurement "${deleteTarget.displayName}" deleted successfully`);
      setDeleteTarget(null);
      fetchDefinitions();
      notifyMeasurementsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to delete measurement definition');
    } finally {
      setDeletingMeasurement(false);
    }
  };

  // -----------------------------------------------------------------
  // Reorder Item Up / Down
  // -----------------------------------------------------------------
  const handleMoveOrder = async (index, direction) => {
    const list = [...currentDefinitions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap items
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Reassign displayOrder values
    const updatedItems = list.map((item, idx) => ({
      id: item._id,
      displayOrder: idx + 1,
    }));

    // Optimistic UI update
    if (currentCategory === 'shirt_measurement') {
      setShirtDefinitions(list.map((item, idx) => ({ ...item, displayOrder: idx + 1 })));
    } else {
      setPantDefinitions(list.map((item, idx) => ({ ...item, displayOrder: idx + 1 })));
    }

    try {
      await measurementDefinitionsApi.reorderDefinitions(updatedItems);
      success('Field order updated');
      notifyMeasurementsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to save updated measurement field order');
      fetchDefinitions();
    }
  };

  // -----------------------------------------------------------------
  // Pattern Management Handlers
  // -----------------------------------------------------------------
  const handleAddPattern = async (e) => {
    e.preventDefault();
    if (addingPattern) return;
    const clean = newPatternName.trim();
    if (!clean) return;

    const currentList = patternTypeTab === 'shirt' ? shirtPatterns : pantPatterns;
    if (currentList.some((p) => p.name.trim().toLowerCase() === clean.toLowerCase())) {
      toastError(`A ${patternTypeTab} pattern with the name "${clean}" already exists.`);
      return;
    }

    setAddingPattern(true);
    try {
      const res = await patternsApi.createPattern({
        name: clean,
        type: patternTypeTab,
      });
      success(res.message || 'Pattern added successfully');
      setNewPatternName('');
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to add pattern');
    } finally {
      setAddingPattern(false);
    }
  };

  const handleSavePatternEdit = async (pattern) => {
    if (savingPatternEdit) return;
    const clean = editingPatternName.trim();
    if (!clean) return;

    setSavingPatternEdit(true);
    try {
      const res = await patternsApi.updatePattern(pattern._id, { name: clean });
      success(res.message || 'Pattern updated successfully');
      setEditingPatternId(null);
      setEditingPatternName('');
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to update pattern');
    } finally {
      setSavingPatternEdit(false);
    }
  };

  const handleDeletePattern = async () => {
    if (!deletePatternTarget || deletingPattern) return;
    setDeletingPattern(true);
    try {
      await patternsApi.deletePattern(deletePatternTarget._id);
      success(`Pattern "${deletePatternTarget.name}" deleted successfully`);
      setDeletePatternTarget(null);
      fetchPatterns();
      notifyPatternsUpdated();
    } catch (err) {
      toastError(err.message || 'Failed to delete pattern');
    } finally {
      setDeletingPattern(false);
    }
  };

  const currentPatternList = patternTypeTab === 'shirt' ? shirtPatterns : pantPatterns;
  const filteredPatterns = currentPatternList.filter((p) =>
    p.name.toLowerCase().includes(patternSearch.trim().toLowerCase())
  );

  // Client-side pagination for patterns tab
  const [patternPage, setPatternPage] = useState(1);
  const [patternPageSize, setPatternPageSize] = useState(10);

  useEffect(() => {
    setPatternPage(1);
  }, [patternTypeTab, patternSearch]);

  const patternTotalRecords = filteredPatterns.length;
  const patternTotalPages = Math.ceil(patternTotalRecords / patternPageSize) || 1;
  const patternCurrentPage = Math.min(Math.max(1, patternPage), patternTotalPages);
  const patternStartIndex = (patternCurrentPage - 1) * patternPageSize;
  const patternEndIndex = patternStartIndex + patternPageSize;
  const displayedPatterns = filteredPatterns.slice(patternStartIndex, patternEndIndex);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar with Back Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/settings')}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Each tailoring studio configures its own independent custom measurements & patterns.
        </span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1.5px solid var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              flexShrink: 0,
            }}
          >
            <Ruler size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Tenant Configuration
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              Measurement & Pattern Settings (માપ અને પેટર્ન સેટિંગ્સ)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '4px' }}>
              Customize shirt measurements, pant measurements, and garment pattern options tailored for your studio.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Tab Navigation (3 Tabs) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--border-light)',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('shirt_measurement'); setSearchQuery(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'shirt_measurement' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'shirt_measurement' ? '#ffffff' : 'transparent',
            color: activeTab === 'shirt_measurement' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'shirt_measurement' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Scissors size={18} color={activeTab === 'shirt_measurement' ? 'var(--primary)' : 'currentColor'} />
          <span>1. Shirt Measurements (શર્ટ માપ)</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeTab === 'shirt_measurement' ? 'var(--primary-light)' : '#e2e8f0',
              color: activeTab === 'shirt_measurement' ? 'var(--primary)' : '#64748b',
              fontWeight: 700,
            }}
          >
            {shirtDefinitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('pant_measurement'); setSearchQuery(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'pant_measurement' ? '3px solid var(--secondary)' : '3px solid transparent',
            backgroundColor: activeTab === 'pant_measurement' ? '#ffffff' : 'transparent',
            color: activeTab === 'pant_measurement' ? 'var(--secondary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'pant_measurement' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={18} color={activeTab === 'pant_measurement' ? 'var(--secondary)' : 'currentColor'} />
          <span>2. Pant Measurements (પેન્ટ માપ)</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeTab === 'pant_measurement' ? 'var(--accent-gold-light)' : '#e2e8f0',
              color: activeTab === 'pant_measurement' ? 'var(--secondary)' : '#64748b',
              fontWeight: 700,
            }}
          >
            {pantDefinitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('patterns')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'patterns' ? '3px solid var(--accent-gold)' : '3px solid transparent',
            backgroundColor: activeTab === 'patterns' ? '#ffffff' : 'transparent',
            color: activeTab === 'patterns' ? 'var(--accent-gold-hover)' : 'var(--text-muted)',
            fontWeight: activeTab === 'patterns' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Ruler size={18} color={activeTab === 'patterns' ? 'var(--accent-gold)' : 'currentColor'} />
          <span>3. Shirt & Pant Patterns (પેટર્ન)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* TAB 1 & 2: MEASUREMENTS TABLE & CUSTOM FIELDS               */}
      {/* ------------------------------------------------------------ */}
      {activeTab !== 'patterns' && (
        <div className="card" style={{ padding: '24px' }}>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {activeTab === 'shirt_measurement' ? 'Shirt Measurement Definitions' : 'Pant Measurement Definitions'}
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Manage baseline and custom measurement fields. Deactivated fields remain preserved in historical orders.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '220px' }}>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={`Search ${activeTab === 'shirt_measurement' ? 'shirt' : 'pant'} fields...`}
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Plus size={16} />  Add Measurement
              </button>
            </div>
          </div>

          {loadingDefs ? (
            <Loading text="Loading measurement fields..." />
          ) : (
            <>
              <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Order</th>
                    <th>Measurement Name</th>
                    <th>Gujarati Name</th>
                    <th>Field Key</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefinitions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)' }}>
                        {searchQuery ? 'No measurement definitions match your search.' : 'No measurement fields defined yet.'}
                      </td>
                    </tr>
                  ) : (
                    displayedDefinitions.map((def, idx) => {
                      const globalIndex = currentDefinitions.findIndex((d) => d._id === def._id);
                      return (
                      <tr
                        key={def._id}
                        style={{
                          opacity: def.isActive ? 1 : 0.65,
                          backgroundColor: def.isActive ? 'transparent' : '#f8fafc',
                        }}
                      >
                        {/* Display Order with Up/Down buttons */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '18px' }}>
                              {def.displayOrder || (globalIndex >= 0 ? globalIndex + 1 : idx + 1)}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <button
                                type="button"
                                disabled={globalIndex <= 0}
                                onClick={() => handleMoveOrder(globalIndex, 'up')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: globalIndex <= 0 ? 'not-allowed' : 'pointer',
                                  color: globalIndex <= 0 ? '#cbd5e1' : 'var(--primary)',
                                  lineHeight: 1,
                                }}
                                title="Move up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={globalIndex < 0 || globalIndex >= currentDefinitions.length - 1}
                                onClick={() => handleMoveOrder(globalIndex, 'down')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: globalIndex < 0 || globalIndex >= currentDefinitions.length - 1 ? 'not-allowed' : 'pointer',
                                  color: globalIndex < 0 || globalIndex >= currentDefinitions.length - 1 ? '#cbd5e1' : 'var(--primary)',
                                  lineHeight: 1,
                                }}
                                title="Move down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name */}
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            {def.displayName}
                          </div>
                          {def.isSystemDefault && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Baseline Field</span>
                          )}
                        </td>

                        {/* Gujarati Label */}
                        <td>
                          <span style={{ fontWeight: 600, color: def.gujaratiName ? '#0f766e' : '#94a3b8' }}>
                            {def.gujaratiName || '—'}
                          </span>
                        </td>

                        {/* Stable Field Key Badge */}
                        <td>
                          <code
                            style={{
                              fontSize: '0.8rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {def.fieldKey}
                          </code>
                        </td>

                        {/* Field Type */}
                        <td>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: def.fieldType === 'number' ? '#e0f2fe' : '#f3e8ff',
                              color: def.fieldType === 'number' ? '#0369a1' : '#7e22ce',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          >
                            {def.fieldType}
                          </span>
                        </td>

                        {/* Required status */}
                        <td>
                          {def.isRequired ? (
                            <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                              Required *
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>
                              Optional
                            </span>
                          )}
                        </td>

                        {/* Active status */}
                        <td>
                          {def.isActive ? (
                            <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                              Active
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#94a3b8', fontWeight: 600 }}>
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(def)}
                              className="btn btn-sm btn-outline"
                              title="Edit measurement definition"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(def)}
                              className="btn btn-sm btn-outline"
                              style={{
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                              }}
                              title="Delete measurement"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatusClick(def)}
                              className={`btn btn-sm ${def.isActive ? 'btn-outline' : 'btn-primary'}`}
                              style={{
                                color: def.isActive ? '#d97706' : undefined,
                                borderColor: def.isActive ? '#fcd34d' : undefined,
                              }}
                              title={def.isActive ? 'Deactivate measurement' : 'Reactivate measurement'}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={measCurrentPage}
              totalPages={measTotalPages}
              totalRecords={measTotalRecords}
              pageSize={measPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setMeasPage(newPage)}
              onPageSizeChange={(newSize) => {
                const newTotalPages = Math.ceil(measTotalRecords / newSize) || 1;
                if (measCurrentPage > newTotalPages) {
                  setMeasPage(1);
                }
                setMeasPageSize(newSize);
              }}
            />
          </>
        )}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 3: SHIRT & PANT PATTERNS                                 */}
      {/* ------------------------------------------------------------ */}
      {activeTab === 'patterns' && (
        <div className="card" style={{ padding: '24px' }}>
          {/* Sub tabs: Shirt vs Pant Patterns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setPatternTypeTab('shirt'); setPatternSearch(''); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: patternTypeTab === 'shirt' ? 'var(--primary)' : '#f1f5f9',
                  color: patternTypeTab === 'shirt' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Shirt Patterns ({shirtPatterns.length})
              </button>
              <button
                type="button"
                onClick={() => { setPatternTypeTab('pant'); setPatternSearch(''); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: patternTypeTab === 'pant' ? 'var(--secondary)' : '#f1f5f9',
                  color: patternTypeTab === 'pant' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Pant Patterns ({pantPatterns.length})
              </button>
            </div>

            <div style={{ minWidth: '220px' }}>
              <SearchInput
                value={patternSearch}
                onChange={setPatternSearch}
                placeholder={`Search ${patternTypeTab} patterns...`}
              />
            </div>
          </div>

          {/* Add Pattern Form */}
          <form onSubmit={handleAddPattern} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-control"
                placeholder={patternTypeTab === 'shirt' ? 'e.g. Regular, Slim Fit, Kurta Collar...' : 'e.g. Formal, Straight Fit, Pencil Fit...'}
                value={newPatternName}
                onChange={(e) => setNewPatternName(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              />
              <button
                type="submit"
                className={patternTypeTab === 'shirt' ? 'btn btn-primary' : 'btn btn-secondary'}
                disabled={addingPattern || !newPatternName.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Plus size={16} /> {addingPattern ? 'Adding...' : `Add ${patternTypeTab === 'shirt' ? 'Shirt' : 'Pant'} Pattern`}
              </button>
            </div>
          </form>

          {/* Patterns Table */}
          {loadingPatterns ? (
            <Loading text="Loading pattern options..." />
          ) : (
            <>
              <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern Name</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)' }}>
                        {patternSearch ? 'No patterns match your search.' : `No ${patternTypeTab} patterns configured yet.`}
                      </td>
                    </tr>
                  ) : (
                    displayedPatterns.map((pat) => (
                      <tr key={pat._id}>
                        <td>
                          {editingPatternId === pat._id ? (
                            <input
                              type="text"
                              className="form-control"
                              value={editingPatternName}
                              onChange={(e) => setEditingPatternName(e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                              {pat.name}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: pat.type === 'shirt' ? 'var(--primary-light)' : 'var(--accent-gold-light)',
                              color: pat.type === 'shirt' ? 'var(--primary)' : 'var(--secondary)',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                            }}
                          >
                            {pat.type} Pattern
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {editingPatternId === pat._id ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleSavePatternEdit(pat)}
                                className="btn btn-sm btn-primary"
                                disabled={savingPatternEdit}
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPatternId(null)}
                                className="btn btn-sm btn-outline"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => { setEditingPatternId(pat._id); setEditingPatternName(pat.name); }}
                                className="btn btn-sm btn-outline"
                                title="Edit pattern"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletePatternTarget(pat)}
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
              currentPage={patternCurrentPage}
              totalPages={patternTotalPages}
              totalRecords={patternTotalRecords}
              pageSize={patternPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setPatternPage(newPage)}
              onPageSizeChange={(newSize) => {
                const newTotalPages = Math.ceil(patternTotalRecords / newSize) || 1;
                if (patternCurrentPage > newTotalPages) {
                  setPatternPage(1);
                }
                setPatternPageSize(newSize);
              }}
            />
          </>
        )}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* ADD / EDIT MEASUREMENT MODAL                                  */}
      {/* ------------------------------------------------------------ */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingDef) setIsModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              padding: '24px',
              overflow: 'hidden',
              borderTop: `4px solid ${currentCategory === 'shirt_measurement' ? 'var(--primary)' : 'var(--secondary)'}`,
            }}
          >
            {/* Modal Header */}
            <div className="card-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
              <div className="card-title" style={{ fontSize: '1.15rem' }}>
                <Ruler size={20} color="var(--primary)" />
                <span>
                  {editingDef ? `Edit ${editingDef.displayName}` : ` Add ${currentCategory === 'shirt_measurement' ? 'Shirt' : 'Pant'} Measurement`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={savingDef}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  border: '1px solid #fecaca',
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Measurement Name */}
              <div className="form-group">
                <label className="form-label">
                  Measurement Name (English) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Pocket Height, Back Pleat, Inseam, chhati, lambai..."
                  value={modalFormData.displayName}
                  onChange={handleDisplayNameChange}
                  required
                  autoFocus
                />
              </div>

              {/* Gujarati Display Name with Transliteration & Suggestions */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>
                    Gujarati Display Name (ગુજરાતી નામ) <span className="label-sub">(Optional)</span>
                  </label>
                  {!userEditedGujarati && modalFormData.gujaratiName && (
                    <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 600 }}>
                      ⚡ Auto-transliterated
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ખિસ્સાની ઊંચાઈ, બેક પ્લીટ, છાતી..."
                  value={modalFormData.gujaratiName}
                  onChange={handleGujaratiNameChange}
                />

                {/* Suggestions Pills */}
                {gujaratiSuggestions.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggestions:</span>
                    {gujaratiSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplySuggestion(sug)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '4px',
                          border: modalFormData.gujaratiName === sug ? '1px solid var(--accent-gold)' : '1px solid #cbd5e1',
                          backgroundColor: modalFormData.gujaratiName === sug ? 'rgba(212, 175, 55, 0.15)' : '#f8fafc',
                          color: modalFormData.gujaratiName === sug ? '#92400e' : '#334155',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Apply suggestion "${sug}"`}
                      >
                        {sug}
                      </button>
                    ))}
                    {userEditedGujarati && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserEditedGujarati(false);
                          const auto = transliterateToGujarati(modalFormData.displayName);
                          setModalFormData((prev) => ({ ...prev, gujaratiName: auto }));
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '2px 4px',
                        }}
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Readonly Field Key Preview if editing */}
              {editingDef && (
                <div className="form-group">
                  <label className="form-label">
                    Machine Identifier Key <span className="label-sub">(Permanent / Immutable)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingDef.fieldKey}
                    disabled
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Stable machine key preserves historical order and customer values even if the display name is renamed.
                  </span>
                </div>
              )}

              {/* Field Type */}
              <div className="form-group">
                <label className="form-label">Field Type</label>
                <select
                  className="form-control"
                  value={modalFormData.fieldType}
                  onChange={(e) => setModalFormData({ ...modalFormData, fieldType: e.target.value })}
                >
                  <option value="number">Number (Positive Decimal)</option>
                  <option value="text">Text (Notes / Styling)</option>
                </select>
              </div>

              {/* Required & Active Checkboxes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={modalFormData.isRequired}
                      onChange={(e) => setModalFormData({ ...modalFormData, isRequired: e.target.checked })}
                    />
                    <span>Required Field</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Must be entered before saving order
                  </span>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={modalFormData.isActive}
                      onChange={(e) => setModalFormData({ ...modalFormData, isActive: e.target.checked })}
                    />
                    <span>Active Field</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Shown on new order & customer forms
                  </span>
                </div>
              </div>

              {/* Display Order */}
              <div className="form-group">
                <label className="form-label">Display Order (Position)</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(currentDefinitions.length + (editingDef ? 0 : 1), 1)}
                  className="form-control"
                  style={{ width: '120px' }}
                  value={modalFormData.displayOrder}
                  onChange={(e) => setModalFormData({ ...modalFormData, displayOrder: e.target.value })}
                />
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Setting a position automatically shifts other measurements into 1..N order.
                </span>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  disabled={savingDef}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingDef}
                >
                  {savingDef ? 'Saving...' : editingDef ? 'Update Measurement' : 'Add Measurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* DEACTIVATE MEASUREMENT CONFIRMATION DIALOG                   */}
      {/* ------------------------------------------------------------ */}
      {deactivateTarget && (
        <ConfirmDialog
          isOpen={Boolean(deactivateTarget)}
          title={`Deactivate "${deactivateTarget.displayName}"?`}
          message={`Are you sure you want to deactivate "${deactivateTarget.displayName}"? Historical orders and customer records will safely preserve their saved measurements. This field will simply be hidden when creating new orders.`}
          confirmText="Deactivate Field"
          confirmVariant="warning"
          loading={togglingStatus}
          onConfirm={() => executeToggleStatus(deactivateTarget, false)}
          onClose={() => !togglingStatus && setDeactivateTarget(null)}
          onCancel={() => !togglingStatus && setDeactivateTarget(null)}
        />
      )}

      {/* ------------------------------------------------------------ */}
      {/* DELETE MEASUREMENT CONFIRMATION DIALOG                       */}
      {/* ------------------------------------------------------------ */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title={`Delete ${currentCategory === 'shirt_measurement' ? 'Shirt' : 'Pant'} Measurement`}
          message={`Are you sure you want to delete the measurement '${deleteTarget.displayName}'? Existing orders and customer measurement records will remain intact.`}
          confirmText="Delete Measurement"
          confirmVariant="danger"
          danger={true}
          loading={deletingMeasurement}
          onConfirm={handleDeleteMeasurement}
          onClose={() => !deletingMeasurement && setDeleteTarget(null)}
          onCancel={() => !deletingMeasurement && setDeleteTarget(null)}
        />
      )}

      {/* ------------------------------------------------------------ */}
      {/* DELETE PATTERN CONFIRMATION DIALOG                           */}
      {/* ------------------------------------------------------------ */}
      {deletePatternTarget && (
        <ConfirmDialog
          isOpen={Boolean(deletePatternTarget)}
          title={`Delete ${deletePatternTarget.type === 'shirt' ? 'Shirt' : 'Pant'} Pattern`}
          message={`Are you sure you want to delete pattern "${deletePatternTarget.name}"? Historical orders referencing this pattern will remain intact.`}
          confirmText="Delete Pattern"
          confirmVariant="danger"
          danger={true}
          loading={deletingPattern}
          onConfirm={handleDeletePattern}
          onClose={() => !deletingPattern && setDeletePatternTarget(null)}
          onCancel={() => !deletingPattern && setDeletePatternTarget(null)}
        />
      )}
    </div>
  );
};
