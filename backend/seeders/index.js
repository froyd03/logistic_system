require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const { sequelize, User, Vehicle, Driver, Reservation, TransportExpense, FuelLog } = require('../models/associations');
const { VehicleMaintenance } = require('../models/index');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');

    // Users
    const users = await User.bulkCreate([
      { name: 'Admin User', email: 'admin@hotel.com', password: await bcrypt.hash('Admin@123', 10), role: 'admin', phone: '+639171234567' },
      { name: 'Transport Manager', email: 'transport@hotel.com', password: await bcrypt.hash('Manager@123', 10), role: 'transport_manager', phone: '+639181234567' },
      { name: 'Juan dela Cruz', email: 'juan@hotel.com', password: await bcrypt.hash('Driver@123', 10), role: 'driver', phone: '+639191234567' },
      { name: 'Pedro Santos', email: 'pedro@hotel.com', password: await bcrypt.hash('Driver@123', 10), role: 'driver', phone: '+639201234567' },
      { name: 'Maria Reyes', email: 'maria@hotel.com', password: await bcrypt.hash('Staff@123', 10), role: 'staff', phone: '+639211234567' },
      { name: 'Carlos Mendoza', email: 'carlos@hotel.com', password: await bcrypt.hash('Staff@123', 10), role: 'staff', phone: '+639221234567' }
    ], { individualHooks: false });
    console.log('✅ Users seeded');

    // Vehicles
    const vehicles = await Vehicle.bulkCreate([
      { name: 'Toyota Fortuner', plate_number: 'ABC-1234', type: 'suv', brand: 'Toyota', model: 'Fortuner', year: 2022, color: 'White', fuel_type: 'diesel', capacity: 7, status: 'available', odometer_km: 25000, registration_expiry: '2025-12-31', insurance_expiry: '2025-06-30', purchase_price: 2500000 },
      { name: 'Hyundai H350 Van', plate_number: 'DEF-5678', type: 'van', brand: 'Hyundai', model: 'H350', year: 2021, color: 'Silver', fuel_type: 'diesel', capacity: 12, status: 'available', odometer_km: 45000, registration_expiry: '2025-11-30', insurance_expiry: '2025-08-31', purchase_price: 1800000 },
      { name: 'Toyota Hiace', plate_number: 'GHI-9012', type: 'van', brand: 'Toyota', model: 'Hiace', year: 2023, color: 'White', fuel_type: 'diesel', capacity: 15, status: 'maintenance', odometer_km: 12000, registration_expiry: '2026-03-31', insurance_expiry: '2026-01-31', purchase_price: 2200000 },
      { name: 'Mitsubishi L300', plate_number: 'JKL-3456', type: 'van', brand: 'Mitsubishi', model: 'L300', year: 2020, color: 'Blue', fuel_type: 'diesel', capacity: 1000, capacity_unit: 'kg', status: 'available', odometer_km: 78000, registration_expiry: '2025-09-30', insurance_expiry: '2025-07-31', purchase_price: 900000 },
      { name: 'Suzuki APV', plate_number: 'MNO-7890', type: 'van', brand: 'Suzuki', model: 'APV', year: 2019, color: 'Gray', fuel_type: 'gasoline', capacity: 8, status: 'reserved', odometer_km: 95000, registration_expiry: '2025-08-31', insurance_expiry: '2024-12-31', purchase_price: 750000 },
      { name: 'Honda CB150', plate_number: 'PQR-1122', type: 'motorcycle', brand: 'Honda', model: 'CB150', year: 2022, color: 'Red', fuel_type: 'gasoline', capacity: 1, status: 'available', odometer_km: 8000, registration_expiry: '2025-12-31', insurance_expiry: '2025-10-31', purchase_price: 120000 }
    ]);
    console.log('✅ Vehicles seeded');

    // Drivers
    const drivers = await Driver.bulkCreate([
      { user_id: users[2].id, employee_id: 'DRV-001', license_number: 'N01-12-345678', license_type: 'Restriction 1,2,3', license_expiry: '2026-05-15', status: 'available', phone: '+639191234567', date_hired: '2020-03-01', total_trips: 245, total_km: 18750, rating: 4.8, rating_count: 120 },
      { user_id: users[3].id, employee_id: 'DRV-002', license_number: 'N02-34-567890', license_type: 'Restriction 1,2', license_expiry: '2025-09-20', status: 'available', phone: '+639201234567', date_hired: '2021-07-15', total_trips: 180, total_km: 12400, rating: 4.5, rating_count: 89 }
    ]);
    console.log('✅ Drivers seeded');

    // Maintenance
    await VehicleMaintenance.bulkCreate([
      { vehicle_id: vehicles[2].id, maintenance_type: 'preventive', description: '10,000 km PMS - Oil change, filter replacement', provider: 'Toyota Service Center', cost: 8500, odometer_at_service: 12000, start_date: '2024-01-15', end_date: '2024-01-15', next_service_date: '2024-07-15', status: 'completed', performed_by: users[1].id },
      { vehicle_id: vehicles[0].id, maintenance_type: 'corrective', description: 'Brake pad replacement', provider: 'Autohaus Service', cost: 12000, odometer_at_service: 24500, start_date: '2024-02-10', end_date: '2024-02-11', status: 'completed', performed_by: users[1].id }
    ]);

    // Reservations
    const now = new Date();
    await Reservation.bulkCreate([
      { requester_id: users[4].id, vehicle_id: vehicles[0].id, driver_id: drivers[0].id, purpose: 'guest_transport', description: 'Airport pickup for VIP guests', pickup_location: 'NAIA Terminal 3', dropoff_location: 'Grand Hotel Lobby', scheduled_start: new Date(now.getTime() + 2 * 3600000), scheduled_end: new Date(now.getTime() + 4 * 3600000), passenger_count: 4, priority: 'high', status: 'approved', approved_by: users[1].id, approved_at: new Date(), reservation_code: 'RES-000001' },
      { requester_id: users[5].id, purpose: 'catering_delivery', description: 'Deliver catering supplies to event venue', pickup_location: 'Hotel Kitchen', dropoff_location: 'SMX Convention Center', scheduled_start: new Date(now.getTime() + 5 * 3600000), scheduled_end: new Date(now.getTime() + 7 * 3600000), passenger_count: 2, status: 'pending', reservation_code: 'RES-000002' },
      { requester_id: users[4].id, vehicle_id: vehicles[1].id, driver_id: drivers[1].id, purpose: 'staff_shuttle', description: 'Morning staff shuttle', pickup_location: 'Cubao Terminal', dropoff_location: 'Hotel Main Entrance', scheduled_start: new Date(now.getTime() - 5 * 3600000), scheduled_end: new Date(now.getTime() - 3 * 3600000), passenger_count: 10, status: 'completed', approved_by: users[1].id, approved_at: new Date(), reservation_code: 'RES-000003' }
    ]);
    console.log('✅ Reservations seeded');

    // Expenses & Fuel
    const months = [1, 2, 3, 4, 5, 6];
    const expenseData = [];
    const fuelData = [];
    for (const m of months) {
      expenseData.push(
        { vehicle_id: vehicles[0].id, expense_type: 'maintenance', amount: 8500 + Math.random() * 5000, expense_date: `2024-0${m}-15`, description: 'Scheduled maintenance', recorded_by: users[1].id },
        { vehicle_id: vehicles[1].id, expense_type: 'toll', amount: 500 + Math.random() * 300, expense_date: `2024-0${m}-20`, description: 'Expressway toll', recorded_by: users[1].id }
      );
      fuelData.push(
        { vehicle_id: vehicles[0].id, driver_id: drivers[0].id, fuel_date: `2024-0${m}-05T08:00:00`, liters: 40 + Math.random() * 20, price_per_liter: 62.5, total_cost: 0, odometer_reading: 20000 + m * 2000, station_name: 'Shell EDSA', recorded_by: users[2].id },
        { vehicle_id: vehicles[1].id, driver_id: drivers[1].id, fuel_date: `2024-0${m}-10T09:00:00`, liters: 50 + Math.random() * 25, price_per_liter: 61.0, total_cost: 0, odometer_reading: 40000 + m * 2000, station_name: 'Petron Taft', recorded_by: users[3].id }
      );
    }
    fuelData.forEach(f => { f.total_cost = (f.liters * f.price_per_liter).toFixed(2); });
    await TransportExpense.bulkCreate(expenseData);
    await FuelLog.bulkCreate(fuelData);
    console.log('✅ Expenses and fuel logs seeded');

    console.log('\n🎉 Seeding complete!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:            admin@hotel.com / Admin@123');
    console.log('  Transport Mgr:    transport@hotel.com / Manager@123');
    console.log('  Driver 1:         juan@hotel.com / Driver@123');
    console.log('  Staff:            maria@hotel.com / Staff@123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
