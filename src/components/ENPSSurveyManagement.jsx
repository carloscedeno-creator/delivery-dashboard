import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Power,
  PowerOff,
  BarChart3,
  Calendar
} from 'lucide-react';
import { getCurrentUser } from '../utils/authService';
import {
  getAllSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  activateSurvey,
  deactivateSurvey,
  getSurveyResults
} from '../services/enpsSurveyManagementService';

/**
 * eNPS Survey Management Component
 * Allows managing periodic eNPS surveys in 3 Amigos section
 */
const ENPSSurveyManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({
    survey_name: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: false
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [surveyResults, setSurveyResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSurveys({ includeInactive: true });
      setSurveys(data);
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error loading surveys:', err);
      setError(err.message || 'Error loading surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setNewRow({
      survey_name: '',
      description: '',
      start_date: '',
      end_date: '',
      is_active: false
    });
    setShowAddForm(true);
    setError(null);
  };

  const handleSaveNew = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!newRow.survey_name || !newRow.start_date) {
        setError('Survey name and start date are required');
        return;
      }

      await createSurvey(newRow);
      setShowAddForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSurveys();
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error creating survey:', err);
      setError(err.message || 'Error creating survey');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (survey) => {
    setEditingId(survey.id);
    setEditingRow({ ...survey });
    setError(null);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!editingRow.survey_name || !editingRow.start_date) {
        setError('Survey name and start date are required');
        return;
      }

      await updateSurvey(editingId, editingRow);
      setEditingId(null);
      setEditingRow(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSurveys();
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error updating survey:', err);
      setError(err.message || 'Error updating survey');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingRow(null);
    setShowAddForm(false);
    setNewRow({});
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this survey? This will not delete the responses, but they will no longer be associated with a survey.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteSurvey(id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSurveys();
      if (selectedSurveyId === id) {
        setSelectedSurveyId(null);
        setSurveyResults(null);
      }
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error deleting survey:', err);
      setError(err.message || 'Error deleting survey');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (survey) => {
    try {
      setSaving(true);
      setError(null);
      
      if (survey.is_active) {
        await deactivateSurvey(survey.id);
      } else {
        await activateSurvey(survey.id);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSurveys();
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error toggling survey:', err);
      setError(err.message || 'Error updating survey status');
    } finally {
      setSaving(false);
    }
  };

  const handleViewResults = async (surveyId) => {
    try {
      setLoadingResults(true);
      setError(null);
      const results = await getSurveyResults(surveyId);
      setSurveyResults(results);
      setSelectedSurveyId(surveyId);
    } catch (err) {
      console.error('[ENPS_SURVEY_MGMT] Error loading results:', err);
      setError(err.message || 'Error loading survey results');
    } finally {
      setLoadingResults(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading surveys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <MessageSquare className="text-blue-400" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">eNPS Survey Management</h2>
              <p className="text-slate-400 text-sm">
                Create and manage periodic eNPS surveys. Only one survey can be active at a time.
              </p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Survey
          </button>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-4 glass rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={18} />
            <p className="text-emerald-400 text-sm">Survey saved successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-4 glass rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2">
            <AlertCircle className="text-rose-400" size={18} />
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Surveys Table */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Survey Name</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Description</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Start Date</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">End Date</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Status</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add Form */}
            {showAddForm && (
              <tr className="border-b border-slate-700/30 bg-slate-800/30">
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newRow.survey_name}
                    onChange={(e) => setNewRow({ ...newRow, survey_name: e.target.value })}
                    placeholder="e.g., jan2026"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newRow.description}
                    onChange={(e) => setNewRow({ ...newRow, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="date"
                    value={newRow.start_date}
                    onChange={(e) => setNewRow({ ...newRow, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="date"
                    value={newRow.end_date}
                    onChange={(e) => setNewRow({ ...newRow, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </td>
                <td className="py-3 px-4 text-center">
                  <label className="flex items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRow.is_active}
                      onChange={(e) => setNewRow({ ...newRow, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-slate-300 text-sm">Active</span>
                  </label>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleSaveNew}
                      disabled={saving}
                      className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Survey Rows */}
            {surveys.map((survey) => (
              <tr
                key={survey.id}
                className={`border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors ${
                  survey.is_active ? 'bg-emerald-500/5' : ''
                }`}
              >
                {editingId === survey.id ? (
                  <>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={editingRow.survey_name}
                        onChange={(e) => setEditingRow({ ...editingRow, survey_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={editingRow.description || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="date"
                        value={editingRow.start_date}
                        onChange={(e) => setEditingRow({ ...editingRow, start_date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="date"
                        value={editingRow.end_date || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, end_date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingRow.is_active}
                          onChange={(e) => setEditingRow({ ...editingRow, is_active: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-slate-300 text-sm">Active</span>
                      </label>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-white font-medium">{survey.survey_name}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm">{survey.description || '-'}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {new Date(survey.start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {survey.end_date ? new Date(survey.end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {survey.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          <Power size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 text-slate-400 text-xs font-medium">
                          <PowerOff size={12} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewResults(survey.id)}
                          className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                          title="View Results"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(survey)}
                          disabled={saving}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            survey.is_active
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                          }`}
                          title={survey.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {survey.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button
                          onClick={() => handleEdit(survey)}
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {surveys.length === 0 && !showAddForm && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No surveys found. Click "New Survey" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Survey Results Panel */}
      {selectedSurveyId && surveyResults && (
        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-400" size={24} />
              <div>
                <h3 className="text-xl font-bold text-white">
                  Results: {surveyResults.survey.survey_name}
                </h3>
                <p className="text-slate-400 text-sm">
                  {surveyResults.survey.description || 'Survey results'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedSurveyId(null);
                setSurveyResults(null);
              }}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {loadingResults ? (
            <div className="text-center py-8">
              <p className="text-slate-400">Loading results...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="glass rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-400 text-sm mb-1">Total Responses</div>
                <div className="text-3xl font-bold text-white">{surveyResults.totalResponses}</div>
              </div>
              <div className="glass rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/10">
                <div className="text-emerald-400 text-sm mb-1">Promoters (9-10)</div>
                <div className="text-3xl font-bold text-emerald-400">{surveyResults.promoters}</div>
              </div>
              <div className="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/10">
                <div className="text-amber-400 text-sm mb-1">Passives (7-8)</div>
                <div className="text-3xl font-bold text-amber-400">{surveyResults.passives}</div>
              </div>
              <div className="glass rounded-xl p-4 border border-rose-500/30 bg-rose-500/10">
                <div className="text-rose-400 text-sm mb-1">Detractors (0-6)</div>
                <div className="text-3xl font-bold text-rose-400">{surveyResults.detractors}</div>
              </div>
            </div>
          )}

          {surveyResults.totalResponses > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4 border border-cyan-500/30 bg-cyan-500/10">
                <div className="text-cyan-400 text-sm mb-1">eNPS Score</div>
                <div className="text-4xl font-bold text-cyan-400">{surveyResults.enps}</div>
                <div className="text-slate-400 text-xs mt-2">
                  {surveyResults.enps}% = ({surveyResults.promoters} - {surveyResults.detractors}) / {surveyResults.totalResponses} × 100
                </div>
              </div>
              <div className="glass rounded-xl p-4 border border-blue-500/30 bg-blue-500/10">
                <div className="text-blue-400 text-sm mb-1">Average Score</div>
                <div className="text-4xl font-bold text-blue-400">{surveyResults.avgScore}</div>
                <div className="text-slate-400 text-xs mt-2">
                  Average of all responses
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ENPSSurveyManagement;

