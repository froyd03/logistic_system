import React, { useEffect, useState, useCallback } from 'react';
import { reservationAPI, vehicleAPI, driverAPI } from '../services/api';
import { StatusBadge, Spinner, Modal, SearchBar, Button, Input, Select, Pagination, EmptyState } from '../components/common/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import OutlinedFlagIcon from '@mui/icons-material/OutlinedFlag';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

const PURPOSES = [
  { value: 'guest_transport', label: 'Guest Transport' },
  { value: 'supplier_pickup', label: 'Supplier Pickup' },
  { value: 'catering_delivery', label: 'Catering Delivery' },
  { value: 'staff_shuttle', label: 'Staff Shuttle' },
  { value: 'other', label: 'Other' }
];

const ReservationForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ purpose: 'guest_transport', pickup_location: '', dropoff_location: '', scheduled_start: '', scheduled_end: '', passenger_count: 1, priority: 'normal', description: '' });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reservationAPI.create(form);
      toast.success('Reservation request submitted!');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to create reservation');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Purpose *" name="purpose" value={form.purpose} onChange={handleChange} options={PURPOSES} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Pickup Location *" name="pickup_location" value={form.pickup_location} onChange={handleChange} required />
        <Input label="Drop-off Location *" name="dropoff_location" value={form.dropoff_location} onChange={handleChange} required />
        <Input label="Start Date & Time *" type="datetime-local" name="scheduled_start" value={form.scheduled_start} onChange={handleChange} required />
        <Input label="End Date & Time *" type="datetime-local" name="scheduled_end" value={form.scheduled_end} onChange={handleChange} required />
        <Input label="Passengers" type="number" name="passenger_count" value={form.passenger_count} onChange={handleChange} min={1} />
        <Select label="Priority" name="priority" value={form.priority} onChange={handleChange}
          options={['low','normal','high','urgent'].map(v => ({ value: v, label: v.charAt(0).toUpperCase()+v.slice(1) }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Submit Request</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

const ApproveModal = ({ reservation, onSave, onClose }) => {
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '' });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      vehicleAPI.getAll({ status: 'available', limit: 100 }),
      driverAPI.getAll({ status: 'available', limit: 100 })
    ]).then(([vRes, dRes]) => {
      setVehicles((vRes.data || []).map(v => ({ value: v.id, label: `${v.name} (${v.plate_number}) - ${v.capacity} ${v.capacity_unit}` })));
      setDrivers((dRes.data || []).map(d => ({ value: d.id, label: `${d.user?.name || 'Driver'} - Lic: ${d.license_number}` })));
    });
  }, []);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await reservationAPI.approve(reservation.id, form);
      toast.success('Reservation approved!');
      onSave();
    } catch (err) { toast.error(err.message || 'Approval failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4 text-sm">
        <p className="font-medium text-blue-900">{reservation.reservation_code}</p>
        <p className="text-blue-700 mt-1">{reservation.pickup_location} → {reservation.dropoff_location}</p>
        <p className="text-blue-600 mt-1">{reservation.scheduled_start ? format(new Date(reservation.scheduled_start), 'MMM dd, yyyy HH:mm') : ''}</p>
      </div>
      <Select label="Assign Vehicle" name="vehicle_id" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} options={vehicles} />
      <Select label="Assign Driver" name="driver_id" value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} options={drivers} />
      <div className="flex gap-3 pt-2">
<<<<<<< HEAD
        <Button onClick={handleApprove} loading={loading} className="flex-1">✅ Approve & Assign</Button>
=======
        <Button onClick={handleApprove} loading={loading} className="flex-1">Approve & Assign</Button>
>>>>>>> 2a01072 (changes)
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

