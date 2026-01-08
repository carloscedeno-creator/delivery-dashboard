import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2 
} from 'lucide-react';
import { getCurrentUser } from '../utils/authService';
import {
  getAllProductDepartmentKPIs,
  createProductDepartmentKPI,
  updateProductDepartmentKPI,
  deleteProductDepartmentKPI
} from '../services/productDepartmentKPIService';

/**
 * Product Department KPIs Component
 * Displays and allows editing of Product Department KPIs table
 * Visible to admin, 3amigos, and pm roles
 */
const ProductDepartmentKPIs = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kpis, setKpis] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProductDepartmentKPIs();
      setKpis(data);
    } catch (err) {
      console.error('[ProductDepartmentKPIs] Error loading KPIs:', err);
      setError('Failed to load KPIs data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (kpi) => {
    setEditingId(kpi.id);
    setEditingRow({ ...kpi });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRow(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingRow) return;

    try {
      setSaving(true);
      setError(null);
      
      const updated = await updateProductDepartmentKPI(
        editingId,
        editingRow,
        currentUser?.id
      );

      if (updated) {
        await loadKPIs();
        setEditingId(null);
        setEditingRow(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Failed to update KPI record');
      }
    } catch (err) {
      console.error('[ProductDepartmentKPIs] Error saving:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const success = await deleteProductDepartmentKPI(id);
      
      if (success) {
        await loadKPIs();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Failed to delete record');
      }
    } catch (err) {
      console.error('[ProductDepartmentKPIs] Error deleting:', err);
      setError('Failed to delete record');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newRow.initiative || newRow.initiative.trim() === '') {
      setError('Initiative name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const created = await createProductDepartmentKPI(newRow, currentUser?.id);
      
      if (created) {
        await loadKPIs();
        setNewRow({});
        setShowAddForm(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Failed to create record. Initiative may already exist.');
      }
    } catch (err) {
      console.error('[ProductDepartmentKPIs] Error creating:', err);
      setError('Failed to create record');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch {
      return dateStr;
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return null;
    // Try to parse DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const renderCell = (kpi, field, isEditing) => {
    const value = isEditing ? editingRow[field] : kpi[field];
    
    if (isEditing) {
      // Date fields
      if (field.includes('date') || field === 'sh_review_date' || field === 'expected_date' || field === 'start_date' || field === 'end_date') {
        // Convert date to YYYY-MM-DD format for date input
        let dateValue = '';
        if (value) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              dateValue = date.toISOString().split('T')[0];
            }
          } catch (e) {
            // If parsing fails, try to parse DD/MM/YYYY format
            const parts = String(value).split('/');
            if (parts.length === 3) {
              dateValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        return (
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setEditingRow({ ...editingRow, [field]: e.target.value || null })}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm"
          />
        );
      }
      
      // Integer fields
      if (field === 'effort_in_days' || field === 'completion_percentage') {
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => setEditingRow({ ...editingRow, [field]: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm"
          />
        );
      }
      
      // Text fields
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => setEditingRow({ ...editingRow, [field]: e.target.value || null })}
          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm"
        />
      );
    }
    
    // Display mode
    if (field.includes('date') || field === 'sh_review_date' || field === 'expected_date' || field === 'start_date' || field === 'end_date') {
      return formatDate(value) || '-';
    }
    
    if (field === 'completion_percentage' && value !== null) {
      return `${value}%`;
    }
    
    return value || '-';
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-slate-400 text-lg">Loading Product Raw Manual Raw Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Product Raw Manual Raw Data</h2>
            <p className="text-slate-400 text-sm">
              Manage Product Raw Manual Raw Data. This table is editable and will be used in other sections.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadKPIs}
              className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Row
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 glass rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2">
            <AlertCircle className="text-rose-400" size={18} />
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 glass rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={18} />
            <p className="text-emerald-400 text-sm">Changes saved successfully!</p>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-4">Add New Initiative</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Initiative *</label>
              <input
                type="text"
                value={newRow.initiative || ''}
                onChange={(e) => setNewRow({ ...newRow, initiative: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                placeholder="Initiative name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">GWOW Gate 1 Status</label>
              <input
                type="text"
                value={newRow.gwow_gate_1_status || ''}
                onChange={(e) => setNewRow({ ...newRow, gwow_gate_1_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Reporter</label>
              <input
                type="text"
                value={newRow.reporter || ''}
                onChange={(e) => setNewRow({ ...newRow, reporter: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">BA</label>
              <input
                type="text"
                value={newRow.ba || ''}
                onChange={(e) => setNewRow({ ...newRow, ba: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Designer</label>
              <input
                type="text"
                value={newRow.designer || ''}
                onChange={(e) => setNewRow({ ...newRow, designer: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Team</label>
              <input
                type="text"
                value={newRow.team || ''}
                onChange={(e) => setNewRow({ ...newRow, team: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Delivery Quarter</label>
              <input
                type="text"
                value={newRow.delivery_quarter || ''}
                onChange={(e) => setNewRow({ ...newRow, delivery_quarter: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                placeholder="Q4 - 2025"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Delivery Status</label>
              <select
                value={newRow.delivery_status || ''}
                onChange={(e) => setNewRow({ ...newRow, delivery_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">Select...</option>
                <option value="Early">Early</option>
                <option value="On Time">On Time</option>
                <option value="Delay">Delay</option>
                <option value="Not Started">Not Started</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Effort in Days</label>
              <input
                type="number"
                value={newRow.effort_in_days || ''}
                onChange={(e) => setNewRow({ ...newRow, effort_in_days: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Completion %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newRow.completion_percentage || ''}
                onChange={(e) => setNewRow({ ...newRow, completion_percentage: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newRow.initiative}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewRow({});
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[2400px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs sticky left-0 bg-slate-900 z-10">Actions</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Initiative</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">GWOW Gate 1 Status</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Reporter</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">BA</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Designer</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Team</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Delivery Q</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">SH Review Date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Expected Date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Start Date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">End Date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Delivery Status</th>
                  <th className="text-right py-3 px-2 text-slate-400 font-semibold text-xs">Effort in Days</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 1</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 2</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 3</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 4</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 5</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 6</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold text-xs">Section 7</th>
                  <th className="text-right py-3 px-2 text-slate-400 font-semibold text-xs">% Completion</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => {
                  const isEditing = editingId === kpi.id;
                  return (
                    <tr key={kpi.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-3 px-2 sticky left-0 bg-slate-900/95 z-10">
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                title="Save"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(kpi)}
                                className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(kpi.id)}
                                disabled={saving}
                                className="p-1.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-white text-sm">{renderCell(kpi, 'initiative', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'gwow_gate_1_status', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'reporter', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'ba', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'designer', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'team', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'delivery_quarter', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'sh_review_date', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'expected_date', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'start_date', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'end_date', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'delivery_status', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm text-right">{renderCell(kpi, 'effort_in_days', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_1', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_2', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_3', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_4', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_5', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_6', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm">{renderCell(kpi, 'section_7', isEditing)}</td>
                      <td className="py-3 px-2 text-slate-300 text-sm text-right">{renderCell(kpi, 'completion_percentage', isEditing)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {kpis.length === 0 && (
              <div className="text-center py-12 mt-4">
                <TrendingUp className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-400 mb-2">No KPIs data found</p>
                <p className="text-slate-500 text-sm">Click "Add Row" to create a new record</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default ProductDepartmentKPIs;

