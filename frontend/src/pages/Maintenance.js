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

// Status options for the new record form (no 'completed' — use the Complete button instead)
const STATUS_FORM_OPTS = [
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
];

// Full status options for the inline table dropdown
const STATUS_TABLE_OPTS = [
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

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

const CompleteModal = ({ record, onSave, onClose }) => {
  const [form, setForm] = useState({
    end_date: new Date().toISOString().split('T')[0],
    cost: record.cost || '',
    next_service_date: record.next_service_date || '',
    next_service_km: record.next_service_km || '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await vehicleAPI.completeMaintenance(record.vehicle_id, record.id, form);
      toast.success(`✅ Maintenance completed — vehicle is now available`);
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to complete maintenance');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-green-900">Complete Maintenance</p>
        <p className="text-green-700 mt-1">🚗 {record.vehicle?.name} ({record.vehicle?.plate_number})</p>
        <p className="text-green-600 text-xs mt-1">{record.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Completion Date *" type="date" name="end_date"
          value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} required />
        <Input label="Final Cost (₱)" type="number" name="cost" min={0} step="0.01"
          value={form.cost} onChange={e => setForm(f => ({...f, cost: e.target.value}))} />
        <Input label="Next Service Date" type="date" name="next_service_date"
          value={form.next_service_date} onChange={e => setForm(f => ({...f, next_service_date: e.target.value}))} />
        <Input label="Next Service at (km)" type="number" name="next_service_km"
          value={form.next_service_km} onChange={e => setForm(f => ({...f, next_service_km: e.target.value}))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
          placeholder="Work completed, parts replaced, observations..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        Completing this maintenance will automatically set the vehicle status back to <strong>Available</strong>.
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} variant="success" className="flex-1">✅ Mark as Completed</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};


const InlineStatusDropdown = ({ record, onChange }) => {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === record.status) return;
    if (record.status === 'completed') {
      toast.error('Cannot change a completed maintenance record');
      return;
    }
    // Delegate 'completed' to the Complete modal via onChange callback
    onChange(record, newStatus);
  };

  const statusStyle = {
    scheduled:   'bg-gray-100 text-gray-700',
    in_progress: 'bg-orange-100 text-orange-800',
    completed:   'bg-green-100 text-green-800',
    cancelled:   'bg-red-100 text-red-800'
  };

  return (
    <select
      value={record.status}
      onChange={handleChange}
      disabled={record.status === 'completed' || record.status === 'cancelled' || updating}
      className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusStyle[record.status]} ${record.status === 'completed' || record.status === 'cancelled' ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-80'}`}
    >
      {STATUS_TABLE_OPTS.map(o => (
        <option key={o.value} value={o.value}
          disabled={o.value === 'completed' && record.status !== 'in_progress'}>
          {o.label}
        </option>
      ))}
    </select>
  );
};

const Maintenance = () => {
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState({ type: null, data: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, vRes] = await Promise.all([
        vehicleAPI.getAllMaintenance({ page, limit: 15, status: statusFilter || undefined }),
        vehicleAPI.getAll({ limit: 100 })
      ]);
      setRecords(mRes.data || []);
      setTotalPages(mRes.pagination?.totalPages || 1);
      setVehicles(vRes.data || []);
    } catch (err) {
      console.error('[Maintenance] fetch error:', err);
      toast.error('Failed to load maintenance records');
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = search
    ? records.filter(r =>
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.provider?.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  // Handle inline dropdown change
  const handleStatusChange = async (record, newStatus) => {
    // 'completed' → open the Complete modal for proper data entry
    if (newStatus === 'completed') {
      setModal({ type: 'complete', data: record });
      return;
    }
    // Other status changes → direct API call
    try {
      await vehicleAPI.updateMaintenanceStatus(record.vehicle_id, record.id, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const close = () => setModal({ type: null, data: null });
  
  return (
    <div>

      <div  className='tblMainContainer' style={{maxWidth: '100%'}}>
        <div className='tblContainer'>
          <SearchBar 
            value={search} 
            onChange={v => { setSearch(v); setPage(1); }} 
            placeholder="Search by vehicle, description, or provider..." >
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Status</option>
                {STATUS_TABLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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
                {['Vehicle', 'Type', 'Description', 'Provider', 'Cost', 'odometer', 'Date', 'Status', 'actions'].map(h => (
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
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {r.odometer_at_service ? `${Number(r.odometer_at_service).toLocaleString()} km` : '—'}
                  </td>
                  <td>
                    {r.start_date ? format(new Date(r.start_date), 'MMM dd, yyyy') : '—'}
                  </td>
                  
                  <td className="px-4 py-4">
                    <InlineStatusDropdown record={r} onChange={handleStatusChange} />
                  </td>
                  <td className="px-4 py-4">
                    {/* Complete button only for in_progress records */}
                    {r.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => setModal({ type: 'complete', data: r })}
                      >
                        Complete
                      </Button>
                    )}
                    {r.status === 'completed' && r.next_service_date && (
                      <div className="text-xs text-blue-600">
                        Next: {format(new Date(r.next_service_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </td>
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

      <Modal isOpen={modal.type === 'complete'} onClose={close} title="Complete Maintenance" size="md">
        {modal.data && (
          <CompleteModal
            record={modal.data}
            onSave={() => { close(); fetchData(); }}
            onClose={close}
          />
        )}
      </Modal>
    </div>
  );
};

export default Maintenance;