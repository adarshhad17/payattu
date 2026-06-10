import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPersons, createPerson, updatePerson, deletePerson } from '../store/personsSlice';
import { addKoduthath } from '../store/koduthathSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.persons);
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', iGive: '', theyGive: '', koduthath: '' });
  const [saving, setSaving] = useState(false);

  const [koduthathInputs, setKoduthathInputs] = useState({});
  const [koduthathSaving, setKoduthathSaving] = useState(null);
  const [savedKoduthaths, setSavedKoduthaths] = useState(new Set());

  const handleKoduthathSave = async (personId) => {
    const amount = Number(koduthathInputs[personId]);
    if (!amount || amount <= 0) return;
    setKoduthathSaving(personId);
    await dispatch(addKoduthath({ personId, amount, note: '' }));
    // addKoduthath already updates the person in the list via updatePersonInList
    setKoduthathSaving(null);
    setSavedKoduthaths((prev) => new Set([...prev, personId]));
  };

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', iGive: '', theyGive: '', koduthath: '' });
  const [editSaving, setEditSaving] = useState(false);


  useEffect(() => {
    dispatch(fetchPersons());
  }, [dispatch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await dispatch(createPerson({
      name: form.name,
      iGive: Number(form.iGive) || 0,
      theyGive: Number(form.theyGive) || 0,
    }));
    const koduthathAmount = Number(form.koduthath);
    if (koduthathAmount > 0 && result.payload?._id) {
      // addKoduthath updates the person in the list automatically
      await dispatch(addKoduthath({ personId: result.payload._id, amount: koduthathAmount, note: '' }));
    }
    setSaving(false);
    setForm({ name: '', iGive: '', theyGive: '', koduthath: '' });
  };

  const openEdit = (e, p) => {
    e.stopPropagation();
    setEditTarget(p);
    setEditForm({ name: p.name, iGive: p.iGive, theyGive: p.theyGive, koduthath: p.koduthathTotal || 0 });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const newKoduthathTotal = Number(editForm.koduthath);
      await dispatch(updatePerson({
        id: editTarget._id,
        name: editForm.name,
        iGive: Number(editForm.iGive),
        theyGive: Number(editForm.theyGive),
        koduthathTotal: newKoduthathTotal,
      }));
      await dispatch(fetchPersons());
    } finally {
      setEditSaving(false);
      setEditTarget(null);
    }
  };

  const handleToggleActive = async (e, p) => {
    e.stopPropagation();
    await dispatch(updatePerson({ id: p._id, active: !p.active }));
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${name}?`)) return;
    dispatch(deletePerson(id));
  };

  const totalIGive = list.reduce((s, p) => s + (p.iGive || 0), 0);
  const totalTheyGive = list.reduce((s, p) => s + (p.theyGive || 0), 0);
  const totalKoduthath = list.reduce((s, p) => s + (p.koduthathTotal || 0), 0);
  // കൊടുക്കാനുള്ളത് = theyGive - iGive
  const totalKodukkanullath = list.reduce((s, p) => {
    const diff = (p.theyGive || 0) - (p.iGive || 0);
    return s + (diff > 0 ? diff : 0);
  }, 0);
  const totalKittanullath = list.reduce((s, p) => {
    const diff = (p.theyGive || 0) - (p.iGive || 0);
    return s + (diff < 0 ? Math.abs(diff) : 0);
  }, 0);
  const newlyGivenCount = list.filter(p => (p.koduthathTotal || 0) > 0).length;
  const totalCount = list.length;

  // ── Export helpers ─────────────────────────────────────────────
  const exportRows = () => list.map((p, i) => {
    const diff = (p.theyGive || 0) - (p.iGive || 0);
    return {
      '#': i + 1,
      'പേര്': p.name,
      'കൊടുത്തത്': p.iGive || 0,
      'തന്നത്': p.theyGive || 0,
      'കൊടുക്കാനുള്ളത്': diff > 0 ? diff : 0,
      'കിട്ടാനുള്ളത്': diff < 0 ? Math.abs(diff) : 0,
      'പുതുതായി കൊടുത്തത്': p.koduthathTotal || 0,
      'ഇനി കിട്ടാനുള്ളത്': (p.koduthathTotal || 0) - diff,
      'Status': p.active === false ? 'Inactive' : 'Active',
    };
  });

  const handleExportJSON = () => {
    const data = JSON.stringify(exportRows(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payyatu_data.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payyatu');
    XLSX.writeFile(wb, 'payyatu_data.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Payyatu - Financial Summary', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['#', 'Name', 'Koduthath', 'Thannath', 'Kodukkanullath', 'Kittanullath', 'Puthuthayee', 'Ini Kittanullath']],
      body: list.map((p, i) => {
        const diff = (p.theyGive || 0) - (p.iGive || 0);
        return [
          i + 1, p.name,
          p.iGive || 0, p.theyGive || 0,
          diff > 0 ? diff : 0,
          diff < 0 ? Math.abs(diff) : 0,
          p.koduthathTotal || 0,
          (p.koduthathTotal || 0) - diff,
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save('payyatu_data.pdf');
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 py-6 space-y-6 ${!isAdmin ? 'min-h-screen md:bg-transparent bg-pink-100/20' : ''}`}>

      {/* Export buttons — admin only, desktop */}
      {isAdmin && (
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-700">Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={handleExportJSON}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
              ⬇ JSON
            </button>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-green-300 text-green-600 hover:bg-green-50 transition-colors">
              ⬇ Excel
            </button>
            <button onClick={handleExportPDF}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
              ⬇ PDF
            </button>
          </div>
        </div>
      )}

      {/* Summary stats — admin: all cards; parent desktop: all cards; parent mobile: only newly given */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">കൊടുത്തത് ആകെ</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalIGive}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">പുതുതായി കൊടുത്തത് ആകെ</p>
          <p className="text-2xl font-bold text-indigo-600">₹{totalKoduthath}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">തന്നത് ആകെ</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalTheyGive}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">കിട്ടാനുള്ളത് ആകെ</p>
          <p className="text-2xl font-bold text-green-600">₹{totalKittanullath}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">കൊടുക്കാനുള്ളത് ആകെ</p>
          <p className="text-2xl font-bold text-red-500">₹{totalKodukkanullath}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">പുതുതായി കൊടുത്തത്</p>
          <p className="text-2xl font-bold text-gray-800">
            {newlyGivenCount}
            <span className="text-gray-400 font-medium text-lg"> / {totalCount}</span>
          </p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: totalCount ? `${(newlyGivenCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>



      {/* Add Person form — admin only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">ആളെ ചേർക്കുക</h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-36">
              <label className="text-sm text-pink-600">പേര്</label>
              <input
                required
                placeholder="പേര്"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-28">
              <label className="text-sm text-pink-500">മുൻപ് കിട്ടാനുള്ളത് (₹)</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.iGive}
                onChange={(e) => setForm({ ...form, iGive: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-28">
              <label className="text-sm text-pink-500">തന്നത് (₹)</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.theyGive}
                onChange={(e) => setForm({ ...form, theyGive: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-28">
              <label className="text-sm text-blue-500">പുതുതായി കൊടുത്തത് (₹)</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.koduthath}
                onChange={(e) => setForm({ ...form, koduthath: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-60 self-end"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* People — header + search + filter */}
      <div className={`sticky top-0 z-20 space-y-3 py-3 -mx-4 px-4 ${!isAdmin ? 'bg-gray-800 md:bg-white' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className={`text-base font-semibold shrink-0 ${!isAdmin ? 'hidden sm:block text-gray-700' : 'text-gray-700'}`}>ആളുകൾ</h2>
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="പേര് തിരയുക…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!isAdmin ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 md:bg-white md:border-gray-300 md:text-gray-900 md:placeholder-gray-400' : 'bg-white border-gray-300'}`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Total count — admin only */}
        {isAdmin && (
          <p className="text-xs text-pink-700">Total = {totalCount}</p>
        )}

        {/* Filter chips */}
        <div className="hidden md:flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'എല്ലാം', color: 'bg-gray-800 text-white', inactive: 'bg-white text-gray-600 border border-gray-300' },
            { key: 'kittanullath', label: 'കിട്ടാനുള്ളത്', color: 'bg-green-600 text-white', inactive: 'bg-white text-green-600 border border-green-300' },
            { key: 'kodukkanullath', label: 'കൊടുക്കാനുള്ളത്', color: 'bg-red-500 text-white', inactive: 'bg-white text-red-500 border border-red-300' },
            { key: 'settled', label: 'കൊടുക്കാനില്ല', color: 'bg-gray-500 text-white', inactive: 'bg-white text-gray-500 border border-gray-300' },
            { key: 'newly', label: 'പുതുതായി കൊടുത്തത്', color: 'bg-indigo-600 text-white', inactive: 'bg-white text-indigo-600 border border-indigo-300' },
          ].map(({ key, label, color, inactive }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filter === key ? color : inactive}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && !list.length ? (
        <p className="text-center text-gray-400 py-12">Loading…</p>
      ) : !list.length ? (
        <p className="text-center text-gray-400 py-12">ആരെയും ചേർത്തിട്ടില്ല.</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-4">
            {list.filter(p => {
              const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
              const d = (p.theyGive || 0) - (p.iGive || 0); // കൊടുക്കാനുള്ളത് = theyGive - iGive
              const matchFilter =
                filter === 'all' ? true :
                  filter === 'kittanullath' ? d < 0 :
                    filter === 'kodukkanullath' ? d > 0 :
                      filter === 'settled' ? d === 0 :
                        filter === 'newly' ? (p.koduthathTotal || 0) > 0 : true;
              return matchSearch && matchFilter;
            }).map((p, idx) => {
              const diff = (p.theyGive || 0) - (p.iGive || 0); // കൊടുക്കാനുള്ളത് = theyGive - iGive
              const kittanullath = (p.koduthathTotal || 0) - diff;
              const balanceColor =
                diff === 0 ? 'text-white' :
                  diff > 0 ? 'text-red-500' :
                    'text-green-600';
              const balanceBg =
                diff === 0 ? 'bg-green-500 border-green-500' :
                  diff > 0 ? 'bg-red-50 border-red-200' :
                    'bg-green-50 border-green-200';
              const balanceLabel =
                diff > 0 ? 'കൊടുക്കാനുള്ളത്' :
                  diff < 0 ? 'കിട്ടാനുള്ളത്' :
                    'കൊടുക്കാനില്ല';
              const balanceAmount =
                diff === 0 ? '' : `₹${Math.abs(diff)}`;
              const inactive = p.active === false;

              return (
                <div
                  key={p._id}
                  className={`bg-gray-900 rounded-3xl border shadow-lg overflow-hidden transition-all duration-300 ${savedKoduthaths.has(p._id) ? 'border-green-500' : 'border-pink-400'} ${inactive ? 'opacity-50' : ''}`}
                >
                  {/* Header */}
                  <div className="px-6 pt-8 pb-6">
                    {/* Name row — full width, no truncate */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs shrink-0 text-gray-500">#{String(idx + 1).padStart(2, '0')}</span>
                      <p className="text-xl font-medium capitalize leading-tight text-yellow-300">{p.name}</p>
                      {inactive && (
                        <span className="ml-1 inline-block text-xs px-2 py-0.5 rounded-full shrink-0 bg-gray-800 text-gray-500">
                          നിർത്തിവെച്ചത്
                        </span>
                      )}
                    </div>
                    {/* Post-save banner */}
                    {savedKoduthaths.has(p._id) && (
                      <div className="flex flex-col items-center justify-center text-center bg-green-50 rounded-2xl px-6 py-4 w-full -mx-0">
                        <p className="text-sm font-semibold text-pink-500 mb-1">കൊടുക്കാനില്ല</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm font-medium text-blue-500">കിട്ടാനുള്ളത് =</p>
                          <p className="text-2xl font-extrabold text-green-600">
                            <span className="text-gray-400 text-base mr-1">₹</span>{kittanullath}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Balance badge — hidden when koduthath saved */}
                    {!savedKoduthaths.has(p._id) && !(p.koduthathTotal > 0) && (
                      <div className={`inline-flex flex-col items-start border rounded-2xl px-4 py-3 ${balanceBg}`}>
                        <p className={`text-xs font-semibold mb-0.5 ${balanceColor}`}>{balanceLabel}</p>
                        <p className={`text-2xl font-extrabold leading-none ${balanceColor}`}>{balanceAmount}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className={`border-t border-gray-800 `}>
                    <div className="grid grid-cols-2">
                      <div className="px-5 py-5 text-center border-r border-gray-800">
                        <p className="text-xs text-red-500 mb-2 font-medium tracking-wide uppercase">മുൻപ് കിട്ടാനുള്ളത്</p>
                        <p className="text-2xl font-extrabold text-white"><span className="text-gray-500 text-base mr-1">₹</span>{p.iGive}</p>
                      </div>
                      <div className="px-5 py-5 text-center">
                        <p className="text-xs text-green-500 mb-2 font-medium tracking-wide uppercase">തന്നത്</p>
                        <p className="text-2xl font-extrabold text-white"><span className="text-gray-500 text-base mr-1">₹</span>{p.theyGive}</p>
                      </div>
                    </div>
                    {(p.koduthathTotal || 0) > 0 ? (
                        <div className="grid grid-cols-2 border-t border-gray-800">
                          <div className="px-5 py-5 text-center border-r border-gray-800">
                            <p className="text-xs text-violet-400 mb-2 font-medium tracking-wide uppercase">പുതുതായി കൊടുത്തത്</p>
                            <p className="text-2xl font-extrabold text-white"><span className="text-gray-500 text-base mr-1">₹</span>{p.koduthathTotal}</p>
                          </div>
                          <div className="px-5 py-5 text-center">
                            <p className="text-xs text-indigo-400 mb-2 font-medium tracking-wide uppercase">ഇനി കിട്ടാനുള്ളത്</p>
                            <p className={`text-2xl font-extrabold ${kittanullath > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                              {kittanullath > 0 ? <><span className="text-gray-500 text-base mr-1">₹</span>{kittanullath}</> : '—'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 pt-4 pb-6 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <p className="text-xs text-violet-400 mb-3">പുതുതായി കൊടുത്തത്</p>
                              <input
                                type="number"
                                min="0"
                                placeholder="ഇന്ന് പയറ്റിയത്..."
                                value={koduthathInputs[p._id] || ''}
                                onChange={(e) => setKoduthathInputs((prev) => ({ ...prev, [p._id]: e.target.value }))}
                                className="w-full border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            {!!koduthathInputs[p._id] && (
                              <button
                                onClick={() => handleKoduthathSave(p._id)}
                                disabled={koduthathSaving === p._id}
                                className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                              >
                                {koduthathSaving === p._id ? '...' : 'Save'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    }
                  </div>

                  {/* Actions — hidden on mobile */}
                  {isAdmin && (
                    <div
                      className="hidden md:flex items-center gap-2 px-6 py-4 bg-gray-800 border-t border-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => openEdit(e, p)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-indigo-400 bg-gray-700 border border-gray-600 hover:bg-gray-600 py-2.5 rounded-xl transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleToggleActive(e, p)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl border transition-colors ${inactive ? 'text-green-400 bg-gray-700 border-gray-600 hover:bg-gray-600' : 'text-yellow-400 bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                      >
                        {inactive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        )}
                        {inactive ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, p._id, p.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-red-400 bg-gray-700 border border-gray-600 hover:bg-gray-600 py-2.5 rounded-xl transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 text-xs text-pink-500 uppercase tracking-wide divide-x divide-pink-200 font-medium border-b border-pink-100">
                    <th className="text-left px-3 py-3 font-medium w-8">#</th>
                    <th className="text-left px-5 py-3 font-medium">പേര്</th>
                    <th className="text-right px-5 py-3 font-medium">കൊടുത്തത്</th>
                    <th className="text-right px-5 py-3 font-medium">തന്നത്</th>
                    <th className="text-right px-5 py-3 font-medium">കൊടുക്കാനുള്ളത്</th>
                    <th className="text-right px-5 py-3 font-medium">പുതുതായി കൊടുത്തത്</th>
                    <th className="text-right px-5 py-3 font-medium">ഇനി കിട്ടാനുള്ളത്</th>
                    {isAdmin && <th className="text-center px-5 py-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.filter(p => {
                    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
                    const d = p.theyGive - p.iGive;
                    const matchFilter =
                      filter === 'all' ? true :
                        filter === 'kittanullath' ? d < 0 :
                          filter === 'kodukkanullath' ? d > 0 :
                            filter === 'settled' ? d === 0 :
                              filter === 'newly' ? (p.koduthathTotal || 0) > 0 : true;
                    return matchSearch && matchFilter;
                  }).map((p, idx) => {
                    // കൊടുക്കാനുള്ളത് = theyGive - iGive
                    const diff = (p.theyGive || 0) - (p.iGive || 0);
                    const balanceText =
                      diff > 0 ? `₹${diff}` :
                        diff < 0 ? `₹${Math.abs(diff)}` :
                          'കൊടുക്കാനില്ല';
                    const balanceColor =
                      diff > 0 ? 'text-red-500' :
                        'text-green-600';
                    const balanceBg =
                      diff === 0 ? 'bg-black rounded-lg px-2 py-0.5 inline-block' : '';
                    const inactive = p.active === false;
                    // ഇനി കിട്ടാനുള്ളത്: if diff<0 (കിട്ടാനുള്ളത്) = koduthathTotal + |diff|; if diff>0 = koduthathTotal - diff
                    const kittanullath = (p.koduthathTotal || 0) - diff;

                    return (
                      <tr
                        key={p._id}
                        className={`hover:bg-gray-50 transition-colors divide-x divide-gray-100 ${inactive ? 'opacity-40' : ''}`}
                      >
                        <td className="px-3 py-3 text-gray-400 text-sm w-8">{idx + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-800 capitalize">
                          {p.name}
                          {inactive && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                              നിർത്തിവെച്ചത്
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{p.iGive}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{p.theyGive}</td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {diff < 0 ? (
                            <span className="text-green-600 flex flex-col items-end leading-tight">
                              <span className="text-xs font-medium">കിട്ടാനുള്ളത്</span>
                              <span>{balanceText}</span>
                            </span>
                          ) : (
                            <span className={`${balanceColor} ${balanceBg}`}>{balanceText}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-indigo-600 font-medium">
                          <span className="text-sm">{p.koduthathTotal ?? 0}</span>
                          {isAdmin && p.koduthathUpdatedAt && (
                            <div className="font-normal mt-0.5 text-right">
                              {p.koduthathUpdatedBy?.name && (
                                <div className="text-xs text-black">{p.koduthathUpdatedBy.name}</div>
                              )}
                              <div className="text-xs text-black">
                                {new Date(p.koduthathUpdatedAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${kittanullath > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {kittanullath > 0 ? `₹${kittanullath}` : '—'}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Edit"
                                onClick={(e) => openEdit(e, p)}
                                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                                </svg>
                              </button>
                              <button
                                title={inactive ? 'Activate' : 'Deactivate'}
                                onClick={(e) => handleToggleActive(e, p)}
                                className={`p-1.5 rounded-lg transition-colors ${inactive ? 'text-green-500 hover:bg-green-50' : 'text-yellow-500 hover:bg-yellow-50'}`}
                              >
                                {inactive ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                )}
                              </button>
                              <button
                                title="Delete"
                                onClick={(e) => handleDelete(e, p._id, p.name)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">തിരുത്തുക</h3>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">പേര്</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">കൊടുത്തത് (₹)</label>
                <input
                  type="number" min="0"
                  value={editForm.iGive}
                  onChange={(e) => setEditForm({ ...editForm, iGive: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">തന്നത് (₹)</label>
                <input
                  type="number" min="0"
                  value={editForm.theyGive}
                  onChange={(e) => setEditForm({ ...editForm, theyGive: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">കൊടുത്തത് ആകെ (koduthath) (₹)</label>
                <input
                  type="number" min="0"
                  value={editForm.koduthath}
                  onChange={(e) => setEditForm({ ...editForm, koduthath: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={editSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
