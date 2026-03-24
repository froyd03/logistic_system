import React, { useEffect, useState, useCallback } from 'react';
import { vehicleAPI, driverAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, SearchBar, Button, Input, Select, Pagination, EmptyState } from '../components/common/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, addYears, differenceInDays } from 'date-fns';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';

const VEHICLE_TYPES = ['sedan', 'suv', 'van', 'bus', 'truck', 'motorcycle'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const STATUS_OPTIONS = ['available', 'reserved', 'in_transit', 'maintenance', 'inactive'].map(v => ({ value: v, label: v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

// ─── Registration status helpers ───────────────────────────────────────────
const getRegStatus = (expiryDate) => {
  if (!expiryDate) return 'unknown';
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0)  return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
};

const REG_STATUS_STYLE = {
  expired:       { badge: 'bg-red-100 text-red-800 font-semibold', label: 'Expired'},
  expiring_soon: { badge: 'bg-yellow-100 text-yellow-800 font-semibold',label: 'Expiring Soon'},
  valid:         { badge: 'bg-green-100 text-green-700', label: 'Valid'},
  unknown:       { badge: 'bg-gray-100 text-gray-500', label: 'Unknown'}
};

const RegistrationBadge = ({ expiryDate }) => {
  const status = getRegStatus(expiryDate);
  const s = REG_STATUS_STYLE[status];
  console.log(s)
  const days = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;

  return (
    <div className="space-y-0.5">
      {days <= 30 && <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.badge}`}>
        <span>{s.icon}</span>
        <span className='text-xs font-mono'>{s.label}</span>
      </div>}
    </div>
  );
};

// ─── Auto-compute expiry dates from registration start date ─────────────────
const computeLocalExpiry = (startDateStr) => {
  if (!startDateStr) return { registration_expiry: '', insurance_expiry: '' };
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return { registration_expiry: '', insurance_expiry: '' };
  // Registration: 3 years from start (LTO Philippines)
  const regExpiry = addYears(start, 3);
  // Insurance (CTPL): 1 year from start, aligned to registration month
  const insExpiry = addYears(start, 1);
  return {
    registration_expiry: regExpiry.toISOString().split('T')[0],
    insurance_expiry:    insExpiry.toISOString().split('T')[0]
  };
};

const VehicleForm = ({ vehicle, onSave, onClose }) => {
  const isEdit = !!vehicle?.id;
  const [form, setForm] = useState(vehicle || {
    name: '', plate_number: '', type: 'sedan', fuel_type: 'diesel',
    capacity: 5, capacity_unit: 'persons', status: 'available',
    registration_start_date: '', registration_expiry: '', insurance_expiry: ''
  });
  const [loading, setLoading] = useState(false);
  const [expiryPreview, setExpiryPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };

      // ── Auto-compute expiry dates when registration_start_date is set ──────
      if (name === 'registration_start_date' && value ) {
        const computed = computeLocalExpiry(value);
        updated.registration_expiry = computed.registration_expiry;
        updated.insurance_expiry    = computed.insurance_expiry;
        setExpiryPreview(computed);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await vehicleAPI.update(vehicle.id, form);
        toast.success('Vehicle updated');
      } else {
        await vehicleAPI.create(form);
        toast.success('Vehicle added to fleet');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Vehicle Name *" name="name" value={form.name || ''} onChange={handleChange} required />
        <Input label="Plate Number *" name="plate_number" value={form.plate_number || ''} onChange={handleChange} required />
        <Select label="Type *" name="type" value={form.type} onChange={handleChange} options={VEHICLE_TYPES} required />
        <Select label="Fuel Type *" name="fuel_type" value={form.fuel_type} onChange={handleChange} options={FUEL_TYPES} required />
        <Input label="Brand" name="brand" value={form.brand || ''} onChange={handleChange} />
        <Input label="Model" name="model" value={form.model || ''} onChange={handleChange} />
        <Input label="Year" type="number" name="year" value={form.year || ''} onChange={handleChange} min="1990" max="2030" />
        <Input label="Color" name="color" value={form.color || ''} onChange={handleChange} />
        <Input label="Capacity *" type="number" name="capacity" value={form.capacity} onChange={handleChange} required min={1} />
        <Select label="Capacity Unit" name="capacity_unit" value={form.capacity_unit || 'persons'} onChange={handleChange}
          options={['persons','kg','liters'].map(v => ({ value: v, label: v }))} />
        <Input label="Purchase Price (₱)" type="number" name="purchase_price" value={form.purchase_price || ''} onChange={handleChange} />
        <Input label="Current Odometer (km)" type="number" name="odometer_km" value={form.odometer_km || 0} onChange={handleChange} />
        {isEdit && (
          <Select label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />
        )}
      </div>

      {/* ── Registration & Insurance Section ── */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Registration & Insurance
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Registration Number" name="registration_number" value={form.registration_number || ''} onChange={handleChange} />
          <Input
            label={`Registration Start Date${!isEdit ? ' *' : ''}`}
            type="date"
            name="registration_start_date"
            value={form.registration_start_date || ''}
            onChange={handleChange}
            required={!isEdit}
          />
          <div>
            <Input
              label="Registration Expiry"
              type="date"
              name="registration_expiry"
              value={form.registration_expiry || ''}
              onChange={handleChange}
            />
          </div>
          <div>
            <Input
              label="Insurance Expiry"
              type="date"
              name="insurance_expiry"
              value={form.insurance_expiry || ''}
              onChange={handleChange}
            />
            
          </div>
          <Input label="Insurance Number" name="insurance_number" value={form.insurance_number || ''} onChange={handleChange} />
        </div>

        {/* Expiry preview after auto-compute */}
        {expiryPreview && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">Auto-computed dates (Philippines LTO + CTPL)</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <span>Registration expires: <strong>{expiryPreview.registration_expiry ? format(new Date(expiryPreview.registration_expiry), 'MMMM dd, yyyy') : '—'}</strong></span>
              <span>Insurance (CTPL) expires: <strong>{expiryPreview.insurance_expiry ? format(new Date(expiryPreview.insurance_expiry), 'MMMM dd, yyyy') : '—'}</strong></span>
            </div>
            <p className="text-xs text-blue-500 mt-1">
              New registration: 3 years · CTPL: yearly renewal coterminous with registration month
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Update Vehicle' : 'Add Vehicle'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};
const MaintenanceForm = ({ vehicleId, onSave, onClose }) => {
  const [form, setForm] = useState({ maintenance_type: 'preventive', description: '', cost: 0, start_date: '', status: 'scheduled' });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await vehicleAPI.addMaintenance(vehicleId, form);
      toast.success('Maintenance record added');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to add maintenance');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Type" name="maintenance_type" value={form.maintenance_type} onChange={handleChange}
        options={['preventive','corrective','emergency','inspection'].map(v => ({ value: v, label: v.charAt(0).toUpperCase()+v.slice(1) }))} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea name="description" value={form.description} onChange={handleChange} required rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Cost (₱)" type="number" name="cost" value={form.cost} onChange={handleChange} />
        <Input label="Start Date *" type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
        <Input label="Provider" name="provider" value={form.provider || ''} onChange={handleChange} />
        <Select label="Status" name="status" value={form.status} onChange={handleChange}
          options={['scheduled','in_progress','completed','cancelled'].map(v => ({ value: v, label: v.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Add Record</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [stats, setStats] = useState(null);
  const { isManager } = useAuth();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.getAll({ page, limit: 15, search, status: statusFilter });
      setVehicles(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this vehicle?')) return;
    try {
      await vehicleAPI.archive(id);
      toast.success('Vehicle archived');
      fetchVehicles();
    } catch { toast.error('Failed to archive vehicle'); }
  };

  const isExpiring = (date) => {
    if (!date) return false;
    const diff = differenceInDays(new Date(date), new Date());
    
    if(diff < 0) return 'text-red-500 font-semibold';
    else if(diff <= 30) return 'text-yellow-700 font-semibold'
    else return 'text-gray-500'
  };

  return (
    <div>
      <div className="tblMainContainer">
        <div className="tblContainer">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, plate or brand...">
            {isManager() && (
              <Button onClick={() => setModalState({ type: 'form', data: null })}>+ Add Vehicle</Button>
            )}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </SearchBar>

          {loading ? (
            <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
          ) : vehicles.length === 0 ? (
            <EmptyState icon="🚗" title="No vehicles found" description="Add your first vehicle to get started" />
          ) : (

        
          <table>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Vehicle', 'Type', 'Capacity', 'Status', 'Registration', 'Odometer', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} >
                  <td>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{v.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{v.plate_number}</div>
                    </div>
                  </td>
                  <td >
                    <span className="text-sm text-gray-600 capitalize">{v.type} · {v.fuel_type}</span>
                  </td>
                  <td>{v.capacity} {v.capacity_unit}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    <div className={`text-xs ${isExpiring(v.registration_expiry)}`}>
                      {v.registration_expiry ? format(new Date(v.registration_expiry), 'MMM dd, yyyy') : '—'}
                      <RegistrationBadge expiryDate={v.registration_expiry}/>
                    </div>
                  </td>
                  <td>{Number(v.odometer_km).toLocaleString()} km</td>
                  <td>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setModalState({ type: 'view', data: v })}>
                        <VisibilityOutlinedIcon sx={{ color: '#1d4fd8c2', fontSize: 22}} />
                      </Button>
                      {isManager() && <>
                        <Button variant="outline" size="sm" onClick={() => setModalState({ type: 'form', data: v })}>
                          <EditOutlinedIcon sx={{ color: '#1d4fd8c2', fontSize: 24 }} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setModalState({ type: 'maintenance', data: v })}>
                          <BuildOutlinedIcon sx={{ color: '#1d4fd8c2', fontSize: 22}} />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleArchive(v.id)}>
                          <ArchiveOutlinedIcon sx={{ fontSize: 22 }}/>
                        </Button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>)}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modalState.type === 'form'} onClose={() => setModalState({ type: null, data: null })}
        title={modalState.data ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <VehicleForm vehicle={modalState.data} onSave={() => { fetchVehicles(); setModalState({ type: null, data: null }); }} onClose={() => setModalState({ type: null, data: null })} />
      </Modal>

      <Modal isOpen={modalState.type === 'maintenance'} onClose={() => setModalState({ type: null, data: null })}
        title={`Maintenance - ${modalState.data?.name}`} size="md">
        <MaintenanceForm vehicleId={modalState.data?.id} onSave={() => { fetchVehicles(); setModalState({ type: null, data: null }); }} onClose={() => setModalState({ type: null, data: null })} />
      </Modal>

      <Modal isOpen={modalState.type === 'view'} onClose={() => setModalState({ type: null, data: null })}
        title="Vehicle Details" size="lg">
        {modalState.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Name', modalState.data.name], ['Plate', modalState.data.plate_number],
                ['Type', modalState.data.type], ['Fuel', modalState.data.fuel_type],
                ['Brand', modalState.data.brand], ['Model', modalState.data.model],
                ['Year', modalState.data.year], ['Color', modalState.data.color],
                ['Capacity', `${modalState.data.capacity} ${modalState.data.capacity_unit}`],
                ['Odometer', `${Number(modalState.data.odometer_km).toLocaleString()} km`],
                ['Reg. Expiry', modalState.data.registration_expiry || '—'],
                ['Ins. Expiry', modalState.data.insurance_expiry || '—']
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-500">{k}: </span>
                  <span className="font-medium text-gray-900">{v || '—'}</span>
                </div>
              ))}
            </div>
            <div className="pt-2"><StatusBadge status={modalState.data.status} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Vehicles;
