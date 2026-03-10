import React, { useEffect, useState, useCallback } from 'react';
import { driverAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, SearchBar, Button, Input, Select, Pagination, EmptyState } from '../components/common/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StarRating = ({ rating }) => {
  const stars = Math.round(rating || 0);
  console.log('Rating:', rating, typeof rating);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= stars ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{Number(rating || 0).toFixed(1)}</span>
    </div>
  );
};

const DriverForm = ({ driver, onSave, onClose }) => {
  const [form, setForm] = useState(driver || { name: '', email: '', phone: '', license_number: '', license_type: '', license_expiry: '', employee_id: '', date_hired: '' });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (driver?.id) {
        await driverAPI.update(driver.id, form);
        toast.success('Driver updated');
      } else {
        await driverAPI.create(form);
        toast.success('Driver added');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to save driver');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!driver?.id && (
        <>
          <Input label="Full Name *" name="name" value={form.name || ''} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email *" type="email" name="email" value={form.email || ''} onChange={handleChange} required />
            <Input label="Phone" name="phone" value={form.phone || ''} onChange={handleChange} />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Employee ID" name="employee_id" value={form.employee_id || ''} onChange={handleChange} />
        <Input label="License Number *" name="license_number" value={form.license_number || ''} onChange={handleChange} required />
        <Input label="License Type *" name="license_type" value={form.license_type || ''} onChange={handleChange} placeholder="e.g. Restriction 1,2,3" required />
        <Input label="License Expiry *" type="date" name="license_expiry" value={form.license_expiry || ''} onChange={handleChange} required />
        <Input label="Emergency Contact" name="emergency_contact" value={form.emergency_contact || ''} onChange={handleChange} />
        <Input label="Emergency Phone" name="emergency_phone" value={form.emergency_phone || ''} onChange={handleChange} />
        <Input label="Date Hired" type="date" name="date_hired" value={form.date_hired || ''} onChange={handleChange} />
        {driver?.id && (
          <Select label="Status" name="status" value={form.status || 'available'} onChange={handleChange}
            options={['available','on_trip','off_duty','suspended','inactive'].map(v => ({ value: v, label: v.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }))} />
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">{driver?.id ? 'Update Driver' : 'Add Driver'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState({ type: null, data: null });
  const { isManager } = useAuth();

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverAPI.getAll({ page, limit: 15, status: statusFilter, search });
      setDrivers(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const close = () => setModal({ type: null, data: null });

  const licenseStatusColor = (status) => ({
    expired: 'text-red-600 font-semibold',
    expiring_soon: 'text-yellow-600 font-semibold',
    valid: 'text-green-600'
  }[status] || 'text-gray-600');

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by license or ID...">
        {isManager() && <Button onClick={() => setModal({ type: 'form', data: null })}>+ Add Driver</Button>}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          {['available','on_trip','off_duty','suspended','inactive'].map(v => (
            <option key={v} value={v}>{v.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
          ))}
        </select>
      </SearchBar>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : drivers.length === 0 ? (
        <EmptyState icon="👤" title="No drivers found" description="Add drivers to manage operations" />
      ) : (
        <div className="grid grid-cols-1 mt-8 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {d.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{d.user?.name}</p>
                  <p className="text-xs text-gray-400">{d.employee_id}</p>
                  <StatusBadge status={d.status} />
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">License:</span>
                  <span className="font-mono">{d.license_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">License Type:</span>
                  <span>{d.license_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expiry:</span>
                  <span className={licenseStatusColor(d.license_status)}>
                    {d.license_expiry ? format(new Date(d.license_expiry), 'MMM dd, yyyy') : '—'}
                    {d.license_status !== 'valid' && ` (${d.license_status?.replace('_',' ')})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Trips:</span>
                  <span className="font-semibold text-gray-900">{d.total_trips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total KM:</span>
                  <span className="font-semibold text-gray-900">{Number(d.total_km).toLocaleString()} km</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50">
                <StarRating rating={d.rating} />
              </div>

              <div className="flex gap-2 mt-3">
                {isManager() && <>
                  <Button variant="outline" size="sm" onClick={() => setModal({ type: 'form', data: d })}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setModal({ type: 'incidents', data: d })}>⚠️</Button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={modal.type === 'form'} onClose={close} title={modal.data ? 'Edit Driver' : 'Add Driver'} size="md">
        <DriverForm driver={modal.data} onSave={() => { fetchDrivers(); close(); }} onClose={close} />
      </Modal>
    </div>
  );
};

export default Drivers;
