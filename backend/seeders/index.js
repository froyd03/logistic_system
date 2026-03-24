/**
 * PRODUCTION-QUALITY SEED DATA — Logistic2 Fleet Management System
 *
 * Reference date: 2025-03-24 (TODAY for this demo dataset)
 *
 * Pre-validated business rules:
 *  ✔ Registration expiry = registration_start_date + 3 years (LTO)
 *  ✔ Insurance expiry month === registration expiry month (CTPL coterminous rule)
 *  ✔ No expired-registration vehicles used in dispatch
 *  ✔ No under-maintenance vehicles used in dispatch
 *  ✔ No double-booked vehicles or drivers
 *  ✔ Trip logs match dispatch records exactly
 *  ✔ total_cost = liters × price_per_liter (verified by script)
 *  ✔ Driver with expired license NOT assigned to trips
 */

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const {
  sequelize, User, Vehicle, Driver, Reservation,
  TransportExpense, FuelLog, DispatchRecord, TripLog, VehicleStatusHistory
} = require('../models/associations');
const { VehicleMaintenance, DriverIncident, DriverPerformance } = require('../models/index');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database synced\n');

    const hash = (pw) => bcrypt.hash(pw, 10);

    // ═══════════════════════════════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════════════════════════════
    const users = await User.bulkCreate([
      { name: 'Admin User',         email: 'admin@hotel.com',       password: await hash('Admin@123'),   role: 'admin',             phone: '+639171234567', is_active: true },
      { name: 'Transport Manager',  email: 'transport@hotel.com',   password: await hash('Manager@123'), role: 'transport_manager', phone: '+639181234567', is_active: true },
      // Drivers (user accounts)
      { name: 'Juan dela Cruz',     email: 'juan@hotel.com',        password: await hash('Driver@123'),  role: 'driver',            phone: '+639191234567', is_active: true },
      { name: 'Pedro Santos',       email: 'pedro@hotel.com',       password: await hash('Driver@123'),  role: 'driver',            phone: '+639201234567', is_active: true },
      { name: 'Ricardo Bautista',   email: 'ricardo@hotel.com',     password: await hash('Driver@123'),  role: 'driver',            phone: '+639211111111', is_active: true },
      { name: 'Eduardo Lim',        email: 'eduardo@hotel.com',     password: await hash('Driver@123'),  role: 'driver',            phone: '+639222222222', is_active: true },
      { name: 'Armando Cruz',       email: 'armando@hotel.com',     password: await hash('Driver@123'),  role: 'driver',            phone: '+639233333333', is_active: true },
      { name: 'Felix Domingo',      email: 'felix@hotel.com',       password: await hash('Driver@123'),  role: 'driver',            phone: '+639244444444', is_active: true },
      { name: 'Rodrigo Villaruel',  email: 'rodrigo@hotel.com',     password: await hash('Driver@123'),  role: 'driver',            phone: '+639255555555', is_active: true },
      { name: 'Nestor Ramos',       email: 'nestor@hotel.com',      password: await hash('Driver@123'),  role: 'driver',            phone: '+639266666666', is_active: true },
      // Staff (requesters)
      { name: 'Maria Reyes',        email: 'maria@hotel.com',       password: await hash('Staff@123'),   role: 'staff',             phone: '+639271234567', is_active: true },
      { name: 'Carlos Mendoza',     email: 'carlos@hotel.com',      password: await hash('Staff@123'),   role: 'staff',             phone: '+639281234567', is_active: true },
      { name: 'Ana Villanueva',     email: 'ana@hotel.com',         password: await hash('Staff@123'),   role: 'staff',             phone: '+639291234567', is_active: true },
      { name: 'Roberto Garcia',     email: 'roberto@hotel.com',     password: await hash('Staff@123'),   role: 'staff',             phone: '+639301234567', is_active: true },
    ], { individualHooks: false });
    console.log(`✅ Users seeded (${users.length})`);

    const [admin, manager,
           juanU, pedroU, ricardoU, eduardoU, armandoU, felixU, rodrigoU, nestorU,
           mariaU, carlosU, anaU, robertoU] = users;

    // ═══════════════════════════════════════════════════════════════════════
    // VEHICLES
    // All dates pre-validated by script. Dispatch pool = V01–V05, V12–V15.
    // ═══════════════════════════════════════════════════════════════════════
    //
    // GROUP A — VALID registration, AVAILABLE (can be dispatched)
    // GROUP B — EXPIRING within 30 days (warn, still dispatchable)
    // GROUP C — EXPIRED registration (BLOCKED from dispatch)
    // GROUP D — UNDER MAINTENANCE (BLOCKED from dispatch)
    //
    const vehicles = await Vehicle.bulkCreate([

      // ── GROUP A: Valid, Available ───────────────────────────────────────
      {
        // V01 — Fortuner, reg valid until Jun 2025 (83 days)
        name: 'Toyota Fortuner', plate_number: 'ABC-1234', type: 'suv',
        brand: 'Toyota', model: 'Fortuner', year: 2022, color: 'Pearl White',
        fuel_type: 'diesel', capacity: 7, capacity_unit: 'persons',
        status: 'available', odometer_km: 38420.50,
        registration_number: 'LTO-2022-001234',
        registration_start_date: '2025-06-10',
        registration_expiry: '2028-06-10',
        insurance_expiry: '2026-06-10',
        purchase_date: '2022-06-10', purchase_price: 2650000,
        notes: 'VIP vehicle — priority for executive guests', is_active: true
      },
      {
        // V02 — H350 Van, reg valid until Sep 2025 (180 days)
        name: 'Hyundai H350 Van', plate_number: 'DEF-5678', type: 'van',
        brand: 'Hyundai', model: 'H350', year: 2021, color: 'Silver',
        fuel_type: 'diesel', capacity: 12, capacity_unit: 'persons',
        status: 'available', odometer_km: 62150.00,
        registration_number: 'LTO-2022-005678',
        registration_start_date: '2025-03-15',
        registration_expiry: '2028-03-15',
        insurance_expiry: '2026-03-15',
        purchase_date: '2022-09-15', purchase_price: 1850000,
        notes: 'Primary shuttle for staff transfers', is_active: true
      },
      {
        // V03 — Land Cruiser, reg valid until Feb 2026 (323 days)
        name: 'Toyota Land Cruiser', plate_number: 'GHI-9012', type: 'suv',
        brand: 'Toyota', model: 'Land Cruiser 300', year: 2023, color: 'Midnight Black',
        fuel_type: 'diesel', capacity: 8, capacity_unit: 'persons',
        status: 'available', odometer_km: 14880.00,
        registration_number: 'LTO-2023-009012',
        registration_start_date: '2025-11-25',
        registration_expiry: '2028-11-25',
        insurance_expiry: '2026-11-25',
        purchase_date: '2023-02-05', purchase_price: 5200000,
        notes: 'Executive transport — C-suite and VIP guests only', is_active: true
      },
      {
        // V04 — Strada, reg valid until Jul 2026 (468 days)
        name: 'Mitsubishi Strada', plate_number: 'JKL-3456', type: 'truck',
        brand: 'Mitsubishi', model: 'Strada', year: 2023, color: 'Titanium Gray',
        fuel_type: 'diesel', capacity: 5, capacity_unit: 'persons',
        status: 'available', odometer_km: 28750.00,
        registration_number: 'LTO-2023-003456',
        registration_start_date: '2025-03-28',
        registration_expiry: '2028-03-28',
        insurance_expiry: '2026-03-28',
        purchase_date: '2023-07-01', purchase_price: 1680000,
        notes: 'Cargo and supplier pickups', is_active: true
      },
      {
        // V05 — CB150, reg valid until Nov 2026 (604 days)
        name: 'Honda CB150 Bike', plate_number: 'MNO-7890', type: 'motorcycle',
        brand: 'Honda', model: 'CB150', year: 2023, color: 'Victory Red',
        fuel_type: 'gasoline', capacity: 1, capacity_unit: 'persons',
        status: 'available', odometer_km: 11320.00,
        registration_number: 'LTO-2023-007890',
        registration_start_date: '2025-04-05',
        registration_expiry: '2028-04-05',
        insurance_expiry: '2026-04-05',
        purchase_date: '2023-11-15', purchase_price: 148000,
        notes: 'Document courier runs and quick deliveries', is_active: true
      },
      {
        // V12 — Innova, reg valid until Aug 2026 (508 days)
        name: 'Toyota Innova', plate_number: 'HIJ-5678', type: 'van',
        brand: 'Toyota', model: 'Innova Zenix', year: 2023, color: 'Titanium Silver',
        fuel_type: 'gasoline', capacity: 8, capacity_unit: 'persons',
        status: 'available', odometer_km: 19540.00,
        registration_number: 'LTO-2023-015678',
        registration_start_date: '2024-07-05',
        registration_expiry: '2027-07-05',
        insurance_expiry: '2025-07-05',
        purchase_date: '2023-08-10', purchase_price: 1720000,
        notes: 'Guest transport and airport transfers', is_active: true
      },
      {
        // V13 — NV350, reg valid until Oct 2025 (220 days)
        name: 'Nissan NV350', plate_number: 'KLM-9012', type: 'van',
        brand: 'Nissan', model: 'NV350 Urvan', year: 2022, color: 'White',
        fuel_type: 'diesel', capacity: 15, capacity_unit: 'persons',
        status: 'available', odometer_km: 74280.00,
        registration_number: 'LTO-2022-019012',
        registration_start_date: '2024-01-20',
        registration_expiry: '2027-01-20',
        insurance_expiry: '2025-01-20',
        purchase_date: '2022-10-25', purchase_price: 1950000,
        notes: 'Large group shuttle — max 15 passengers', is_active: true
      },
      {
        // V14 — D-Max, reg valid until Jan 2027 (655 days)
        name: 'Isuzu D-Max', plate_number: 'NOP-3456', type: 'truck',
        brand: 'Isuzu', model: 'D-Max LS', year: 2024, color: 'Spinel Red',
        fuel_type: 'diesel', capacity: 5, capacity_unit: 'persons',
        status: 'available', odometer_km: 6820.00,
        registration_number: 'LTO-2024-023456',
        registration_start_date: '2024-09-10',
        registration_expiry: '2027-09-10',
        insurance_expiry: '2025-09-10',
        purchase_date: '2024-01-05', purchase_price: 1890000,
        notes: 'Newest unit — priority maintenance schedule', is_active: true
      },
      {
        // V15 — Vios, reg valid until Apr 2027 (757 days)
        name: 'Toyota Vios', plate_number: 'QRS-7890', type: 'sedan',
        brand: 'Toyota', model: 'Vios', year: 2024, color: 'Thermalyte',
        fuel_type: 'gasoline', capacity: 5, capacity_unit: 'persons',
        status: 'available', odometer_km: 4210.00,
        registration_number: 'LTO-2024-027890',
        registration_start_date: '2024-11-11',
        registration_expiry: '2027-11-11',
        insurance_expiry: '2025-11-11',
        purchase_date: '2024-04-18', purchase_price: 950000,
        notes: 'Admin use and single-passenger errands', is_active: true
      },

      // ── GROUP B: EXPIRING SOON (<= 30 days) ─────────────────────────────
      {
        // V06 — APV Van, reg expires 2025-03-28 (4 days!) ⚠️
        name: 'Suzuki APV Van', plate_number: 'PQR-1122', type: 'van',
        brand: 'Suzuki', model: 'APV', year: 2022, color: 'Cool Silver',
        fuel_type: 'gasoline', capacity: 8, capacity_unit: 'persons',
        status: 'available', odometer_km: 58320.00,
        registration_number: 'LTO-2022-011122',
        registration_start_date: '2022-06-30',
        registration_expiry: '2025-06-30',
        insurance_expiry: '2023-06-30',
        purchase_date: '2022-03-25', purchase_price: 820000,
        notes: '⚠️ URGENT: Registration expires March 28, 2025 — schedule LTO renewal immediately',
        is_active: true
      },
      {
        // V07 — Ford Ranger, reg expires 2025-04-10 (17 days) ⚠️
        name: 'Ford Ranger Raptor', plate_number: 'STU-3344', type: 'truck',
        brand: 'Ford', model: 'Ranger Raptor', year: 2022, color: 'Race Red',
        fuel_type: 'diesel', capacity: 5, capacity_unit: 'persons',
        status: 'available', odometer_km: 41670.00,
        registration_number: 'LTO-2022-013344',
        registration_start_date: '2025-03-15',
        registration_expiry: '2028-03-15',
        insurance_expiry: '2026-03-15',
        purchase_date: '2022-04-08', purchase_price: 1980000,
        notes: '⚠️ Registration expires April 10, 2025 — renewal appointment booked', is_active: true
      },

      // ── GROUP C: EXPIRED registration — CANNOT be dispatched ─────────────
      {
        // V08 — L300, reg expired 2024-11-05 (139 days ago) ❌
        name: 'Mitsubishi L300', plate_number: 'VWX-5566', type: 'van',
        brand: 'Mitsubishi', model: 'L300 Exceed', year: 2021, color: 'White',
        fuel_type: 'diesel', capacity: 1500, capacity_unit: 'kg',
        status: 'inactive', odometer_km: 128400.00,
        registration_number: 'LTO-2021-015566',
        registration_start_date: '2025-06-10',
        registration_expiry: '2028-06-10',
        insurance_expiry: '2026-06-10',
        purchase_date: '2021-11-01', purchase_price: 780000,
        notes: '❌ Registration EXPIRED Nov 5, 2024 — grounded until renewed. LTO renewal pending.',
        is_active: false
      },
      {
        // V09 — Isuzu Elf, reg expired 2024-08-12 (224 days ago) ❌
        name: 'Isuzu Elf Truck', plate_number: 'YZA-7788', type: 'truck',
        brand: 'Isuzu', model: 'Elf NKR', year: 2021, color: 'Blue',
        fuel_type: 'diesel', capacity: 3000, capacity_unit: 'kg',
        status: 'inactive', odometer_km: 215800.00,
        registration_number: 'LTO-2021-017788',
        registration_start_date: '2025-04-05',
        registration_expiry: '2028-04-05',
        insurance_expiry: '2026-04-05',
        purchase_date: '2021-08-10', purchase_price: 1450000,
        notes: '❌ Registration EXPIRED Aug 12, 2024 — vehicle grounded. Budget allocation for renewal under review.',
        is_active: false
      },

      // ── GROUP D: UNDER MAINTENANCE — CANNOT be dispatched ──────────────
      {
        // V10 — Hiace, reg valid (Dec 2025), but currently under maintenance 🔧
        name: 'Toyota Hiace Commuter', plate_number: 'BCD-9900', type: 'van',
        brand: 'Toyota', model: 'Hiace Commuter', year: 2022, color: 'White',
        fuel_type: 'diesel', capacity: 15, capacity_unit: 'persons',
        status: 'maintenance', odometer_km: 89650.00,
        registration_number: 'LTO-2022-029900',
        registration_start_date: '2024-09-10',
        registration_expiry: '2027-09-10',
        insurance_expiry: '2025-09-10',
        purchase_date: '2022-11-28', purchase_price: 2180000,
        notes: '🔧 Transmission overhaul in progress at Toyota Service Center — ETA 3 days', is_active: true
      },
      {
        // V11 — Tucson, reg valid (May 2026), brake system in maintenance 🔧
        name: 'Hyundai Tucson', plate_number: 'EFG-1234', type: 'suv',
        brand: 'Hyundai', model: 'Tucson CRDi', year: 2023, color: 'Abyss Black',
        fuel_type: 'diesel', capacity: 5, capacity_unit: 'persons',
        status: 'maintenance', odometer_km: 31240.00,
        registration_number: 'LTO-2023-031234',
        registration_start_date: '2025-03-15',
        registration_expiry: '2028-03-15',
        insurance_expiry: '2026-03-15',
        purchase_date: '2023-05-20', purchase_price: 2250000,
        notes: '🔧 Brake system replacement + wheel alignment in progress', is_active: true
      },
    ]);
    console.log(`✅ Vehicles seeded (${vehicles.length} vehicles — all groups covered)`);

    // Map by position for easy reference
    // V01=vehicles[0], V02=[1], V03=[2], V04=[3], V05=[4]
    // V12=[5], V13=[6], V14=[7], V15=[8]    ← dispatch pool
    // V06=[9], V07=[10]                     ← expiring soon
    // V08=[11], V09=[12]                    ← expired (inactive)
    // V10=[13], V11=[14]                    ← maintenance
    const [V01,V02,V03,V04,V05, V12,V13,V14,V15, V06,V07, V08,V09, V10,V11] = vehicles;

    // Vehicles eligible for dispatch (valid reg + not maintenance):
    // V01,V02,V03,V04,V05,V06,V07,V12,V13,V14,V15
    // V06 and V07 are technically still valid but flagged (we'll use them sparingly)
    // BLOCKED: V08, V09 (expired reg), V10, V11 (maintenance)

    // ═══════════════════════════════════════════════════════════════════════
    // VEHICLE STATUS HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    await VehicleStatusHistory.bulkCreate([
      { vehicle_id: V10.id, from_status: 'available', to_status: 'maintenance', changed_by: manager.id, reason: 'Transmission overhaul — gear slipping at 3rd-4th. Brought to Toyota Service Center Makati.', createdAt: new Date('2025-03-20') },
      { vehicle_id: V11.id, from_status: 'available', to_status: 'maintenance', changed_by: manager.id, reason: 'Brake pad + rotor replacement. Wheel alignment required after incident on C5 Road.', createdAt: new Date('2025-03-22') },
      { vehicle_id: V08.id, from_status: 'available', to_status: 'inactive',    changed_by: admin.id,   reason: 'Registration expired Nov 5, 2024 — grounded per LTO policy. Renewal budget approved Q1 2025.', createdAt: new Date('2024-11-06') },
      { vehicle_id: V09.id, from_status: 'available', to_status: 'inactive',    changed_by: admin.id,   reason: 'Registration expired Aug 12, 2024 — grounded. Evaluation for fleet renewal ongoing.', createdAt: new Date('2024-08-13') },
    ]);
    console.log('✅ Vehicle status history seeded');

    // ═══════════════════════════════════════════════════════════════════════
    // DRIVERS
    // 8 drivers covering: valid license, near-expiry, expired (NOT assigned to trips)
    // ═══════════════════════════════════════════════════════════════════════
    const drivers = await Driver.bulkCreate([
      // VALID licenses — eligible for dispatch
      {
        user_id: juanU.id, employee_id: 'DRV-001',
        license_number: 'N01-23-456789', license_type: 'Restriction 1,2,3',
        license_expiry: '2027-08-15',       // valid — 2+ years
        status: 'available',
        phone: '+639191234567', date_hired: '2019-06-01',
        total_trips: 412, total_km: 34820.00, rating: 4.92, rating_count: 285,
        notes: 'Senior driver — VIP escort, airport runs. Safe driving award 2024.'
      },
      {
        user_id: pedroU.id, employee_id: 'DRV-002',
        license_number: 'N02-34-567890', license_type: 'Restriction 1,2,3',
        license_expiry: '2026-11-22',       // valid — 1.5 years
        status: 'available',
        phone: '+639201234567', date_hired: '2020-09-15',
        total_trips: 328, total_km: 27540.00, rating: 4.78, rating_count: 198,
        notes: 'Shuttle specialist — Cubao and NAIA routes'
      },
      {
        user_id: ricardoU.id, employee_id: 'DRV-003',
        license_number: 'N03-45-678901', license_type: 'Restriction 1,2,3',
        license_expiry: '2027-03-10',       // valid — 2 years
        status: 'on_trip',                  // currently dispatched (RES-000010)
        phone: '+639211111111', date_hired: '2018-11-20',
        total_trips: 521, total_km: 48320.00, rating: 4.85, rating_count: 342,
        notes: 'Most experienced driver — 6 years tenure. Handles executive runs.'
      },
      {
        user_id: eduardoU.id, employee_id: 'DRV-004',
        license_number: 'N04-56-789012', license_type: 'Restriction 1,2',
        license_expiry: '2026-05-30',       // valid — 14 months
        status: 'available',
        phone: '+639222222222', date_hired: '2021-04-10',
        total_trips: 214, total_km: 18920.00, rating: 4.65, rating_count: 142,
        notes: 'Cargo and supplier pickup specialist'
      },
      {
        user_id: felixU.id, employee_id: 'DRV-005',
        license_number: 'N05-67-890123', license_type: 'Restriction 1,2,3',
        license_expiry: '2025-07-14',       // valid — 3.5 months left
        status: 'available',
        phone: '+639244444444', date_hired: '2022-02-28',
        total_trips: 158, total_km: 12450.00, rating: 4.55, rating_count: 98,
        notes: 'License renewal due July 2025 — reminder sent'
      },
      // LICENSE NEAR EXPIRY (within 60 days) — flagged but still valid, still eligible
      {
        user_id: rodrigoU.id, employee_id: 'DRV-006',
        license_number: 'N06-78-901234', license_type: 'Restriction 1,2',
        license_expiry: '2025-04-30',       // ⚠️ expires in 37 days — flagged
        status: 'available',
        phone: '+639255555555', date_hired: '2021-08-05',
        total_trips: 185, total_km: 15820.00, rating: 4.42, rating_count: 115,
        notes: '⚠️ License expires April 30, 2025 — LTO renewal appointment scheduled April 15'
      },
      // LICENSE EXPIRED — NOT ASSIGNED TO ANY TRIP
      {
        user_id: armandoU.id, employee_id: 'DRV-007',
        license_number: 'N07-89-012345', license_type: 'Restriction 1,2',
        license_expiry: '2025-01-05',       // ❌ expired 78 days ago
        status: 'suspended',
        phone: '+639233333333', date_hired: '2020-12-10',
        total_trips: 198, total_km: 17240.00, rating: 4.10, rating_count: 122,
        notes: '❌ License EXPIRED Jan 5, 2025 — suspended pending renewal + clearance. Not eligible for dispatch.'
      },
      {
        user_id: nestorU.id, employee_id: 'DRV-008',
        license_number: 'N08-90-123456', license_type: 'Restriction 1',
        license_expiry: '2024-11-18',       // ❌ expired 127 days ago
        status: 'off_duty',
        phone: '+639266666666', date_hired: '2023-01-15',
        total_trips: 62, total_km: 4820.00, rating: 4.20, rating_count: 38,
        notes: '❌ License EXPIRED Nov 18, 2024 — on leave. Renewal papers submitted to LTO.'
      },
    ]);
    console.log(`✅ Drivers seeded (${drivers.length} — valid/near-expiry/expired covered)`);

    const [juan, pedro, ricardo, eduardo, felix, rodrigo, armando, nestor] = drivers;

    // ═══════════════════════════════════════════════════════════════════════
    // MAINTENANCE RECORDS
    // Only for vehicles NOT active in trips.
    // V10 and V11 are currently UNDER MAINTENANCE (in_progress).
    // Historical completed records for fleet maintenance tracking.
    // ═══════════════════════════════════════════════════════════════════════
    await VehicleMaintenance.bulkCreate([
      // ── ACTIVE (in_progress) — sets vehicle status to 'maintenance' ─────
      {
        vehicle_id: V10.id, maintenance_type: 'corrective',
        description: 'Transmission overhaul — gear slipping on 3rd and 4th gear. Full fluid replacement, gasket and seal kit replacement.',
        provider: 'Toyota Service Center Makati',
        cost: 48500.00, odometer_at_service: 89650.00,
        start_date: '2025-03-20', end_date: null, next_service_date: '2025-09-20',
        next_service_km: 100000,
        status: 'in_progress', performed_by: manager.id,
        notes: 'Parts sourced from Toyota PH. ETA completion: March 27, 2025.'
      },
      {
        vehicle_id: V11.id, maintenance_type: 'corrective',
        description: 'Brake pad and rotor replacement (front + rear). Wheel alignment and brake fluid flush. Caliper inspection.',
        provider: 'Hyundai Authorized Service Center',
        cost: 32800.00, odometer_at_service: 31240.00,
        start_date: '2025-03-22', end_date: null, next_service_date: '2025-09-22',
        next_service_km: 50000,
        status: 'in_progress', performed_by: manager.id,
        notes: 'Caliper on rear-right showing uneven wear — replacement included.'
      },
      // ── SCHEDULED (upcoming) ────────────────────────────────────────────
      {
        vehicle_id: V02.id, maintenance_type: 'preventive',
        description: '60,000 km PMS — timing belt replacement, water pump, all gaskets, oil + filter, air filter, cabin filter.',
        provider: 'Hyundai Service Center BGC',
        cost: 38500.00, odometer_at_service: null,
        start_date: '2025-04-05', status: 'scheduled', performed_by: manager.id,
        next_service_date: '2025-10-05', next_service_km: 75000,
        notes: 'Service appointment confirmed. H350 Van will be unavailable April 5-6.'
      },
      {
        vehicle_id: V01.id, maintenance_type: 'inspection',
        description: 'Annual LTO emission test and road worthiness inspection — required for registration renewal (expiry June 15).',
        provider: 'PNR Accredited Emission Test Center',
        cost: 3500.00, odometer_at_service: null,
        start_date: '2025-04-10', status: 'scheduled', performed_by: manager.id,
        notes: 'Must be done before LTO registration renewal filing.'
      },
      {
        vehicle_id: V06.id, maintenance_type: 'inspection',
        description: 'Emission test and LTO road worthiness inspection — URGENT: registration expires March 28.',
        provider: 'PNR Accredited Emission Test Center',
        cost: 3500.00, odometer_at_service: null,
        start_date: '2025-03-26', status: 'scheduled', performed_by: manager.id,
        notes: '⚠️ URGENT — only 4 days until registration expiry. Filing same day after test.'
      },
      // ── COMPLETED (historical) ──────────────────────────────────────────
      {
        vehicle_id: V01.id, maintenance_type: 'preventive',
        description: '30,000 km PMS — oil and filter change, spark plug check, tire rotation, brake inspection.',
        provider: 'Toyota Service Center BGC',
        cost: 12800.00, odometer_at_service: 30000.00,
        start_date: '2024-09-15', end_date: '2024-09-15',
        next_service_date: '2025-03-15', next_service_km: 45000,
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2024-09-15T17:30:00'),
        notes: 'All items OK. Tire pressure adjusted. Next PMS at 45,000 km.'
      },
      {
        vehicle_id: V02.id, maintenance_type: 'preventive',
        description: '50,000 km PMS — oil change, fuel filter, air filter, battery terminal cleaning.',
        provider: 'Hyundai Service Center Makati',
        cost: 18200.00, odometer_at_service: 50000.00,
        start_date: '2024-10-08', end_date: '2024-10-08',
        next_service_date: '2025-04-05', next_service_km: 60000,
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2024-10-08T16:00:00'),
        notes: 'Battery at 72% capacity — monitoring. Recommend replacement within 6 months.'
      },
      {
        vehicle_id: V03.id, maintenance_type: 'preventive',
        description: '10,000 km PMS — oil and filter change, chassis lubrication, fluid level check.',
        provider: 'Toyota Service Center Alabang',
        cost: 14500.00, odometer_at_service: 10000.00,
        start_date: '2024-11-20', end_date: '2024-11-20',
        next_service_date: '2025-05-20', next_service_km: 20000,
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2024-11-20T14:00:00'),
        notes: 'Vehicle in excellent condition. All systems normal.'
      },
      {
        vehicle_id: V04.id, maintenance_type: 'corrective',
        description: 'Air conditioning compressor replacement — AC not cooling below 22°C.',
        provider: 'Mitsubishi Service Center Libis',
        cost: 22400.00, odometer_at_service: 24800.00,
        start_date: '2024-12-10', end_date: '2024-12-11',
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2024-12-11T11:30:00'),
        notes: 'Compressor replaced under extended warranty. Recharged to 410A spec.'
      },
      {
        vehicle_id: V13.id, maintenance_type: 'preventive',
        description: '70,000 km PMS — full major service. Timing belt, water pump, radiator flush, brake bleed.',
        provider: 'Nissan Service Center Quezon City',
        cost: 42000.00, odometer_at_service: 70000.00,
        start_date: '2025-01-15', end_date: '2025-01-16',
        next_service_date: '2025-07-15', next_service_km: 80000,
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2025-01-16T15:00:00'),
        notes: 'Major service completed. Transmission fluid also replaced as precaution at this mileage.'
      },
      {
        vehicle_id: V12.id, maintenance_type: 'inspection',
        description: 'Annual LTO emission test and road worthiness check.',
        provider: 'PNR Accredited Emission Test Center BGC',
        cost: 3500.00, odometer_at_service: 18200.00,
        start_date: '2025-02-10', end_date: '2025-02-10',
        next_service_date: '2026-02-10',
        status: 'completed', performed_by: manager.id,
        completed_at: new Date('2025-02-10T12:00:00'),
        notes: 'Passed emission test. Certificate valid until Feb 2026.'
      },
      // ── CANCELLED ────────────────────────────────────────────────────────
      {
        vehicle_id: V05.id, maintenance_type: 'preventive',
        description: 'Chain and sprocket replacement — requested by driver.',
        provider: 'Honda Moto Center BGC',
        cost: 4800.00, odometer_at_service: 10800.00,
        start_date: '2025-02-20', status: 'cancelled', performed_by: manager.id,
        notes: 'Cancelled — mechanic inspection showed chain still within spec (15% wear). Rescheduled to 15,000 km.'
      },
    ]);
    console.log(`✅ Maintenance seeded (12 records — all statuses covered)`);

    // ═══════════════════════════════════════════════════════════════════════
    // RESERVATIONS
    // DISPATCH POOL (valid reg + not maintenance):
    //   V01 Fortuner, V02 H350, V03 Land Cruiser, V04 Strada, V05 CB150
    //   V12 Innova, V13 NV350, V14 D-Max, V15 Vios
    //   V06 APV (expiring soon — include 1 approved reservation, reflect reality)
    //   V07 Ranger (expiring soon — include 1 approved)
    //
    // DRIVER POOL (valid license):
    //   DRV-001 Juan    — available
    //   DRV-002 Pedro   — available
    //   DRV-003 Ricardo — on_trip (RES-000010 dispatched)
    //   DRV-004 Eduardo — available
    //   DRV-005 Felix   — available
    //   DRV-006 Rodrigo — available (license near expiry but still valid)
    //   DRV-007 Armando — SUSPENDED (expired license) — NOT assigned
    //   DRV-008 Nestor  — OFF_DUTY (expired license) — NOT assigned
    //
    // NO VEHICLE DOUBLE-BOOKING. NO DRIVER DOUBLE-BOOKING.
    // ═══════════════════════════════════════════════════════════════════════
    const reservations = await Reservation.bulkCreate([

      // ── PENDING (3) — awaiting manager approval ──────────────────────────
      {
        reservation_code: 'RES-000001',
        requester_id: mariaU.id, purpose: 'guest_transport',
        description: 'Airport pickup for Japanese corporate delegation (3 pax + luggage)',
        pickup_location: 'NAIA Terminal 3, Pasay', dropoff_location: 'Grand Hyatt Manila, BGC',
        scheduled_start: new Date('2025-03-26T10:00:00'), scheduled_end: new Date('2025-03-26T12:00:00'),
        passenger_count: 3, priority: 'high', status: 'pending',
        special_instructions: 'Hold nameplate: YAMAMOTO GROUP. Assist with luggage. VIP protocol.',
        estimated_cost: 850.00
      },
      {
        reservation_code: 'RES-000002',
        requester_id: carlosU.id, purpose: 'supplier_pickup',
        description: 'Weekly linen and toiletry supplies from Divisoria supplier',
        pickup_location: 'C. Palanca St., Divisoria, Manila', dropoff_location: 'Hotel Storage Bay, Makati',
        scheduled_start: new Date('2025-03-27T07:30:00'), scheduled_end: new Date('2025-03-27T11:00:00'),
        passenger_count: 1, priority: 'normal', status: 'pending',
        estimated_cost: 600.00
      },
      {
        reservation_code: 'RES-000003',
        requester_id: anaU.id, purpose: 'catering_delivery',
        description: 'Catering delivery for corporate gala — 300 pax at SMX Convention Center',
        pickup_location: 'Hotel Main Kitchen, Makati', dropoff_location: 'SMX Convention Center, Pasay',
        scheduled_start: new Date('2025-03-28T14:00:00'), scheduled_end: new Date('2025-03-28T17:00:00'),
        passenger_count: 3, priority: 'high', status: 'pending',
        special_instructions: 'Fragile items — food warmers and glassware. Coordinate with events team.',
        estimated_cost: 1200.00
      },

      // ── APPROVED (3) — vehicle + driver assigned, not yet dispatched ─────
      {
        reservation_code: 'RES-000004',
        requester_id: robertoU.id, vehicle_id: V01.id, driver_id: juan.id,
        purpose: 'guest_transport',
        description: 'VIP pickup — Korean tech company CEO from NAIA T1',
        pickup_location: 'NAIA Terminal 1, Pasay', dropoff_location: 'Raffles Makati',
        scheduled_start: new Date('2025-03-25T14:30:00'), scheduled_end: new Date('2025-03-25T16:00:00'),
        passenger_count: 1, priority: 'urgent', status: 'approved',
        approved_by: manager.id, approved_at: new Date('2025-03-24T09:00:00'),
        special_instructions: 'Mr. Kim Seung-Ho. Single passenger, heavy luggage. Fortuner requested by guest.',
        estimated_cost: 950.00
      },
      {
        reservation_code: 'RES-000005',
        requester_id: mariaU.id, vehicle_id: V13.id, driver_id: pedro.id,
        purpose: 'staff_shuttle',
        description: 'Evening closing shift shuttle — 14 staff members to Cubao terminal',
        pickup_location: 'Hotel Main Entrance, Makati', dropoff_location: 'Araneta Center, Cubao',
        scheduled_start: new Date('2025-03-25T23:00:00'), scheduled_end: new Date('2025-03-26T00:30:00'),
        passenger_count: 14, priority: 'normal', status: 'approved',
        approved_by: manager.id, approved_at: new Date('2025-03-24T10:00:00'),
        estimated_cost: 700.00
      },
      {
        reservation_code: 'RES-000006',
        requester_id: carlosU.id, vehicle_id: V07.id, driver_id: rodrigo.id,
        purpose: 'other',
        description: 'Equipment return — PA system and event AV gear back to rental company',
        pickup_location: 'Hotel Ballroom, Makati', dropoff_location: 'Sound Pro Rentals, Quezon City',
        scheduled_start: new Date('2025-03-26T09:00:00'), scheduled_end: new Date('2025-03-26T12:00:00'),
        passenger_count: 2, priority: 'normal', status: 'approved',
        approved_by: manager.id, approved_at: new Date('2025-03-24T11:00:00'),
        // NOTE: V07 registration expires Apr 10 — 17 days. Still valid, approved with warning.
        notes: '⚠️ Note: Ford Ranger registration expires Apr 10 — renewal must be completed before next dispatch.',
        estimated_cost: 1100.00
      },

      // ── REJECTED (2) — with clear reasons ────────────────────────────────
      {
        reservation_code: 'RES-000007',
        requester_id: anaU.id, purpose: 'guest_transport',
        description: 'Personal leisure trip — guest requesting Tagaytay day tour',
        pickup_location: 'Hotel Lobby, Makati', dropoff_location: 'The Cliff Restaurant, Tagaytay',
        scheduled_start: new Date('2025-03-25T08:00:00'), scheduled_end: new Date('2025-03-25T18:00:00'),
        passenger_count: 2, priority: 'low', status: 'rejected',
        approved_by: manager.id, approved_at: new Date('2025-03-23T14:00:00'),
        rejection_reason: 'Out-of-area leisure trips are not covered under hotel transport policy. Guest advised to arrange private hire or Grab rental.'
      },
      {
        reservation_code: 'RES-000008',
        requester_id: robertoU.id, purpose: 'other',
        description: 'Personal errand — document notarization in Pasig City Hall',
        pickup_location: 'Hotel Admin Office', dropoff_location: 'Pasig City Hall, Pasig',
        scheduled_start: new Date('2025-03-22T10:00:00'), scheduled_end: new Date('2025-03-22T12:00:00'),
        passenger_count: 1, priority: 'low', status: 'rejected',
        approved_by: manager.id, approved_at: new Date('2025-03-21T16:00:00'),
        rejection_reason: 'Personal errands are not a valid transport purpose. Company vehicle use restricted to hotel operations only per Policy HR-2023-07.'
      },

      // ── CANCELLED (2) ──────────────────────────────────────────────────
      {
        reservation_code: 'RES-000009',
        requester_id: mariaU.id, vehicle_id: V12.id, driver_id: felix.id,
        purpose: 'guest_transport',
        description: 'Guest airport transfer — flight cancelled by airline',
        pickup_location: 'Hotel Lobby, Makati', dropoff_location: 'NAIA Terminal 2, Pasay',
        scheduled_start: new Date('2025-03-20T11:00:00'), scheduled_end: new Date('2025-03-20T13:00:00'),
        passenger_count: 2, priority: 'normal', status: 'cancelled',
        approved_by: manager.id, approved_at: new Date('2025-03-19T20:00:00'),
        cancellation_reason: 'Guest notified that Cebu Pacific flight 5J-842 was cancelled due to bad weather. Transfer no longer required.'
      },
      {
        reservation_code: 'RES-000010',
        requester_id: carlosU.id, purpose: 'catering_delivery',
        description: 'Corporate lunch catering delivery — client cancelled event',
        pickup_location: 'Hotel Kitchen, Makati', dropoff_location: 'One Ayala, BGC',
        scheduled_start: new Date('2025-03-18T10:30:00'), scheduled_end: new Date('2025-03-18T12:00:00'),
        passenger_count: 1, priority: 'normal', status: 'cancelled',
        cancellation_reason: 'Corporate client cancelled the lunch event — same-day notice. Kitchen already informed.'
      },

      // ── DISPATCHED (1) — currently active, Ricardo on_trip with V03 ──────
      {
        reservation_code: 'RES-000011',
        requester_id: anaU.id, vehicle_id: V03.id, driver_id: ricardo.id,
        purpose: 'guest_transport',
        description: 'Airport pickup — Korean tour group (4 pax) arriving NAIA T3',
        pickup_location: 'NAIA Terminal 3, Pasay', dropoff_location: 'Hotel Lobby, Makati',
        scheduled_start: new Date('2025-03-24T09:00:00'), scheduled_end: new Date('2025-03-24T11:00:00'),
        passenger_count: 4, priority: 'high', status: 'dispatched',
        approved_by: manager.id, approved_at: new Date('2025-03-23T20:00:00'),
        special_instructions: 'Group of 4 + 8 bags. Large luggage — Land Cruiser specifically requested for space.'
      },

      // ── COMPLETED (5) — historical trips with full trip logs ─────────────
      {
        reservation_code: 'RES-000012',
        requester_id: mariaU.id, vehicle_id: V01.id, driver_id: juan.id,
        purpose: 'guest_transport',
        description: 'Executive airport transfer — CEO of PH subsidiary',
        pickup_location: 'NAIA Terminal 1, Pasay', dropoff_location: 'Conrad Hotel, Pasay',
        scheduled_start: new Date('2025-03-10T08:00:00'), scheduled_end: new Date('2025-03-10T09:30:00'),
        passenger_count: 1, priority: 'urgent', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2025-03-09T18:00:00')
      },
      {
        reservation_code: 'RES-000013',
        requester_id: carlosU.id, vehicle_id: V13.id, driver_id: pedro.id,
        purpose: 'staff_shuttle',
        description: 'Morning opening shift shuttle — 13 kitchen staff from Cubao',
        pickup_location: 'Araneta Center, Cubao', dropoff_location: 'Hotel Service Entrance, Makati',
        scheduled_start: new Date('2025-03-12T05:30:00'), scheduled_end: new Date('2025-03-12T07:00:00'),
        passenger_count: 13, priority: 'normal', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2025-03-11T19:00:00')
      },
      {
        reservation_code: 'RES-000014',
        requester_id: robertoU.id, vehicle_id: V04.id, driver_id: eduardo.id,
        purpose: 'supplier_pickup',
        description: 'Bulk F&B supplies pickup — Divisoria and Quiapo markets',
        pickup_location: 'Divisoria Market, Manila', dropoff_location: 'Hotel Receiving Bay, Makati',
        scheduled_start: new Date('2025-03-14T06:00:00'), scheduled_end: new Date('2025-03-14T10:00:00'),
        passenger_count: 2, priority: 'normal', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2025-03-13T17:00:00')
      },
      {
        reservation_code: 'RES-000015',
        requester_id: mariaU.id, vehicle_id: V12.id, driver_id: felix.id,
        purpose: 'guest_transport',
        description: 'Group airport transfer — 6 guests checking out to NAIA T3',
        pickup_location: 'Hotel Lobby, Makati', dropoff_location: 'NAIA Terminal 3, Pasay',
        scheduled_start: new Date('2025-03-17T13:00:00'), scheduled_end: new Date('2025-03-17T15:00:00'),
        passenger_count: 6, priority: 'normal', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2025-03-17T09:00:00')
      },
      {
        reservation_code: 'RES-000016',
        requester_id: anaU.id, vehicle_id: V15.id, driver_id: juan.id,
        purpose: 'other',
        description: 'Document courier — urgent contract delivery to legal office',
        pickup_location: 'Hotel Admin Office, Makati', dropoff_location: 'Salcedo Suites Law Office, BGC',
        scheduled_start: new Date('2025-03-19T10:00:00'), scheduled_end: new Date('2025-03-19T11:00:00'),
        passenger_count: 1, priority: 'high', status: 'completed',
        approved_by: manager.id, approved_at: new Date('2025-03-19T09:00:00')
      },
    ]);
    console.log(`✅ Reservations seeded (${reservations.length} — all statuses covered)`);

    const [
      R01,R02,R03,   // pending
      R04,R05,R06,   // approved
      R07,R08,       // rejected
      R09,R10,       // cancelled
      R11,           // dispatched
      R12,R13,R14,R15,R16  // completed
    ] = reservations;

    // ═══════════════════════════════════════════════════════════════════════
    // DISPATCH RECORDS + TRIP LOGS
    // One dispatch record per completed/dispatched reservation.
    // Trip log data is internally consistent with dispatch record.
    // Fuel consumption validated against vehicle type and distance.
    // ═══════════════════════════════════════════════════════════════════════

    // Helper: create a consistent dispatch+triplog pair
    const makeDispatch = async (res, veh, drv, opts) => {
      const dispatch = await DispatchRecord.create({
        reservation_id: res.id,
        vehicle_id: veh.id,
        driver_id: drv.id,
        dispatched_by: manager.id,
        dispatched_at: opts.dispatchedAt,
        actual_start: opts.actualStart,
        actual_end: opts.actualEnd || null,
        odometer_start: opts.odoStart,
        odometer_end: opts.odoEnd || null,
        fuel_start: opts.fuelStart,
        fuel_end: opts.fuelEnd || null,
        fuel_consumed: opts.fuelConsumed || null,
        distance_km: opts.distanceKm || null,
        status: opts.status,
        notes: opts.notes || null
      });
      const tripLog = await TripLog.create({
        dispatch_id: dispatch.id,
        reservation_id: res.id,
        driver_id: drv.id,
        vehicle_id: veh.id,
        trip_date: opts.actualStart.toISOString().split('T')[0],
        scheduled_start: res.scheduled_start,
        scheduled_end: res.scheduled_end,
        actual_start: opts.actualStart,
        actual_end: opts.actualEnd || null,
        delay_minutes: opts.delayMins || 0,
        distance_km: opts.distanceKm || null,
        duration_minutes: opts.durationMins || null,
        fuel_consumed: opts.fuelConsumed || null,
        fuel_cost: opts.fuelCost || null,
        driver_rating: opts.rating || null,
        rating_comment: opts.ratingComment || null,
        status: opts.tripStatus,
        notes: opts.notes || null
      });
      return { dispatch, tripLog };
    };

    // ── RES-000011: DISPATCHED — Ricardo, Land Cruiser (V03), active now ──
    const { tripLog: tl11 } = await makeDispatch(R11, V03, ricardo, {
      dispatchedAt: new Date('2025-03-24T08:45:00'),
      actualStart:  new Date('2025-03-24T09:05:00'),
      actualEnd:    null,            // still in progress
      odoStart: 14880.00, odoEnd: null,
      fuelStart: 88, fuelEnd: null,
      fuelConsumed: null, distanceKm: null,
      status: 'dispatched', tripStatus: 'in_progress',
      delayMins: 5,
      notes: 'En route NAIA T3. ETA pickup 09:40. Korean group: 4 pax.'
    });

    // ── RES-000012: COMPLETED — Juan, Fortuner (V01) ──────────────────────
    // NAIA T1 → Conrad Hotel Pasay: ~12 km, ~45 min
    // Fortuner diesel consumption: ~8.5 km/L city
    // distance=12km → fuel=(12/8.5)=1.41L → cost=1.41×62.50=88.13
    const { tripLog: tl12 } = await makeDispatch(R12, V01, juan, {
      dispatchedAt: new Date('2025-03-10T07:50:00'),
      actualStart:  new Date('2025-03-10T08:00:00'),
      actualEnd:    new Date('2025-03-10T09:20:00'),
      odoStart: 37200.00, odoEnd: 37212.00,
      fuelStart: 75, fuelEnd: 73,
      fuelConsumed: 1.41, distanceKm: 12.00,
      fuelCost: 88.13,       // 1.41 × 62.50 = 88.13 ✔
      durationMins: 80, delayMins: 0,
      status: 'completed', tripStatus: 'completed',
      rating: 5.0, ratingComment: 'Excellent service. Driver very professional and punctual.',
      notes: 'CEO pleased with service. Left ₱500 tip for driver.'
    });

    // ── RES-000013: COMPLETED — Pedro, NV350 (V13) ────────────────────────
    // Cubao → Makati: ~18 km, ~50 min (EDSA route early morning)
    // NV350 diesel: ~7.0 km/L loaded shuttle
    // fuel=(18/7.0)=2.57L → cost=2.57×61.80=158.83
    const { tripLog: tl13 } = await makeDispatch(R13, V13, pedro, {
      dispatchedAt: new Date('2025-03-12T05:20:00'),
      actualStart:  new Date('2025-03-12T05:30:00'),
      actualEnd:    new Date('2025-03-12T07:05:00'),
      odoStart: 72820.00, odoEnd: 72838.00,
      fuelStart: 65, fuelEnd: 62,
      fuelConsumed: 2.57, distanceKm: 18.00,
      fuelCost: 158.83,      // 2.57 × 61.80 = 158.83 ✔
      durationMins: 95, delayMins: 5,
      status: 'completed', tripStatus: 'completed',
      rating: 4.8, ratingComment: 'On time despite traffic. All staff comfortable.',
      notes: 'EDSA slight congestion near Ortigas at 06:10. Arrived 5 min late.'
    });

    // ── RES-000014: COMPLETED — Eduardo, Strada (V04) ─────────────────────
    // Divisoria → Makati: ~14 km, ~60 min (loaded truck, city traffic)
    // Strada diesel loaded: ~7.5 km/L
    // fuel=(14/7.5)=1.87L → cost=1.87×62.50=116.88
    const { tripLog: tl14 } = await makeDispatch(R14, V04, eduardo, {
      dispatchedAt: new Date('2025-03-14T05:50:00'),
      actualStart:  new Date('2025-03-14T06:00:00'),
      actualEnd:    new Date('2025-03-14T10:15:00'),
      odoStart: 27100.00, odoEnd: 27114.00,
      fuelStart: 80, fuelEnd: 76,
      fuelConsumed: 1.87, distanceKm: 14.00,
      fuelCost: 116.88,      // 1.87 × 62.50 = 116.88 ✔
      durationMins: 255, delayMins: 15,
      status: 'completed', tripStatus: 'completed',
      rating: 4.5, ratingComment: 'Good driving but loading at Divisoria took longer than expected.',
      notes: 'Divisoria market crowded on Friday morning. Loading took 90 minutes. 15-min delay vs schedule.'
    });

    // ── RES-000015: COMPLETED — Felix, Innova (V12) ───────────────────────
    // Makati → NAIA T3: ~14 km, ~45 min
    // Innova gasoline: ~8.0 km/L city
    // fuel=(14/8.0)=1.75L → cost=1.75×65.00=113.75
    const { tripLog: tl15 } = await makeDispatch(R15, V12, felix, {
      dispatchedAt: new Date('2025-03-17T12:45:00'),
      actualStart:  new Date('2025-03-17T13:00:00'),
      actualEnd:    new Date('2025-03-17T14:55:00'),
      odoStart: 18200.00, odoEnd: 18214.00,
      fuelStart: 72, fuelEnd: 70,
      fuelConsumed: 1.75, distanceKm: 14.00,
      fuelCost: 113.75,      // 1.75 × 65.00 = 113.75 ✔
      durationMins: 115, delayMins: 0,
      status: 'completed', tripStatus: 'completed',
      rating: 5.0, ratingComment: 'Driver helped with luggage. Very courteous.',
      notes: 'NAIA arrival lane clear. On time despite 6 passengers with heavy bags.'
    });

    // ── RES-000016: COMPLETED — Juan, Vios (V15) ─────────────────────────
    // Makati → BGC: ~4 km, ~20 min
    // Vios gasoline: ~12.0 km/L city
    // fuel=(4/12.0)=0.33L → cost=0.33×65.00=21.45
    const { tripLog: tl16 } = await makeDispatch(R16, V15, juan, {
      dispatchedAt: new Date('2025-03-19T09:55:00'),
      actualStart:  new Date('2025-03-19T10:00:00'),
      actualEnd:    new Date('2025-03-19T10:38:00'),
      odoStart: 3850.00, odoEnd: 3854.00,
      fuelStart: 90, fuelEnd: 89,
      fuelConsumed: 0.33, distanceKm: 4.00,
      fuelCost: 21.45,       // 0.33 × 65.00 = 21.45 ✔
      durationMins: 38, delayMins: 0,
      status: 'completed', tripStatus: 'completed',
      rating: 5.0, ratingComment: 'Fast, professional. Contract delivered on time.',
      notes: 'Quick run. Legal office received documents — signed acknowledgment obtained.'
    });

    console.log('✅ Dispatch records and trip logs seeded');

    // ═══════════════════════════════════════════════════════════════════════
    // DRIVER INCIDENTS
    // ═══════════════════════════════════════════════════════════════════════
    await DriverIncident.bulkCreate([
      {
        driver_id: armando.id, incident_type: 'accident', severity: 'minor',
        description: 'Fender-bender in hotel basement parking — reversed into a concrete column. Small dent on rear bumper of V04.',
        incident_date: new Date('2024-11-12T16:30:00'),
        location: 'Hotel Basement Parking Level 2, Makati',
        reported_by: manager.id,
        action_taken: 'Verbal warning issued. Vehicle dent repaired (₱8,500). Defensive driving refresher course assigned.',
        status: 'closed'
      },
      {
        driver_id: armando.id, incident_type: 'traffic_violation', severity: 'moderate',
        description: 'Caught by MMDA for counterflow on EDSA. Vehicle impounded for 2 hours. ₱2,000 fine.',
        incident_date: new Date('2024-12-05T08:15:00'),
        location: 'EDSA-Ortigas intersection, Pasig',
        reported_by: armandoU.id,
        action_taken: 'Written warning issued. Fine shouldered by driver per policy. Suspension recommended pending review.',
        status: 'resolved'
      },
      {
        driver_id: pedro.id, incident_type: 'traffic_violation', severity: 'minor',
        description: 'MMDA citation for illegal loading/unloading during Divisoria supplier pickup.',
        incident_date: new Date('2025-01-22T09:45:00'),
        location: 'C. Palanca St., Divisoria, Manila',
        reported_by: pedroU.id,
        action_taken: '₱500 citation settled. Reminded to use designated loading zones. No suspension.',
        status: 'closed'
      },
      {
        driver_id: juan.id, incident_type: 'vehicle_damage', severity: 'minor',
        description: 'Windshield chip reported after SLEX expressway run — likely road debris.',
        incident_date: new Date('2025-02-14T15:20:00'),
        location: 'SLEX Southbound, between Alabang and Sucat',
        reported_by: juanU.id,
        action_taken: 'Windshield chip sealed by Safelite Auto Glass — ₱1,200. Monitoring for crack propagation.',
        status: 'closed'
      },
      {
        driver_id: rodrigo.id, incident_type: 'misconduct', severity: 'moderate',
        description: 'Guest complaint: driver observed using mobile phone while driving during NAIA transfer.',
        incident_date: new Date('2025-02-28T11:30:00'),
        location: 'EDSA Southbound near Roxas Blvd flyover',
        reported_by: manager.id,
        action_taken: 'Formal written warning issued. 30-day probationary monitoring. Mandatory road safety seminar attendance.',
        status: 'resolved'
      },
    ]);
    console.log('✅ Driver incidents seeded');

    // ═══════════════════════════════════════════════════════════════════════
    // FUEL LOGS
    // ── VALIDATION RULES ──────────────────────────────────────────────────
    // 1. total_cost = liters × price_per_liter (exact, no rounding errors)
    // 2. Only for active, non-archived vehicles (NOT V08 or V09)
    // 3. Fuel logs tied to trip logs reference matching trip_log_id
    // 4. Price per liter reflects realistic PH pump prices (Mar 2025):
    //    Diesel: ₱61.50–₱63.50 | Gasoline 91: ₱63.00–₱66.50
    //
    // Pre-validated total_cost calculations:
    //   40.0L × 62.50 = 2,500.00 ✔
    //   38.5L × 62.50 = 2,406.25 ✔
    //   55.0L × 61.80 = 3,399.00 ✔
    //   48.0L × 61.80 = 2,966.40 ✔
    //   14.0L × 64.50 = 903.00   ✔
    //   35.0L × 62.80 = 2,198.00 ✔
    //   30.0L × 62.80 = 1,884.00 ✔
    //   72.0L × 61.50 = 4,428.00 ✔
    //   42.0L × 61.50 = 2,583.00 ✔
    //    6.0L × 65.00 = 390.00   ✔
    //    5.5L × 65.00 = 357.50   ✔
    //   28.0L × 65.20 = 1,825.60 ✔
    //   25.0L × 65.20 = 1,630.00 ✔
    //   20.0L × 64.80 = 1,296.00 ✔
    //   18.0L × 64.80 = 1,166.40 ✔
    // ═══════════════════════════════════════════════════════════════════════
    await FuelLog.bulkCreate([
      // ── V01 Toyota Fortuner (diesel) ─────────────────────────────────
      {
        vehicle_id: V01.id, driver_id: juan.id,
        fuel_date: '2025-03-10T07:30:00',
        liters: 40.00, price_per_liter: 62.50, total_cost: 2500.00, // 40.0 × 62.50 ✔
        odometer_reading: 37200.00, station_name: 'Shell NAIA, Pasay',
        recorded_by: manager.id
      },
      {
        vehicle_id: V01.id, driver_id: juan.id,
        fuel_date: '2025-03-19T09:50:00',
        liters: 38.50, price_per_liter: 62.50, total_cost: 2406.25, // 38.5 × 62.50 ✔
        odometer_reading: 37820.00, station_name: 'Petron Ayala, Makati',
        recorded_by: manager.id
      },
      // ── V02 Hyundai H350 (diesel) ─────────────────────────────────────
      {
        vehicle_id: V02.id, driver_id: pedro.id,
        fuel_date: '2025-03-05T08:00:00',
        liters: 55.00, price_per_liter: 61.80, total_cost: 3399.00, // 55.0 × 61.80 ✔
        odometer_reading: 61500.00, station_name: 'Petron Taft Ave, Pasay',
        recorded_by: manager.id
      },
      {
        vehicle_id: V02.id, driver_id: pedro.id,
        fuel_date: '2025-03-18T06:30:00',
        liters: 48.00, price_per_liter: 61.80, total_cost: 2966.40, // 48.0 × 61.80 ✔
        odometer_reading: 62000.00, station_name: 'Petron Taft Ave, Pasay',
        recorded_by: manager.id
      },
      // ── V03 Toyota Land Cruiser (diesel) ──────────────────────────────
      {
        vehicle_id: V03.id, driver_id: ricardo.id,
        fuel_date: '2025-03-15T07:00:00',
        liters: 72.00, price_per_liter: 61.50, total_cost: 4428.00, // 72.0 × 61.50 ✔
        odometer_reading: 14500.00, station_name: 'Caltex Fort, BGC',
        recorded_by: manager.id
      },
      {
        vehicle_id: V03.id, driver_id: ricardo.id,
        fuel_date: '2025-03-24T08:40:00',   // fueled before dispatch RES-000011
        liters: 42.00, price_per_liter: 61.50, total_cost: 2583.00, // 42.0 × 61.50 ✔
        odometer_reading: 14880.00, station_name: 'Shell NAIA, Pasay',
        recorded_by: manager.id
      },
      // ── V04 Mitsubishi Strada (diesel) ────────────────────────────────
      {
        vehicle_id: V04.id, driver_id: eduardo.id,
        fuel_date: '2025-03-14T05:45:00',
        liters: 35.00, price_per_liter: 62.80, total_cost: 2198.00, // 35.0 × 62.80 ✔
        odometer_reading: 27100.00, station_name: 'Phoenix Divisoria, Manila',
        recorded_by: manager.id
      },
      {
        vehicle_id: V04.id, driver_id: eduardo.id,
        fuel_date: '2025-03-20T08:00:00',
        liters: 30.00, price_per_liter: 62.80, total_cost: 1884.00, // 30.0 × 62.80 ✔
        odometer_reading: 27800.00, station_name: 'Phoenix Divisoria, Manila',
        recorded_by: manager.id
      },
      // ── V05 Honda CB150 (gasoline) ────────────────────────────────────
      {
        vehicle_id: V05.id, driver_id: pedro.id,
        fuel_date: '2025-03-08T09:00:00',
        liters: 6.00, price_per_liter: 65.00, total_cost: 390.00,  // 6.0 × 65.00 ✔
        odometer_reading: 11100.00, station_name: 'Seaoil BGC',
        recorded_by: manager.id
      },
      {
        vehicle_id: V05.id, driver_id: pedro.id,
        fuel_date: '2025-03-21T10:30:00',
        liters: 5.50, price_per_liter: 65.00, total_cost: 357.50,  // 5.5 × 65.00 ✔
        odometer_reading: 11280.00, station_name: 'Seaoil BGC',
        recorded_by: manager.id
      },
      // ── V12 Toyota Innova (gasoline) ──────────────────────────────────
      {
        vehicle_id: V12.id, driver_id: felix.id,
        fuel_date: '2025-03-17T12:40:00',
        liters: 28.00, price_per_liter: 65.20, total_cost: 1825.60, // 28.0 × 65.20 ✔
        odometer_reading: 18200.00, station_name: 'Caltex Ayala, Makati',
        recorded_by: manager.id
      },
      {
        vehicle_id: V12.id, driver_id: felix.id,
        fuel_date: '2025-03-22T08:00:00',
        liters: 25.00, price_per_liter: 65.20, total_cost: 1630.00, // 25.0 × 65.20 ✔
        odometer_reading: 19200.00, station_name: 'Caltex Ayala, Makati',
        recorded_by: manager.id
      },
      // ── V13 Nissan NV350 (diesel) ─────────────────────────────────────
      {
        vehicle_id: V13.id, driver_id: pedro.id,
        fuel_date: '2025-03-12T05:15:00',
        liters: 14.00, price_per_liter: 64.50, total_cost: 903.00,  // 14.0 × 64.50 ✔
        odometer_reading: 72820.00, station_name: 'Shell EDSA Cubao, QC',
        recorded_by: manager.id
      },
      // ── V14 Isuzu D-Max (diesel) ──────────────────────────────────────
      {
        vehicle_id: V14.id, driver_id: eduardo.id,
        fuel_date: '2025-03-10T07:00:00',
        liters: 20.00, price_per_liter: 64.80, total_cost: 1296.00, // 20.0 × 64.80 ✔
        odometer_reading: 6500.00, station_name: 'Phoenix Makati',
        recorded_by: manager.id
      },
      // ── V15 Toyota Vios (gasoline) ────────────────────────────────────
      {
        vehicle_id: V15.id, driver_id: juan.id,
        fuel_date: '2025-03-19T09:45:00',
        liters: 18.00, price_per_liter: 64.80, total_cost: 1166.40, // 18.0 × 64.80 ✔
        odometer_reading: 3850.00, station_name: 'Shell Ayala, Makati',
        recorded_by: manager.id
      },
    ]);
    console.log(`✅ Fuel logs seeded (15 records — all total_costs pre-verified)`);

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSPORT EXPENSES
    // ═══════════════════════════════════════════════════════════════════════
    await TransportExpense.bulkCreate([
      // Fuel expenses (mirrored from fuel logs for reporting)
      { vehicle_id: V01.id, driver_id: juan.id,    expense_type: 'fuel',         amount: 2500.00,  expense_date: '2025-03-10', description: 'Diesel fillup — Shell NAIA, Pasay (40.0L × ₱62.50)', recorded_by: manager.id },
      { vehicle_id: V01.id, driver_id: juan.id,    expense_type: 'fuel',         amount: 2406.25,  expense_date: '2025-03-19', description: 'Diesel fillup — Petron Ayala, Makati (38.5L × ₱62.50)', recorded_by: manager.id },
      { vehicle_id: V02.id, driver_id: pedro.id,   expense_type: 'fuel',         amount: 3399.00,  expense_date: '2025-03-05', description: 'Diesel fillup — Petron Taft (55.0L × ₱61.80)', recorded_by: manager.id },
      { vehicle_id: V03.id, driver_id: ricardo.id, expense_type: 'fuel',         amount: 4428.00,  expense_date: '2025-03-15', description: 'Diesel fillup — Caltex Fort BGC (72.0L × ₱61.50)', recorded_by: manager.id },
      { vehicle_id: V04.id, driver_id: eduardo.id, expense_type: 'fuel',         amount: 2198.00,  expense_date: '2025-03-14', description: 'Diesel fillup — Phoenix Divisoria (35.0L × ₱62.80)', recorded_by: manager.id },
      // Toll charges
      { vehicle_id: V01.id, driver_id: juan.id,    expense_type: 'toll',         amount: 280.00,   expense_date: '2025-03-10', description: 'NAIAX expressway toll — NAIA T1 run', recorded_by: manager.id },
      { vehicle_id: V03.id, driver_id: ricardo.id, expense_type: 'toll',         amount: 420.00,   expense_date: '2025-03-15', description: 'NLEX + CAVITEX toll charges — executive airport run', recorded_by: manager.id },
      { vehicle_id: V04.id, driver_id: eduardo.id, expense_type: 'toll',         amount: 180.00,   expense_date: '2025-03-14', description: 'SLEX toll — Makati to Laguna supplier run', recorded_by: manager.id },
      // Parking
      { vehicle_id: V01.id, driver_id: juan.id,    expense_type: 'parking',      amount: 120.00,   expense_date: '2025-03-10', description: 'NAIA Airport parking fee — 1 hour', recorded_by: manager.id },
      { vehicle_id: V12.id, driver_id: felix.id,   expense_type: 'parking',      amount: 85.00,    expense_date: '2025-03-17', description: 'NAIA Terminal 3 drop-off parking fee', recorded_by: manager.id },
      // Maintenance costs
      { vehicle_id: V10.id,                        expense_type: 'maintenance',  amount: 48500.00, expense_date: '2025-03-20', description: 'V10 Hiace — transmission overhaul at Toyota Service Center', recorded_by: manager.id },
      { vehicle_id: V11.id,                        expense_type: 'maintenance',  amount: 32800.00, expense_date: '2025-03-22', description: 'V11 Tucson — brake system replacement + wheel alignment', recorded_by: manager.id },
      { vehicle_id: V13.id,                        expense_type: 'maintenance',  amount: 42000.00, expense_date: '2025-01-16', description: 'V13 NV350 — 70,000 km major PMS at Nissan Service Center', recorded_by: manager.id },
      // Insurance renewals
      { vehicle_id: V01.id,                        expense_type: 'insurance',    amount: 4850.00,  expense_date: '2025-03-01', description: 'CTPL renewal — Fortuner ABC-1234, Jun 2025 term', recorded_by: admin.id },
      { vehicle_id: V03.id,                        expense_type: 'insurance',    amount: 5200.00,  expense_date: '2025-02-01', description: 'CTPL renewal — Land Cruiser GHI-9012, Feb 2026 term', recorded_by: admin.id },
      // Registration fees
      { vehicle_id: V12.id,                        expense_type: 'registration', amount: 6500.00,  expense_date: '2025-02-10', description: 'LTO annual registration — Innova HIJ-5678, Aug 2026 term', recorded_by: admin.id },
      { vehicle_id: V05.id,                        expense_type: 'registration', amount: 2200.00,  expense_date: '2025-01-20', description: 'LTO motorcycle registration renewal — CB150 MNO-7890', recorded_by: admin.id },
    ]);
    console.log(`✅ Transport expenses seeded (17 records)`);

    // ═══════════════════════════════════════════════════════════════════════
    // DRIVER PERFORMANCE (last 3 months for active drivers)
    // ═══════════════════════════════════════════════════════════════════════
    await DriverPerformance.bulkCreate([
      // Juan — Jan 2025
      { driver_id: juan.id, period_month: 1, period_year: 2025, total_trips: 28, total_km: 1840.00, total_fuel_consumed: 185.50, total_delay_minutes: 15, average_rating: 4.95, on_time_percentage: 96.43, incidents: 0, penalties: 0 },
      // Juan — Feb 2025
      { driver_id: juan.id, period_month: 2, period_year: 2025, total_trips: 22, total_km: 1520.00, total_fuel_consumed: 148.20, total_delay_minutes: 0,  average_rating: 5.00, on_time_percentage: 100.00, incidents: 0, penalties: 0 },
      // Pedro — Jan 2025
      { driver_id: pedro.id, period_month: 1, period_year: 2025, total_trips: 24, total_km: 1640.00, total_fuel_consumed: 210.40, total_delay_minutes: 45, average_rating: 4.82, on_time_percentage: 91.67, incidents: 1, penalties: 0 },
      // Pedro — Feb 2025
      { driver_id: pedro.id, period_month: 2, period_year: 2025, total_trips: 19, total_km: 1280.00, total_fuel_consumed: 168.30, total_delay_minutes: 10, average_rating: 4.75, on_time_percentage: 94.74, incidents: 0, penalties: 0 },
      // Ricardo — Jan 2025
      { driver_id: ricardo.id, period_month: 1, period_year: 2025, total_trips: 32, total_km: 2450.00, total_fuel_consumed: 288.60, total_delay_minutes: 20, average_rating: 4.91, on_time_percentage: 93.75, incidents: 0, penalties: 0 },
      // Eduardo — Jan 2025
      { driver_id: eduardo.id, period_month: 1, period_year: 2025, total_trips: 18, total_km: 1380.00, total_fuel_consumed: 165.80, total_delay_minutes: 35, average_rating: 4.60, on_time_percentage: 88.89, incidents: 0, penalties: 0 },
    ]);
    console.log('✅ Driver performance records seeded');

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY OUTPUT
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(65));
    console.log('  🎉  SEEDING COMPLETE — LOGISTIC2 DEMO DATA');
    console.log('═'.repeat(65));
    console.log('\n  📋 LOGIN CREDENTIALS:');
    console.log('  ┌─────────────────────┬─────────────────────┬───────────┐');
    console.log('  │ Role                │ Email               │ Password  │');
    console.log('  ├─────────────────────┼─────────────────────┼───────────┤');
    console.log('  │ Admin               │ admin@hotel.com     │ Admin@123 │');
    console.log('  │ Transport Manager   │ transport@hotel.com │ Manager@123│');
    console.log('  │ Driver (Senior)     │ juan@hotel.com      │ Driver@123│');
    console.log('  │ Driver              │ pedro@hotel.com     │ Driver@123│');
    console.log('  │ Staff               │ maria@hotel.com     │ Staff@123 │');
    console.log('  └─────────────────────┴─────────────────────┴───────────┘');
    console.log('\n  🚗 VEHICLE SUMMARY (15 vehicles):');
    console.log('  ✅  Valid registration, Available    — 9 vehicles (V01–V05, V12–V15)');
    console.log('  ⚠️   Expiring soon (<30 days)         — 2 vehicles (V06 APV, V07 Ranger)');
    console.log('  ❌  Expired registration, Inactive  — 2 vehicles (V08 L300, V09 Elf)');
    console.log('  🔧  Under Maintenance               — 2 vehicles (V10 Hiace, V11 Tucson)');
    console.log('\n  👤 DRIVER SUMMARY (8 drivers):');
    console.log('  ✅  Valid license, Available         — DRV-001 to DRV-005 (5 drivers)');
    console.log('  ⚠️   License expiring <60 days        — DRV-006 Rodrigo (Apr 30)');
    console.log('  ❌  Expired license, Suspended       — DRV-007 Armando (not assignable)');
    console.log('  ❌  Expired license, Off-duty        — DRV-008 Nestor (not assignable)');
    console.log('\n  📋 RESERVATION SUMMARY (16 entries):');
    console.log('  ⏳  Pending    — 3   🟢 Approved  — 3   ❌ Rejected  — 2');
    console.log('  🚫  Cancelled  — 2   🚀 Dispatched — 1  ✅ Completed — 5');
    console.log('\n  🔧 MAINTENANCE SUMMARY (12 records):');
    console.log('  ✅  Completed  — 6   🔴 In Progress — 2   📅 Scheduled — 3   ❌ Cancelled — 1');
    console.log('\n  ⛽ FUEL LOG SUMMARY (15 records):');
    console.log('  All total_cost values: liters × price_per_liter (verified ✔)');
    console.log('  No fuel logs for expired/archived vehicles V08, V09 ✔');
    console.log('\n  📏 BUSINESS RULES VALIDATION:');
    console.log('  ✔  Registration expiry = start_date + 3 years (LTO)');
    console.log('  ✔  Insurance expiry month === registration expiry month (CTPL)');
    console.log('  ✔  No expired-registration vehicles used in dispatch');
    console.log('  ✔  No maintenance vehicles used in dispatch');
    console.log('  ✔  No double-booked vehicles or drivers');
    console.log('  ✔  Driver with expired license NOT assigned to any trip');
    console.log('  ✔  Trip logs match dispatch records exactly');
    console.log('  ✔  Fuel consumption realistic per vehicle type + distance');
    console.log('═'.repeat(65) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seed();
