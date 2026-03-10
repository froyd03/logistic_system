import React, { useEffect, useState, useCallback } from 'react';
import { vehicleAPI, driverAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, SearchBar, Button, Input, Select, Pagination, EmptyState } from '../components/common/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';

const VEHICLE_TYPES = ['sedan', 'suv', 'van', 'bus', 'truck', 'motorcycle'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const STATUS_OPTIONS = ['available', 'reserved', 'in_transit', 'maintenance', 'inactive'].map(v => ({ value: v, label: v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

const VehicleForm = ({ vehicle, onSave, onClose }) => {
  const [form, setForm] = useState(vehicle || { name: '', plate_number: '', type: 'sedan', fuel_type: 'diesel', capacity: 5, capacity_unit: 'persons', status: 'available' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (vehicle?.id) {
        await vehicleAPI.update(vehicle.id, form);
        toast.success('Vehicle updated');
      } else {
        await vehicleAPI.create(form);
        toast.success('Vehicle added');
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
        <Input label="Vehicle Name *" name="name" value={form.name} onChange={handleChange} required />
        <Input label="Plate Number *" name="plate_number" value={form.plate_number} onChange={handleChange} required />
        <Select label="Type *" name="type" value={form.type} onChange={handleChange} options={VEHICLE_TYPES} required />
        <Select label="Fuel Type *" name="fuel_type" value={form.fuel_type} onChange={handleChange} options={FUEL_TYPES} required />
        <Input label="Brand" name="brand" value={form.brand || ''} onChange={handleChange} />
        <Input label="Model" name="model" value={form.model || ''} onChange={handleChange} />
        <Input label="Year" type="number" name="year" value={form.year || ''} onChange={handleChange} min="1990" max="2030" />
        <Input label="Color" name="color" value={form.color || ''} onChange={handleChange} />
        <Input label="Capacity *" type="number" name="capacity" value={form.capacity} onChange={handleChange} required />
        <Select label="Capacity Unit" name="capacity_unit" value={form.capacity_unit || 'persons'} onChange={handleChange}
          options={['persons','kg','liters'].map(v => ({ value: v, label: v }))} />
        <Input label="Registration Number" name="registration_number" value={form.registration_number || ''} onChange={handleChange} />
        <Input label="Registration Expiry" type="date" name="registration_expiry" value={form.registration_expiry || ''} onChange={handleChange} />
        <Input label="Insurance Number" name="insurance_number" value={form.insurance_number || ''} onChange={handleChange} />
        <Input label="Insurance Expiry" type="date" name="insurance_expiry" value={form.insurance_expiry || ''} onChange={handleChange} />
        <Input label="Purchase Price" type="number" name="purchase_price" value={form.purchase_price || ''} onChange={handleChange} />
        <Input label="Current Odometer (km)" type="number" name="odometer_km" value={form.odometer_km || 0} onChange={handleChange} />
        {vehicle?.id && (
          <Select label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />
        )}
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} className="flex-1">{vehicle?.id ? 'Update Vehicle' : 'Add Vehicle'}</Button>
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
    const d = new Date(date);
    const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
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
                {['Vehicle', 'Type', 'Capacity', 'Status', 'Insurance', 'Odometer', 'Actions'].map(h => (
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
                    <div className={`text-xs ${isExpiring(v.insurance_expiry) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {v.insurance_expiry ? format(new Date(v.insurance_expiry), 'MMM dd, yyyy') : '—'}
                      {/* {isExpiring(v.insurance_expiry) && ' ⚠️'} */}
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
