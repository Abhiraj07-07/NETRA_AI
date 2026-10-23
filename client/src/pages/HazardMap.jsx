import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, ThumbsUp, CheckCircle, Flag, ArrowLeft, MapPin, Filter, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import { speechService } from '../services/speechService';

const CATEGORIES = [
  { id: 'Open Manhole', label: 'Open Manhole / Drain', color: 'text-red-700 bg-red-100 border-red-300' },
  { id: 'Construction Barrier', label: 'Construction / Trench', color: 'text-amber-800 bg-amber-100 border-amber-300' },
  { id: 'Broken Sidewalk', label: 'Broken Curb / Paver Block', color: 'text-yellow-800 bg-yellow-100 border-yellow-300' },
  { id: 'Low Overhead Obstacle', label: 'Low Hanging Branch / Sign', color: 'text-purple-800 bg-purple-100 border-purple-300' },
  { id: 'Parked Vehicle Blockade', label: 'Vehicle Blocking Tactile Path', color: 'text-sky-800 bg-sky-100 border-sky-300' }
];

export default function HazardMap({ onBack }) {
  const [hazards, setHazards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [newHazard, setNewHazard] = useState({
    category: 'Open Manhole',
    title: '',
    description: '',
    severity: 'high',
    locationName: ''
  });

  useEffect(() => {
    loadHazards();
    speechService.speak("Crowd-sourced Hazard Map in light mode. View reported walking hazards or report a new obstacle on your pathway.", { minIntervalMs: 5000 });
  }, []);

  const loadHazards = async () => {
    try {
      const res = await api.getHazards();
      if (res.success) {
        setHazards(res.hazards);
      }
    } catch (e) {
      console.warn('Failed to load hazards:', e);
    }
  };

  const handleVote = async (id) => {
    try {
      const res = await api.updateHazard(id, { action: 'upvote' });
      if (res.success) {
        setHazards(hazards.map(h => h.id === id ? res.hazard : h));
        speechService.speak("Hazard verified with upvote.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await api.updateHazard(id, { action: 'resolve' });
      if (res.success) {
        setHazards(hazards.map(h => h.id === id ? res.hazard : h));
        speechService.speak("Hazard marked as resolved or cleared.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!newHazard.title) return;

    try {
      const res = await api.reportHazard(newHazard);
      if (res.success) {
        setShowReportModal(false);
        setNewHazard({ category: 'Open Manhole', title: '', description: '', severity: 'high', locationName: '' });
        loadHazards();
        speechService.speak(`Hazard reported: ${res.hazard.category}. Other visually impaired travelers have been alerted.`, { priority: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredHazards = filter === 'all' 
    ? hazards 
    : filter === 'active' 
    ? hazards.filter(h => h.status === 'active')
    : hazards.filter(h => h.status === 'resolved');

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            aria-label="Back to Home Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Crowd-Sourced Hazard Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Community alerts • Open manholes, construction zones & sidewalk blocks
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Hazard</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {['all', 'active', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                filter === f 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f} ({f === 'all' ? hazards.length : hazards.filter(h => h.status === f).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const activeList = hazards.filter(h => h.status === 'active');
            speechService.speak(`There are ${activeList.length} active reported hazards in this vicinity. First is ${activeList[0]?.title || 'none'}.`, { priority: true });
          }}
          className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-bold"
        >
          <Volume2 className="w-4 h-4" />
          <span>Read Hazards Aloud</span>
        </button>
      </div>

      {/* Hazards List */}
      <div className="space-y-3">
        {filteredHazards.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-sm shadow-xs font-medium">
            No hazards found in this view.
          </div>
        ) : (
          filteredHazards.map(h => (
            <div
              key={h.id}
              className={`p-5 rounded-3xl border transition-all ${
                h.status === 'resolved' 
                  ? 'bg-slate-50 border-slate-200 opacity-75' 
                  : h.severity === 'critical'
                  ? 'bg-red-50/40 border-red-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      h.severity === 'critical' 
                        ? 'bg-red-100 text-red-800 border-red-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {h.category}
                    </span>
                    {h.status === 'resolved' ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        Active Risk
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{h.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {h.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolve(h.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Mark as Cleared / Resolved"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cleared</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleVote(h.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-amber-700 flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Upvote / Verify"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{h.upvotes || 1}</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-700 font-medium mb-3">{h.description}</p>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>{h.locationName}</span>
                </div>
                <div>
                  Reported by <span className="text-slate-900 font-bold">{h.reportedBy}</span> • {new Date(h.reportedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Hazard Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Report Walking Hazard
            </h3>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hazard Category</label>
                <select
                  value={newHazard.category}
                  onChange={e => setNewHazard({ ...newHazard, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title / Brief Hazard Label</label>
                <input
                  type="text"
                  required
                  value={newHazard.title}
                  onChange={e => setNewHazard({ ...newHazard, title: e.target.value })}
                  placeholder="e.g. Uncovered drain trench across pathway"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Landmark</label>
                <input
                  type="text"
                  value={newHazard.locationName}
                  onChange={e => setNewHazard({ ...newHazard, locationName: e.target.value })}
                  placeholder="e.g. In front of Administrative Block Gate"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Navigation Advice</label>
                <textarea
                  rows={3}
                  value={newHazard.description}
                  onChange={e => setNewHazard({ ...newHazard, description: e.target.value })}
                  placeholder="e.g. Keep to extreme right; tactile tiles are disrupted by deep ditch."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
