import React, { useEffect, useState, useCallback } from 'react';
import { vehicleAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, SearchBar, Button, Input, Select, Pagination, EmptyState } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const MAINTENANCE_TYPES = ['preventive', 'corrective', 'emergency', 'inspection'].map(v => ({
  value: v, label: v.charAt(0).toUpperCase() + v.slice(1)
}));

const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled'].map(v => ({
  value: v, label: v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}));

const MaintenanceForm = ({ vehicles, onSave, onClose }) => {
  const [form, setForm] = useState({
    vehicle_id: '',
    maintenance_type: 'preventive',
    description: '',
    provider: '',
    cost: '',
    odometer_at_service: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    next_service_date: '',
    status: 'scheduled',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id) { toast.error('Please select a vehicle'); return; }
    setLoading(true);
    try {
      await vehicleAPI.addMaintenance(form.vehicle_id, {
        maintenance_type: form.maintenance_type,
        description: form.description,
        provider: form.provider,
        cost: form.cost || 0,
        odometer_at_service: form.odometer_at_service || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        next_service_date: form.next_service_date || null,
        status: form.status,
        notes: form.notes
      });
      toast.success('Maintenance record added');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to add maintenance record');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Vehicle *"
        name="vehicle_id"
        value={form.vehicle_id}
        onChange={handleChange}
        options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.plate_number})` }))}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type *" name="maintenance_type" value={form.maintenance_type} onChange={handleChange} options={MAINTENANCE_TYPES} />
        <Select label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />
        <Input label="Cost (₱)" type="number" name="cost" value={form.cost} onChange={handleChange} min={0} step="0.01" />
        <Input label="Odometer at Service (km)" type="number" name="odometer_at_service" value={form.odometer_at_service} onChange={handleChange} />
        <Input label="Start Date *" type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
        <Input label="End Date" type="date" name="end_date" value={form.end_date} onChange={handleChange} />
        <Input label="Next Service Date" type="date" name="next_service_date" value={form.next_service_date} onChange={handleChange} />
        <Input label="Service Provider" name="provider" value={form.provider} onChange={handleChange} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea name="description" value={form.description} onChange={handleChange} required rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Add Maintenance Record</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

const typeColor = {
  preventive: 'bg-blue-100 text-blue-800',
  corrective: 'bg-yellow-100 text-yellow-800',
  emergency: 'bg-red-100 text-red-800',
  inspection: 'bg-purple-100 text-purple-800'
};

const Maintenance = () => {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Fetch all vehicles for the dropdown and to gather their maintenance logs
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes] = await Promise.all([
        vehicleAPI.getAll({ limit: 100 })
      ]);
      const vehicleList = vRes.data || [];
      setVehicles(vehicleList);

      // Gather maintenance logs from each vehicle's details
      const allLogs = [];
      await Promise.all(
        vehicleList.slice(0, 20).map(async (v) => {
          try {
            const detail = await vehicleAPI.getById(v.id);
            const logs = detail.data?.maintenanceLogs || [];
            logs.forEach(log => allLogs.push({ ...log, vehicle: { name: v.name, plate_number: v.plate_number } }));
          } catch { /* skip */ }
        })
      );

      // Sort by date descending
      allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const filtered = search
        ? allLogs.filter(l =>
            l.description?.toLowerCase().includes(search.toLowerCase()) ||
            l.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
            l.provider?.toLowerCase().includes(search.toLowerCase())
          )
        : allLogs;

      const perPage = 15;
      setTotalPages(Math.max(1, Math.ceil(filtered.length / perPage)));
      setRecords(filtered.slice((page - 1) * perPage, page * perPage));
    } catch (err) {
      toast.error('Failed to load maintenance records');
      console.error('[Maintenance] fetch error:', err);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>

      <div className='tblMainContainer'>
        <div className='tblContainer'>
          <SearchBar 
            value={search} 
            onChange={v => { setSearch(v); setPage(1); }} 
            placeholder="Search by vehicle, description, or provider..." >
              <Button onClick={() => setShowForm(true)}>+ Add Record</Button>
          </ SearchBar >

          {loading ? (
            <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
          ) : records.length === 0 ? (
            <EmptyState icon="🔧" title="No maintenance records" description="Add a maintenance record to track vehicle servicing" action={<Button onClick={() => setShowForm(true)}>+ Add Record</Button>} />
          ) : (
        
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Vehicle', 'Type', 'Description', 'Provider', 'Cost', 'Date', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody  >
              {records.map(r => (
                <tr key={r.id} >
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{r.vehicle?.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{r.vehicle?.plate_number}</div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor[r.maintenance_type] || 'bg-gray-100 text-gray-600'}`}>
                      {r.maintenance_type}
                    </span>
                  </td>
                  <td>{r.description}</td>
                  <td>{r.provider || '—'}</td>
                  <td>
                    {r.cost ? `₱${Number(r.cost).toLocaleString()}` : '—'}
                  </td>
                  <td>
                    {r.start_date ? format(new Date(r.start_date), 'MMM dd, yyyy') : '—'}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>)}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
        </div>
      

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Maintenance Record" size="lg">
        <MaintenanceForm
          vehicles={vehicles}
          onSave={() => { setShowForm(false); fetchData(); }}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};

export default Maintenance;