const DispatchModal = ({ reservation, onSave, onClose }) => {
  const [form, setForm] = useState({ odometer_start: '', fuel_start: '' });
  const [loading, setLoading] = useState(false);
  const handleDispatch = async () => {
    setLoading(true);
    try {
      await reservationAPI.dispatch(reservation.id, form);
      toast.success('Vehicle dispatched!');
      onSave();
    } catch (err) { toast.error(err.message || 'Dispatch failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-xl p-4 text-sm">
        <p className="font-medium text-green-900">Dispatch {reservation.reservation_code}</p>
        <p className="text-green-700 mt-1">Vehicle: {reservation.vehicle?.name} ({reservation.vehicle?.plate_number})</p>
        <p className="text-green-700">Driver: {reservation.driver?.user?.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Starting Odometer (km)" type="number" value={form.odometer_start} onChange={e => setForm(f => ({ ...f, odometer_start: e.target.value }))} />
        <Input label="Fuel Level (%)" type="number" value={form.fuel_start} onChange={e => setForm(f => ({ ...f, fuel_start: e.target.value }))} min={0} max={100} />
      </div>
      <div className="flex gap-3 pt-2">
<<<<<<< HEAD
        <Button onClick={handleDispatch} loading={loading} variant="success" className="flex-1">🚀 Dispatch Now</Button>
=======
        <Button onClick={handleDispatch} loading={loading} variant="success" className="flex-1">Dispatch Now</Button>
>>>>>>> 2a01072 (changes)
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

const STATUS_OPTIONS = ['pending','approved','rejected','dispatched','in_progress','completed','cancelled'].map(v => ({
  value: v, label: v.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
}));

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState({ type: null, data: null });
  const { isManager } = useAuth();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationAPI.getAll({ page, limit: 15, status: statusFilter });
      setReservations(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load reservations'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await reservationAPI.reject(id, { reason });
      toast.success('Reservation rejected');
      fetchReservations();
    } catch { toast.error('Failed to reject'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await reservationAPI.cancel(id, { reason: 'Cancelled by user' });
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch { toast.error('Failed to cancel'); }
  };

  const close = () => setModal({ type: null, data: null });

  return (
    <div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search reservations...">
        <Button onClick={() => setModal({ type: 'create', data: null })}>+ New Request</Button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </SearchBar>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : reservations.length === 0 ? (
        <EmptyState icon="📋" title="No reservations" description="No reservation requests found" />
      ) : (
        <div className="space-y-3 mt-6">
          {reservations.map(r => (
            <>
            {/* <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium text-blue-600">{r.reservation_code}</span>
                    <StatusBadge status={r.status} />
                    <StatusBadge status={r.priority} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{r.purpose?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  <p className="text-sm text-gray-500 mt-1">📍 {r.pickup_location} → {r.dropoff_location}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    🕐 {r.scheduled_start ? format(new Date(r.scheduled_start), 'MMM dd HH:mm') : ''} — {r.scheduled_end ? format(new Date(r.scheduled_end), 'HH:mm') : ''}
                    {' · '}👥 {r.passenger_count} person(s)
                    {r.requester && ` · 👤 ${r.requester.name}`}
                  </p>
                  {r.vehicle && <p className="text-xs text-gray-400 mt-1">🚗 {r.vehicle.name} ({r.vehicle.plate_number}) · 👤 {r.driver?.user?.name}</p>}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {r.status === 'pending' && isManager() && (
                    <>
                      <Button size="sm" variant="success" onClick={() => setModal({ type: 'approve', data: r })}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => handleReject(r.id)}>Reject</Button>
                    </>
                  )}
                  {r.status === 'approved' && isManager() && (
                    <Button size="sm" onClick={() => setModal({ type: 'dispatch', data: r })}>🚀 Dispatch</Button>
                  )}
                  {!['completed', 'cancelled', 'rejected'].includes(r.status) && (
                    <Button size="sm" variant="secondary" onClick={() => handleCancel(r.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            </div> */}
            <div key={r.id} className="dispatch-card">
                {/* Status bar */}

                <div className="flex items-start justify-between gap-3 mt-1">
                  <div className="flex-1 gap-3 dispatch-card-content">
                    <div className="dispatch-header">
                      <span className="font-mono text-sm font-bold text-blue-600">{r.reservation_code}</span>
                      <div className='flex gap-4'>
                        <StatusBadge status={r.status} />
                        <StatusBadge status={r.priority} />
                      </div>
                    </div>

                    {/* Vehicle & Driver */}
                    <p className="text-sm font-medium text-gray-900">{r.purpose?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    {r.vehicle?.name && r.vehicle?.plate_number && <div className="flex items-center ">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg"><EngineeringOutlinedIcon sx={{fontSize: 34, color:'#0000008e'}}/></span>
                        <div>
                          <p className="font-medium text-gray-900">{r.driver?.user?.name}</p>
                          <p className="text-xs text-gray-400">{r.vehicle?.name} • ({r.vehicle?.plate_number})</p>
                        </div>
                      </div>
                    </div>}

                    {/* Route */}
                    <div className="flex justify-evenly w-full">
                      <p><LocationOnOutlinedIcon sx={{color:'#ff0000a3'}}/>{r.pickup_location}</p>
                      <ArrowRightAltIcon sx={{fontSize: 44, color:'#000000a9'}}/>
                      <p><OutlinedFlagIcon sx={{color:'#0000008e'}}/>{r.dropoff_location}</p>
                    </div>

                    {/* Timing */}
                    
                  </div>
                </div>

                <div className=" pt-3 border-t border-gray-100 flex justify-between gap-2">
                   <div className="flex items-center gap-8 text-xs text-gray-400">
                      {<span>{r.scheduled_start ? format(new Date(r.scheduled_start), 'MMM dd HH:mm') : ''} — {r.scheduled_end ? format(new Date(r.scheduled_end), 'HH:mm') : ''}</span>}
                      <span>•</span>
                      {<span>{r.requester.name}</span>}
                      <span>•</span>
                      <span>{r.passenger_count} person(s)</span>
                    </div>
                    <div className='flex gap-2'>
                      {r.status === 'pending' && isManager() && (
                        <>
                          <Button size="sm" variant="success" onClick={() => setModal({ type: 'approve', data: r })}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(r.id)}>Reject</Button>
                        </>
                      )}
                      {r.status === 'approved' && isManager() && (
                        <Button size="sm" onClick={() => setModal({ type: 'dispatch', data: r })}>Dispatch</Button>
                      )}
                      {!['completed', 'cancelled', 'rejected'].includes(r.status) && (
                        <Button size="sm" variant="secondary" onClick={() => handleCancel(r.id)}>Cancel</Button>
                      )}
                    </div>
                </div>
              </div>
            </>
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={modal.type === 'create'} onClose={close} title="New Reservation Request" size="lg">
        <ReservationForm onSave={() => { fetchReservations(); close(); }} onClose={close} />
      </Modal>

      <Modal isOpen={modal.type === 'approve'} onClose={close} title="Approve Reservation" size="md">
        {modal.data && <ApproveModal reservation={modal.data} onSave={() => { fetchReservations(); close(); }} onClose={close} />}
      </Modal>

      <Modal isOpen={modal.type === 'dispatch'} onClose={close} title="Dispatch Vehicle" size="md">
        {modal.data && <DispatchModal reservation={modal.data} onSave={() => { fetchReservations(); close(); }} onClose={close} />}
      </Modal>
    </div>
  );
};

export default Reservations;
