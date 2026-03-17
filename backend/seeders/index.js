require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const {
  sequelize, User, Vehicle, Driver, Reservation,
  TransportExpense, FuelLog, DispatchRecord, TripLog, VehicleStatusHistory
} = require('../models/associations');
const { VehicleMaintenance, DriverIncident } = require('../models/index');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');

    // ─────────────────────────────────────────────────────────────────────────
    // USERS  (2 admin, 1 manager, 5 drivers, 4 staff)
    // ─────────────────────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hash(pw, 10);
    const users = await User.bulkCreate([
      { name: 'Admin User',        email: 'admin@hotel.com',      password: await hash('Admin@123'),   role: 'admin',             phone: '+639171234567', is_active: true },
      { name: 'Super Admin',       email: 'superadmin@hotel.com', password: await hash('Admin@123'),   role: 'admin',             phone: '+639179999999', is_active: true },
      { name: 'Transport Manager', email: 'transport@hotel.com',  password: await hash('Manager@123'), role: 'transport_manager', phone: '+639181234567', is_active: true },
      { name: 'Juan dela Cruz',    email: 'juan@hotel.com',       password: await hash('Driver@123'),  role: 'driver',            phone: '+639191234567', is_active: true },
      { name: 'Pedro Santos',      email: 'pedro@hotel.com',      password: await hash('Driver@123'),  role: 'driver',            phone: '+639201234567', is_active: true },
      { name: 'Ricardo Bautista',  email: 'ricardo@hotel.com',    password: await hash('Driver@123'),  role: 'driver',            phone: '+639211111111', is_active: true },
      { name: 'Eduardo Lim',       email: 'eduardo@hotel.com',    password: await hash('Driver@123'),  role: 'driver',            phone: '+639222222222', is_active: true },
      { name: 'Armando Cruz',      email: 'armando@hotel.com',    password: await hash('Driver@123'),  role: 'driver',            phone: '+639233333333', is_active: true },
      { name: 'Maria Reyes',       email: 'maria@hotel.com',      password: await hash('Staff@123'),   role: 'staff',             phone: '+639241234567', is_active: true },
      { name: 'Carlos Mendoza',    email: 'carlos@hotel.com',     password: await hash('Staff@123'),   role: 'staff',             phone: '+639251234567', is_active: true },
      { name: 'Ana Villanueva',    email: 'ana@hotel.com',        password: await hash('Staff@123'),   role: 'staff',             phone: '+639261234567', is_active: true },
      { name: 'Roberto Garcia',    email: 'roberto@hotel.com',    password: await hash('Staff@123'),   role: 'staff',             phone: '+639271234567', is_active: true },
    ], { individualHooks: false });
    console.log('✅ Users seeded (12 users)');

    // Aliases for readability
    const [admin, superAdmin, manager,
           juanUser, pedroUser, ricardoUser, eduardoUser, armandoUser,
           mariaUser, carlosUser, anaUser, robertoUser] = users;

    // ─────────────────────────────────────────────────────────────────────────
    // VEHICLES  — covers every status: available, maintenance, reserved, in_transit, inactive
    // ─────────────────────────────────────────────────────────────────────────
    const vehicles = await Vehicle.bulkCreate([
      // ── available ──
      {
        name: 'Toyota Fortuner', plate_number: 'ABC-1234', type: 'suv',
        brand: 'Toyota', model: 'Fortuner', year: 2022, color: 'White',
        fuel_type: 'diesel', capacity: 7, status: 'available',
        odometer_km: 25320, registration_expiry: '2026-12-31',
        insurance_expiry: '2026-06-30', purchase_price: 2500000,
        notes: 'VIP vehicle — keep clean at all times'
      },
      {
        name: 'Hyundai H350 Van', plate_number: 'DEF-5678', type: 'van',
        brand: 'Hyundai', model: 'H350', year: 2021, color: 'Silver',
        fuel_type: 'diesel', capacity: 12, status: 'available',
        odometer_km: 47500, registration_expiry: '2026-11-30',
        insurance_expiry: '2026-08-31', purchase_price: 1800000
      },
      {
        name: 'Honda CB150 Bike', plate_number: 'PQR-1122', type: 'motorcycle',
        brand: 'Honda', model: 'CB150', year: 2023, color: 'Red',
        fuel_type: 'gasoline', capacity: 1, status: 'available',
        odometer_km: 9200, registration_expiry: '2026-12-31',
        insurance_expiry: '2026-10-31', purchase_price: 135000,
        notes: 'Used for quick document deliveries'
      },
      {
        name: 'Toyota Land Cruiser', plate_number: 'STU-4455', type: 'suv',
        brand: 'Toyota', model: 'Land Cruiser', year: 2023, color: 'Black',
        fuel_type: 'diesel', capacity: 8, status: 'available',
        odometer_km: 11000, registration_expiry: '2026-09-30',
        insurance_expiry: '2026-07-31', purchase_price: 4800000,
        notes: 'Executive transport — assigned to VIP guests only'
      },
      // ── maintenance ──
      {
        name: 'Toyota Hiace Commuter', plate_number: 'GHI-9012', type: 'van',
        brand: 'Toyota', model: 'Hiace', year: 2021, color: 'White',
        fuel_type: 'diesel', capacity: 15, status: 'maintenance',
        odometer_km: 68400, registration_expiry: '2026-03-31',
        insurance_expiry: '2026-01-31', purchase_price: 2200000,
        notes: 'In shop: transmission overhaul'
      },
      {
        name: 'Ford Ranger', plate_number: 'VWX-7788', type: 'truck',
        brand: 'Ford', model: 'Ranger', year: 2020, color: 'Dark Gray',
        fuel_type: 'diesel', capacity: 5, status: 'maintenance',
        odometer_km: 102000, registration_expiry: '2026-05-31',
        insurance_expiry: '2026-03-31', purchase_price: 1350000,
        notes: 'Brake system replacement in progress'
      },
      // ── reserved ──
      {
        name: 'Suzuki APV', plate_number: 'MNO-7890', type: 'van',
        brand: 'Suzuki', model: 'APV', year: 2021, color: 'Silver',
        fuel_type: 'gasoline', capacity: 8, status: 'reserved',
        odometer_km: 55000, registration_expiry: '2026-08-31',
        insurance_expiry: '2026-06-30', purchase_price: 800000
      },
      // ── in_transit ──
      {
        name: 'Mitsubishi Strada', plate_number: 'YZA-9900', type: 'truck',
        brand: 'Mitsubishi', model: 'Strada', year: 2022, color: 'Blue',
        fuel_type: 'diesel', capacity: 5, status: 'in_transit',
        odometer_km: 33800, registration_expiry: '2026-10-31',
        insurance_expiry: '2026-08-31', purchase_price: 1600000,
        notes: 'Currently en route — airport run'
      },
      // ── inactive ──
      {
        name: 'Mitsubishi L300', plate_number: 'JKL-3456', type: 'van',
        brand: 'Mitsubishi', model: 'L300', year: 2017, color: 'Blue',
        fuel_type: 'diesel', capacity: 1000, status: 'inactive',
        odometer_km: 185000, registration_expiry: '2024-09-30',
        insurance_expiry: '2024-07-31', purchase_price: 600000,
        is_active: false, notes: 'Decommissioned — exceeded mileage limit'
      },
    ]);
    console.log('✅ Vehicles seeded (9 vehicles — all statuses covered)');

    // ─────────────────────────────────────────────────────────────────────────
    // DRIVERS  — covers: available, on_trip, off_duty, suspended, inactive
    // ─────────────────────────────────────────────────────────────────────────
    const drivers = await Driver.bulkCreate([
      // available
      {
        user_id: juanUser.id, employee_id: 'DRV-001',
        license_number: 'N01-12-345678', license_type: 'Restriction 1,2,3',
        license_expiry: '2027-05-15', status: 'available',
        phone: '+639191234567', date_hired: '2020-03-01',
        total_trips: 312, total_km: 24650, rating: 4.9, rating_count: 180,
        notes: 'Senior driver — VIP escort certified'
      },
      // available
      {
        user_id: pedroUser.id, employee_id: 'DRV-002',
        license_number: 'N02-34-567890', license_type: 'Restriction 1,2',
        license_expiry: '2026-09-20', status: 'available',
        phone: '+639201234567', date_hired: '2021-07-15',
        total_trips: 205, total_km: 15800, rating: 4.6, rating_count: 110,
      },
      // on_trip (Ricardo — currently dispatched)
      {
        user_id: ricardoUser.id, employee_id: 'DRV-003',
        license_number: 'N03-56-789012', license_type: 'Restriction 1,2,3',
        license_expiry: '2026-11-30', status: 'on_trip',
        phone: '+639211111111', date_hired: '2019-06-01',
        total_trips: 420, total_km: 38200, rating: 4.7, rating_count: 230,
        notes: 'Currently on airport run'
      },
      // off_duty
      {
        user_id: eduardoUser.id, employee_id: 'DRV-004',
        license_number: 'N04-78-901234', license_type: 'Restriction 1,2',
        license_expiry: '2025-08-10', status: 'off_duty',
        phone: '+639222222222', date_hired: '2022-01-10',
        total_trips: 88, total_km: 6750, rating: 4.3, rating_count: 45,
        notes: 'Rest day — scheduled to return tomorrow'
      },
      // suspended
      {
        user_id: armandoUser.id, employee_id: 'DRV-005',
        license_number: 'N05-90-123456', license_type: 'Restriction 1',
        license_expiry: '2026-04-25', status: 'suspended',
        phone: '+639233333333', date_hired: '2021-03-15',
        total_trips: 145, total_km: 11200, rating: 3.8, rating_count: 70,
        notes: 'Suspended pending investigation — minor accident 2024-11-18'
      },
    ]);
    console.log('✅ Drivers seeded (5 drivers — all statuses covered)');

    const [juan, pedro, ricardo, eduardo, armando] = drivers;

    // ─────────────────────────────────────────────────────────────────────────
    // VEHICLE STATUS HISTORY
    // ─────────────────────────────────────────────────────────────────────────
    await VehicleStatusHistory.bulkCreate([
      { vehicle_id: vehicles[4].id, from_status: 'available', to_status: 'maintenance', changed_by: manager.id, reason: 'Scheduled transmission overhaul at 68,000 km', created_at: new Date('2024-11-20') },
      { vehicle_id: vehicles[5].id, from_status: 'available', to_status: 'maintenance', changed_by: manager.id, reason: 'Brake pads worn out — corrective repair', created_at: new Date('2024-12-01') },
      { vehicle_id: vehicles[6].id, from_status: 'available', to_status: 'reserved',    changed_by: manager.id, reason: 'Assigned to RES-000006', created_at: new Date('2024-12-10') },
      { vehicle_id: vehicles[7].id, from_status: 'available', to_status: 'in_transit',  changed_by: manager.id, reason: 'Dispatched for RES-000007 airport run', created_at: new Date() },
      { vehicle_id: vehicles[8].id, from_status: 'available', to_status: 'inactive',    changed_by: admin.id,   reason: 'Decommissioned — 185,000 km exceeded policy limit', created_at: new Date('2024-10-01') },
    ]);
    console.log('✅ Vehicle status history seeded');

    // ─────────────────────────────────────────────────────────────────────────
    // MAINTENANCE  — covers: scheduled, in_progress, completed, cancelled
    // ─────────────────────────────────────────────────────────────────────────
    await VehicleMaintenance.bulkCreate([
      // completed records (historical)
      {
        vehicle_id: vehicles[0].id, maintenance_type: 'preventive',
        description: '20,000 km PMS — oil change, air filter, cabin filter, tire rotation',
        provider: 'Toyota Service Center BGC', cost: 9800,
        odometer_at_service: 20000, start_date: '2024-04-10', end_date: '2024-04-10',
        next_service_date: '2024-10-10', status: 'completed', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[1].id, maintenance_type: 'corrective',
        description: 'Alternator replacement — battery not charging properly',
        provider: 'Hyundai Service Center', cost: 18500,
        odometer_at_service: 44000, start_date: '2024-05-03', end_date: '2024-05-04',
        status: 'completed', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[3].id, maintenance_type: 'inspection',
        description: 'Annual LTO road worthiness inspection & emission testing',
        provider: 'LTO-Accredited Shop', cost: 2500,
        odometer_at_service: 10500, start_date: '2024-07-01', end_date: '2024-07-01',
        next_service_date: '2025-07-01', status: 'completed', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[0].id, maintenance_type: 'corrective',
        description: 'Front brake pad replacement + brake fluid flush',
        provider: 'Autohaus Service Makati', cost: 14200,
        odometer_at_service: 24500, start_date: '2024-08-15', end_date: '2024-08-16',
        status: 'completed', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[2].id, maintenance_type: 'preventive',
        description: '5,000 km PMS — oil change and chain lubrication',
        provider: 'Honda Moto Shop', cost: 2200,
        odometer_at_service: 8500, start_date: '2024-09-05', end_date: '2024-09-05',
        next_service_date: '2025-03-05', status: 'completed', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[6].id, maintenance_type: 'preventive',
        description: '50,000 km major PMS — timing belt, plugs, fuel injector cleaning',
        provider: 'Suzuki Service Center', cost: 22000,
        odometer_at_service: 50000, start_date: '2024-10-12', end_date: '2024-10-13',
        next_service_date: '2025-10-12', status: 'completed', performed_by: manager.id
      },
      // in_progress (active right now)
      {
        vehicle_id: vehicles[4].id, maintenance_type: 'corrective',
        description: 'Transmission overhaul — slipping gears on 3rd and 4th',
        provider: 'ProTrans Auto Repair', cost: 45000,
        odometer_at_service: 68400, start_date: new Date().toISOString().split('T')[0],
        status: 'in_progress', performed_by: manager.id,
        notes: 'ETA completion: 3 business days. Parts ordered.'
      },
      {
        vehicle_id: vehicles[5].id, maintenance_type: 'corrective',
        description: 'Full brake system replacement — pads, rotors, calipers (front + rear)',
        provider: 'Ford Authorized Service', cost: 28500,
        odometer_at_service: 102000, start_date: new Date().toISOString().split('T')[0],
        status: 'in_progress', performed_by: manager.id,
        notes: 'Waiting for rear caliper parts — ETA 2 days'
      },
      // scheduled (upcoming)
      {
        vehicle_id: vehicles[1].id, maintenance_type: 'preventive',
        description: '50,000 km PMS — timing belt, water pump, all filters',
        provider: 'Hyundai Service Center', cost: 35000,
        odometer_at_service: null,
        start_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'scheduled', performed_by: manager.id,
        notes: 'Scheduled for next week. Service appointment confirmed.'
      },
      {
        vehicle_id: vehicles[3].id, maintenance_type: 'inspection',
        description: 'Annual LTO emission test and road worthiness inspection 2025',
        provider: 'LTO-Accredited Shop', cost: 2500,
        start_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'scheduled', performed_by: manager.id
      },
      {
        vehicle_id: vehicles[7].id, maintenance_type: 'preventive',
        description: '30,000 km PMS — oil change, filters, suspension check',
        provider: 'Mitsubishi Service Center', cost: 12000,
        start_date: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
        status: 'scheduled'
      },
      // cancelled
      {
        vehicle_id: vehicles[0].id, maintenance_type: 'preventive',
        description: 'AC system refrigerant recharge and cleaning',
        provider: 'Cool Breeze Auto', cost: 5500,
        start_date: '2024-11-05', status: 'cancelled', performed_by: manager.id,
        notes: 'Cancelled — driver reported AC is working fine after all'
      },
    ]);
    console.log('✅ Maintenance seeded (12 records — all statuses covered)');

    // ─────────────────────────────────────────────────────────────────────────
    // RESERVATIONS  — covers all statuses: pending, approved, rejected,
    //                 dispatched, in_progress, completed, cancelled
    // ─────────────────────────────────────────────────────────────────────────
    const now = new Date();
    const h = (n) => new Date(now.getTime() + n * 3600000);  // now + n hours
    const d = (n) => new Date(now.getTime() + n * 86400000); // now + n days
    const past = (n) => new Date(now.getTime() - n * 3600000);

    const reservations = await Reservation.bulkCreate([
      // ── pending ──────────────────────────────────────────────────────────
      {
        reservation_code: 'RES-000001',
        requester_id: mariaUser.id, purpose: 'catering_delivery',
        description: 'Deliver catering supplies to wedding event at SMX Mall of Asia',
        pickup_location: 'Hotel Kitchen, Makati', dropoff_location: 'SMX Convention Center, Pasay',
        scheduled_start: h(3), scheduled_end: h(5),
        passenger_count: 2, priority: 'normal', status: 'pending',
        special_instructions: 'Handle fragile items carefully. Confirm with event coordinator on arrival.'
      },
      {
        reservation_code: 'RES-000002',
        requester_id: carlosUser.id, purpose: 'supplier_pickup',
        description: 'Pickup linen and toiletry supplies from Divisoria warehouse',
        pickup_location: 'Divisoria Warehouse, Manila', dropoff_location: 'Hotel Storage Room B',
        scheduled_start: d(1), scheduled_end: new Date(d(1).getTime() + 3 * 3600000),
        passenger_count: 1, priority: 'low', status: 'pending'
      },
      {
        reservation_code: 'RES-000003',
        requester_id: anaUser.id, purpose: 'guest_transport',
        description: 'Airport transfer for corporate guests checking out',
        pickup_location: 'Hotel Lobby', dropoff_location: 'NAIA Terminal 1',
        scheduled_start: d(2), scheduled_end: new Date(d(2).getTime() + 2 * 3600000),
        passenger_count: 3, priority: 'high', status: 'pending',
        special_instructions: 'Flight at 14:30. Ensure 3-hour lead time departure.'
      },
      // ── approved ──────────────────────────────────────────────────────────
      {
        reservation_code: 'RES-000004',
        requester_id: mariaUser.id, vehicle_id: vehicles[0].id, driver_id: juan.id,
        purpose: 'guest_transport',
        description: 'VIP airport pickup — Japanese business delegation',
        pickup_location: 'NAIA Terminal 3, Pasay', dropoff_location: 'Grand Hyatt BGC',
        scheduled_start: h(2), scheduled_end: h(4),
        passenger_count: 4, priority: 'high', status: 'approved',
        approved_by: manager.id, approved_at: new Date(now.getTime() - 1 * 3600000),
        special_instructions: 'Hold nameplate: Yamamoto Group. Assist with luggage.'
      },
      {
        reservation_code: 'RES-000005',
        requester_id: carlosUser.id, vehicle_id: vehicles[1].id, driver_id: pedro.id,
        purpose: 'staff_shuttle',
        description: 'Evening staff shuttle — closing shift team',
        pickup_location: 'Hotel Main Entrance', dropoff_location: 'Cubao Bus Terminal',
        scheduled_start: h(6), scheduled_end: h(8),
        passenger_count: 11, priority: 'normal', status: 'approved',
        approved_by: manager.id, approved_at: new Date(now.getTime() - 30 * 60000),
      },
      {
        reservation_code: 'RES-000006',
        requester_id: robertoUser.id, vehicle_id: vehicles[6].id, driver_id: pedro.id,
        purpose: 'other',
        description: 'Equipment transport — PA system rental return',
        pickup_location: 'Hotel Ballroom', dropoff_location: 'Sound Pro Rentals, Quezon City',
        scheduled_start: d(1), scheduled_end: new Date(d(1).getTime() + 4 * 3600000),
        passenger_count: 2, priority: 'normal', status: 'approved',
        approved_by: manager.id, approved_at: now,
      },
      // ── rejected ──────────────────────────────────────────────────────────
      {
        reservation_code: 'RES-000007',
        requester_id: anaUser.id, purpose: 'guest_transport',
        description: 'Guest leisure trip to Tagaytay (personal request)',
        pickup_location: 'Hotel Lobby', dropoff_location: 'Tagaytay Ridge, Cavite',
        scheduled_start: h(10), scheduled_end: h(15),
        passenger_count: 2, priority: 'low', status: 'rejected',
        approved_by: manager.id, approved_at: new Date(now.getTime() - 2 * 3600000),
        rejection_reason: 'Out-of-area leisure trips not covered under hotel transport policy. Guest advised to arrange private hire.'
      },
      {
        reservation_code: 'RES-000008',
        requester_id: robertoUser.id, purpose: 'other',
        description: 'Personal errand — document notarization in Pasig',
        pickup_location: 'Hotel Office', dropoff_location: 'Pasig Notary Office',
        scheduled_start: past(5), scheduled_end: past(4),
        passenger_count: 1, priority: 'low', status: 'rejected',
        approved_by: manager.id, approved_at: new Date(now.getTime() - 6 * 3600000),
        rejection_reason: 'Personal errands not allowed under company vehicle policy.'
      },
      // ── cancelled ──────────────────────────────────────────────────────────
      {
        reservation_code: 'RES-000009',
        requester_id: mariaUser.id, vehicle_id: vehicles[0].id, driver_id: juan.id,
        purpose: 'guest_transport',
        description: 'Guest transfer — flight cancelled by airline',
        pickup_location: 'Hotel Lobby', dropoff_location: 'NAIA Terminal 2',
        scheduled_start: past(10), scheduled_end: past(8),
        passenger_count: 2, priority: 'normal', status: 'cancelled',
        approved_by: manager.id, approved_at: new Date(now.getTime() - 12 * 3600000),
        cancellation_reason: 'Guest flight cancelled by Cebu Pacific. Reservation no longer needed.'
      },
      {
        reservation_code: 'RES-000010',
        requester_id: carlosUser.id, purpose: 'catering_delivery',
        description: 'Catering delivery for corporate lunch — event cancelled',
        pickup_location: 'Hotel Kitchen', dropoff_location: 'Ayala Tower 1, BGC',
        scheduled_start: past(20), scheduled_end: past(18),
        passenger_count: 1, priority: 'normal', status: 'cancelled',
        cancellation_reason: 'Corporate client cancelled the event. Same-day notice received.'
      },
      // ── dispatched (assigned + sent out, not yet arrived) ─────────────────
      {
        reservation_code: 'RES-000011',
        requester_id: anaUser.id, vehicle_id: vehicles[7].id, driver_id: ricardo.id,
        purpose: 'guest_transport',
        description: 'Airport run — Korean tour group pickup',
        pickup_location: 'NAIA Terminal 3, Pasay', dropoff_location: 'Manila Hotel, Ermita',
        scheduled_start: past(1), scheduled_end: h(1),
        passenger_count: 5, priority: 'high', status: 'dispatched',
        approved_by: manager.id, approved_at: past(3),
        special_instructions: 'Group of 5, tour guide is Ms. Kim. Large luggage expected.'
      },
      // ── completed (historical trips) ──────────────────────────────────────
      {
        reservation_code: 'RES-000012',
        requester_id: mariaUser.id, vehicle_id: vehicles[0].id, driver_id: juan.id,
        purpose: 'staff_shuttle',
        description: 'Morning staff shuttle — opening shift',
        pickup_location: 'Cubao Terminal, QC', dropoff_location: 'Hotel Main Entrance, Makati',
        scheduled_start: new Date('2024-12-01T06:00:00'), scheduled_end: new Date('2024-12-01T07:30:00'),
        passenger_count: 8, priority: 'normal', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2024-11-30T18:00:00')
      },
      {
        reservation_code: 'RES-000013',
        requester_id: carlosUser.id, vehicle_id: vehicles[1].id, driver_id: pedro.id,
        purpose: 'supplier_pickup',
        description: 'Weekly food supplies pickup from Divisoria market',
        pickup_location: 'Divisoria, Manila', dropoff_location: 'Hotel Receiving Bay, Makati',
        scheduled_start: new Date('2024-12-05T07:00:00'), scheduled_end: new Date('2024-12-05T10:00:00'),
        passenger_count: 2, priority: 'normal', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2024-12-04T16:00:00')
      },
      {
        reservation_code: 'RES-000014',
        requester_id: anaUser.id, vehicle_id: vehicles[3].id, driver_id: juan.id,
        purpose: 'guest_transport',
        description: 'VIP pickup — CEO from Ninoy Aquino Airport',
        pickup_location: 'NAIA Terminal 1, Pasay', dropoff_location: 'Shangri-La BGC',
        scheduled_start: new Date('2024-12-08T14:00:00'), scheduled_end: new Date('2024-12-08T15:30:00'),
        passenger_count: 1, priority: 'urgent', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2024-12-08T10:00:00')
      },
      {
        reservation_code: 'RES-000015',
        requester_id: robertoUser.id, vehicle_id: vehicles[2].id, driver_id: pedro.id,
        purpose: 'other',
        description: 'Urgent document courier — inter-hotel contracts',
        pickup_location: 'Hotel Admin Office', dropoff_location: 'Diamond Hotel, Ermita',
        scheduled_start: new Date('2024-12-10T09:00:00'), scheduled_end: new Date('2024-12-10T10:00:00'),
        passenger_count: 1, priority: 'high', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2024-12-10T08:30:00')
      },
    ]);
    console.log('✅ Reservations seeded (15 reservations — all statuses covered)');

    // ─────────────────────────────────────────────────────────────────────────
    // DISPATCH RECORDS + TRIP LOGS  (for completed & dispatched reservations)
    // ─────────────────────────────────────────────────────────────────────────
    // RES-000011 (dispatched, still active)
    const dispatch11 = await DispatchRecord.create({
      reservation_id: reservations[10].id, // RES-000011
      vehicle_id: vehicles[7].id,
      driver_id: ricardo.id,
      dispatched_by: manager.id,
      dispatched_at: past(1),
      odometer_start: 33500,
      fuel_start: 75,
      status: 'dispatched'
    });
    await TripLog.create({
      dispatch_id: dispatch11.id,
      reservation_id: reservations[10].id,
      driver_id: ricardo.id,
      vehicle_id: vehicles[7].id,
      trip_date: new Date().toISOString().split('T')[0],
      scheduled_start: past(1),
      scheduled_end: h(1),
      status: 'in_progress'
    });

    // Helper to seed completed trips
    const seedCompletedTrip = async (reservation, vehicle, driver, dispatchedBy, opts = {}) => {
      const dispatch = await DispatchRecord.create({
        reservation_id: reservation.id,
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        dispatched_by: dispatchedBy.id,
        dispatched_at: new Date(reservation.scheduled_start.getTime() - 15 * 60000),
        actual_start: reservation.scheduled_start,
        actual_end: reservation.scheduled_end,
        odometer_start: opts.odoStart || 20000,
        odometer_end: opts.odoEnd || 20150,
        fuel_start: opts.fuelStart || 80,
        fuel_end: opts.fuelEnd || 65,
        fuel_consumed: opts.fuelConsumed || 8,
        distance_km: opts.distance || 45,
        status: 'completed',
        notes: opts.notes || ''
      });
      await TripLog.create({
        dispatch_id: dispatch.id,
        reservation_id: reservation.id,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        trip_date: reservation.scheduled_start.toISOString().split('T')[0],
        scheduled_start: reservation.scheduled_start,
        scheduled_end: reservation.scheduled_end,
        actual_start: reservation.scheduled_start,
        actual_end: new Date(reservation.scheduled_end.getTime() + (opts.delayMins || 0) * 60000),
        delay_minutes: opts.delayMins || 0,
        duration_minutes: opts.durationMins || 90,
        distance_km: opts.distance || 45,
        fuel_consumed: opts.fuelConsumed || 8,
        driver_rating: opts.rating || 5.0,
        status: 'completed',
        notes: opts.notes || ''
      });
    };

    await seedCompletedTrip(reservations[11], vehicles[0], juan, manager, { odoStart: 24800, odoEnd: 24910, distance: 110, fuelConsumed: 12.5, fuelStart: 90, fuelEnd: 70, durationMins: 92, delayMins: 0, rating: 5.0, notes: 'On time, passengers satisfied' });
    await seedCompletedTrip(reservations[12], vehicles[1], pedro, manager, { odoStart: 46800, odoEnd: 46900, distance: 95, fuelConsumed: 14.2, fuelStart: 85, fuelEnd: 62, durationMins: 185, delayMins: 12, rating: 4.5, notes: 'Slight delay due to Divisoria traffic' });
    await seedCompletedTrip(reservations[13], vehicles[3], juan, manager,  { odoStart: 10800, odoEnd: 10910, distance: 28, fuelConsumed: 5.1, fuelStart: 95, fuelEnd: 88, durationMins: 65, delayMins: 0, rating: 5.0, notes: 'VIP guest — excellent feedback received' });
    await seedCompletedTrip(reservations[14], vehicles[2], pedro, manager, { odoStart: 9100, odoEnd: 9122, distance: 22, fuelConsumed: 1.8, fuelStart: 70, fuelEnd: 65, durationMins: 48, delayMins: 0, rating: 4.8 });

    console.log('✅ Dispatch records and trip logs seeded');

    // ─────────────────────────────────────────────────────────────────────────
    // DRIVER INCIDENTS  (covers minor, moderate, major, critical — various statuses)
    // ─────────────────────────────────────────────────────────────────────────
    await DriverIncident.bulkCreate([
      {
        driver_id: armando.id, incident_type: 'accident',
        severity: 'minor',
        description: 'Minor fender-bender in hotel parking. No injuries. Vehicle had small dent on rear bumper.',
        incident_date: new Date('2024-10-05T14:30:00'),
        location: 'Hotel Basement Parking, Makati',
        reported_by: manager.id,
        action_taken: 'Verbal warning issued. Defensive driving reminder given.',
        status: 'resolved'
      },
      {
        driver_id: armando.id, incident_type: 'accident',
        severity: 'moderate',
        description: 'Side-swiped a parked motorcycle while reversing in narrow alley. Motorcycle had scratches. No injuries.',
        incident_date: new Date('2024-11-18T09:15:00'),
        location: 'Dela Rosa Street, Makati',
        reported_by: manager.id,
        action_taken: 'Written warning issued. Vehicle damage reported to insurance. Driver suspended pending investigation.',
        status: 'investigating'
      },
      {
        driver_id: pedro.id, incident_type: 'traffic_violation',
        severity: 'minor',
        description: 'Received MMDA citation for illegal parking during supplier pickup in Divisoria.',
        incident_date: new Date('2024-09-22T10:00:00'),
        location: 'Divisoria, Manila',
        reported_by: manager.id,
        action_taken: 'Fine settled by driver. Reminded to use designated loading/unloading zones.',
        status: 'closed'
      },
      {
        driver_id: juan.id, incident_type: 'vehicle_damage',
        severity: 'minor',
        description: 'Small chip on windshield reported after SLEX expressway run — likely debris.',
        incident_date: new Date('2024-08-14T16:45:00'),
        location: 'SLEX Northbound, Laguna',
        reported_by: juanUser.id,
        action_taken: 'Windshield chip sealed by auto glass shop. No further action needed.',
        status: 'closed'
      },
      {
        driver_id: eduardo.id, incident_type: 'misconduct',
        severity: 'moderate',
        description: 'Guest complaint: driver was using phone while driving during airport transfer.',
        incident_date: new Date('2024-11-01T08:20:00'),
        location: 'C5 Road, Taguig',
        reported_by: manager.id,
        action_taken: 'Formal warning issued. Attended road safety seminar. Under probation for 30 days.',
        status: 'resolved'
      },
    ]);
    console.log('✅ Driver incidents seeded');

    // ─────────────────────────────────────────────────────────────────────────
    // EXPENSES & FUEL  — 8 months of rich, varied data
    // ─────────────────────────────────────────────────────────────────────────
    const expenseRows = [];
    const fuelRows = [];

    // Rich expense patterns per vehicle per month
    const expenseTemplates = [
      // Toyota Fortuner
      { vehicleIdx: 0, driverIdx: 0, type: 'fuel',         baseAmount: 3200,  variation: 800,  desc: 'Fuel fillup — Shell EDSA' },
      { vehicleIdx: 0, driverIdx: 0, type: 'toll',         baseAmount: 380,   variation: 120,  desc: 'SLEX/NLEX expressway toll' },
      { vehicleIdx: 0, driverIdx: 0, type: 'parking',      baseAmount: 250,   variation: 100,  desc: 'NAIA airport parking' },
      { vehicleIdx: 0, driverIdx: 0, type: 'maintenance',  baseAmount: 9500,  variation: 3000, desc: 'Scheduled PMS' },
      // Hyundai H350 Van
      { vehicleIdx: 1, driverIdx: 1, type: 'fuel',         baseAmount: 4100,  variation: 900,  desc: 'Fuel fillup — Petron Taft' },
      { vehicleIdx: 1, driverIdx: 1, type: 'toll',         baseAmount: 480,   variation: 150,  desc: 'Expressway toll charges' },
      { vehicleIdx: 1, driverIdx: 1, type: 'maintenance',  baseAmount: 7500,  variation: 2000, desc: 'Van maintenance service' },
      // Honda CB150
      { vehicleIdx: 2, driverIdx: 1, type: 'fuel',         baseAmount: 500,   variation: 150,  desc: 'Fuel fillup — Seaoil' },
      // Toyota Land Cruiser
      { vehicleIdx: 3, driverIdx: 0, type: 'fuel',         baseAmount: 5800,  variation: 1200, desc: 'Fuel fillup — Caltex' },
      { vehicleIdx: 3, driverIdx: 0, type: 'toll',         baseAmount: 600,   variation: 200,  desc: 'Executive route toll' },
      { vehicleIdx: 3, driverIdx: 0, type: 'parking',      baseAmount: 450,   variation: 150,  desc: 'BGC paid parking' },
      // Mitsubishi Strada
      { vehicleIdx: 7, driverIdx: 2, type: 'fuel',         baseAmount: 3600,  variation: 700,  desc: 'Fuel fillup — Phoenix' },
      { vehicleIdx: 7, driverIdx: 2, type: 'toll',         baseAmount: 320,   variation: 100,  desc: 'Airport toll charges' },
      // Fleet-wide
      { vehicleIdx: 0, driverIdx: 0, type: 'insurance',    baseAmount: 28000, variation: 0,    desc: 'Comprehensive insurance renewal — Fortuner' },
      { vehicleIdx: 1, driverIdx: 1, type: 'registration', baseAmount: 6500,  variation: 0,    desc: 'LTO annual registration — H350 Van' },
      { vehicleIdx: 3, driverIdx: 0, type: 'insurance',    baseAmount: 52000, variation: 0,    desc: 'Comprehensive insurance renewal — Land Cruiser' },
    ];

    const months = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const m of months) {
      const mm = String(m).padStart(2, '0');
      for (const t of expenseTemplates) {
        // Not all expense types happen every month
        if (t.type === 'maintenance' && m % 3 !== 0) continue;
        if (t.type === 'insurance' && m !== 1) continue;
        if (t.type === 'registration' && m !== 3) continue;
        const amount = +(t.baseAmount + (Math.random() * t.variation - t.variation / 2)).toFixed(2);
        const day = String(Math.floor(Math.random() * 25) + 1).padStart(2, '0');
        expenseRows.push({
          vehicle_id: vehicles[t.vehicleIdx].id,
          driver_id: drivers[Math.min(t.driverIdx, drivers.length - 1)].id,
          expense_type: t.type,
          amount,
          currency: 'PHP',
          expense_date: `2024-${mm}-${day}`,
          description: t.desc,
          recorded_by: manager.id
        });
      }

      // Fuel logs — detailed, per vehicle
      const fuelTemplates = [
        { vehicleIdx: 0, driverIdx: 0, liters: 42, ppl: 62.5, odo: 20000 + m * 1800, station: 'Shell EDSA, Mandaluyong' },
        { vehicleIdx: 0, driverIdx: 0, liters: 38, ppl: 63.0, odo: 20000 + m * 1800 + 900, station: 'Caltex NAIA' },
        { vehicleIdx: 1, driverIdx: 1, liters: 55, ppl: 61.8, odo: 44000 + m * 2200, station: 'Petron Taft Ave, Pasay' },
        { vehicleIdx: 1, driverIdx: 1, liters: 48, ppl: 62.0, odo: 44000 + m * 2200 + 1100, station: 'Shell Buendia, Makati' },
        { vehicleIdx: 2, driverIdx: 1, liters: 5.5, ppl: 64.5, odo: 8200 + m * 400, station: 'Seaoil BGC' },
        { vehicleIdx: 3, driverIdx: 0, liters: 70, ppl: 63.2, odo: 10000 + m * 900, station: 'Caltex Fort, BGC' },
        { vehicleIdx: 7, driverIdx: 2, liters: 45, ppl: 62.8, odo: 32000 + m * 1500, station: 'Phoenix NAIA' },
      ];
      for (const f of fuelTemplates) {
        const day = String(Math.floor(Math.random() * 25) + 1).padStart(2, '0');
        const totalCost = +(f.liters * f.ppl).toFixed(2);
        fuelRows.push({
          vehicle_id: vehicles[f.vehicleIdx].id,
          driver_id: drivers[Math.min(f.driverIdx, drivers.length - 1)].id,
          fuel_date: `2024-${mm}-${day}T08:00:00`,
          liters: f.liters,
          price_per_liter: f.ppl,
          total_cost: totalCost,
          odometer_reading: f.odo,
          station_name: f.station,
          recorded_by: manager.id
        });
      }
    }

    await TransportExpense.bulkCreate(expenseRows);
    await FuelLog.bulkCreate(fuelRows);
    console.log(`✅ Expenses seeded (${expenseRows.length} records)`);
    console.log(`✅ Fuel logs seeded  (${fuelRows.length} records)`);

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🎉 Seeding complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  VEHICLE STATUSES SEEDED:');
    console.log('  ✔  available   — 4 vehicles (Fortuner, H350, CB150, Land Cruiser)');
    console.log('  ✔  maintenance — 2 vehicles (Hiace, Ford Ranger)');
    console.log('  ✔  reserved    — 1 vehicle  (Suzuki APV)');
    console.log('  ✔  in_transit  — 1 vehicle  (Mitsubishi Strada)');
    console.log('  ✔  inactive    — 1 vehicle  (Mitsubishi L300)');
    console.log('\n  DRIVER STATUSES SEEDED:');
    console.log('  ✔  available  — 2 drivers (Juan, Pedro)');
    console.log('  ✔  on_trip    — 1 driver  (Ricardo)');
    console.log('  ✔  off_duty   — 1 driver  (Eduardo)');
    console.log('  ✔  suspended  — 1 driver  (Armando)');
    console.log('\n  RESERVATION STATUSES SEEDED:');
    console.log('  ✔  pending    — 3 reservations');
    console.log('  ✔  approved   — 3 reservations');
    console.log('  ✔  rejected   — 2 reservations');
    console.log('  ✔  cancelled  — 2 reservations');
    console.log('  ✔  dispatched — 1 reservation  (RES-000011 — active now)');
    console.log('  ✔  completed  — 4 reservations (with full trip logs)');
    console.log('\n  MAINTENANCE STATUSES SEEDED:');
    console.log('  ✔  completed  — 6 records');
    console.log('  ✔  in_progress — 2 records');
    console.log('  ✔  scheduled  — 3 records');
    console.log('  ✔  cancelled  — 1 record');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n  📋 Login Credentials:');
    console.log('  Admin:            admin@hotel.com      / Admin@123');
    console.log('  Transport Mgr:    transport@hotel.com  / Manager@123');
    console.log('  Driver (Senior):  juan@hotel.com       / Driver@123');
    console.log('  Driver:           pedro@hotel.com      / Driver@123');
    console.log('  Staff:            maria@hotel.com      / Staff@123');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seed();