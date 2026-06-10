import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPerson, updatePerson } from '../store/personsSlice';
import { fetchKoduthath, addKoduthath, deleteKoduthath } from '../store/koduthathSlice';

export default function PersonDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { current: person, loading: pLoading } = useSelector((s) => s.persons);
  const { entries, loading: kLoading } = useSelector((s) => s.koduthath);
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [saving, setSaving] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', iGive: '', theyGive: '' });

  useEffect(() => {
    dispatch(fetchPerson(id));
    dispatch(fetchKoduthath(id));
  }, [dispatch, id]);


  const handleAddEntry = async (e) => {
    e.preventDefault();
    setSaving(true);
    await dispatch(addKoduthath({ personId: id, amount: Number(form.amount), note: form.note }));
    await dispatch(fetchPerson(id));
    setSaving(false);
    setForm({ amount: '', note: '' });
    setShowAdd(false);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Delete this entry?')) return;
    await dispatch(deleteKoduthath(entryId));
    await dispatch(fetchPerson(id));
  };

  const handleEditPerson = async (e) => {
    e.preventDefault();
    setSaving(true);
    await dispatch(updatePerson({
      id,
      name: editForm.name,
      iGive: Number(editForm.iGive),
      theyGive: Number(editForm.theyGive),
    }));
    await dispatch(fetchPerson(id));
    setSaving(false);
    setShowEdit(false);
  };

  if (pLoading && !person) return <p className="text-center text-gray-400 py-16">Loading…</p>;
  if (!person) return null;

  // Kodukkanullath = iGive - theyGive (per spec)
  const totalGiven = (person.iGive || 0) + (person.koduthathTotal || 0);
  const diff = totalGiven - person.theyGive;   // positive = still owe, negative = they owe us
  const balanceLabel =
    diff === 0 ? 'കൊടുക്കാനില്ല' : diff > 0 ? 'കൊടുക്കാനുള്ളത്' : 'കിട്ടാനുള്ളത്';
  const balanceColor =
    diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-red-500' : 'text-green-600';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-indigo-500 hover:text-indigo-700 mb-4 inline-flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Person Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{person.name}</h2>
            <p className={`text-sm font-medium mt-1 ${balanceColor}`}>
              {balanceLabel}
              {diff !== 0 && <span className="ml-1">₹{Math.abs(diff)}</span>}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditForm({ name: person.name, iGive: person.iGive, theyGive: person.theyGive });
                setShowEdit(true);
              }}
              className="text-sm text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs text-indigo-400 uppercase tracking-wide">കൊടുത്തത്</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">₹{(person.iGive ?? 0) + (person.koduthathTotal ?? 0)}</p>
            <p className="text-[10px] text-indigo-300 mt-0.5">({person.iGive ?? 0} + {person.koduthathTotal ?? 0})</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">പഴയത്</p>
            <p className="text-xl font-bold text-gray-600 mt-1">₹{person.iGive ?? 0}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">തന്നത്</p>
            <p className="text-xl font-bold text-gray-700 mt-1">₹{person.theyGive}</p>
          </div>
          {/* ഇനി കിട്ടാനുള്ളത് = koduthathTotal - kodukkanullath */}
          {(() => {
            const kodukkanullath = Math.max(diff, 0);
            const remaining = (person.koduthathTotal || 0) - kodukkanullath;
            return (
              <div className={`rounded-xl p-3 text-center ${remaining > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${remaining > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                  ഇനി കിട്ടാനുള്ളത്
                </p>
                <p className={`text-xl font-bold mt-1 ${remaining > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                  {remaining > 0 ? `₹${remaining}` : '—'}
                </p>
              </div>
            );
          })()}</div>
      </div>

      {/* Koduthath section */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">കൊടുത്തത്</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add
        </button>
      </div>

      {kLoading && !entries.length ? (
        <p className="text-center text-gray-400 py-8">Loading…</p>
      ) : !entries.length ? (
        <p className="text-center text-gray-400 py-8">എൻട്രികൾ ഒന്നുമില്ല.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-700">₹{entry.amount}</p>
                {entry.note && <p className="text-sm text-gray-400">{entry.note}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {entry.addedBy?.name ?? 'Unknown'} &middot; {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteEntry(entry._id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors ml-4 shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add entry modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">കൊടുത്തത് ചേർക്കുക</h3>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                placeholder="തുക (₹)"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                placeholder="കുറിപ്പ് (ഓപ്ഷണൽ)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit person modal (admin only) */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">തിരുത്തുക</h3>
            <form onSubmit={handleEditPerson} className="space-y-3">
              <input
                required
                placeholder="പേര്"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="number"
                min="0"
                placeholder="കൊടുത്തത് ആകെ"
                value={editForm.iGive}
                onChange={(e) => setEditForm({ ...editForm, iGive: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="number"
                min="0"
                placeholder="തന്നത് ആകെ"
                value={editForm.theyGive}
                onChange={(e) => setEditForm({ ...editForm, theyGive: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
