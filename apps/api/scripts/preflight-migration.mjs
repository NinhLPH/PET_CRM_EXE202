import 'dotenv/config';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const checks = {
    duplicateActiveBookingSlots: `SELECT count(*)::int AS count FROM (SELECT pet_id, booking_date FROM bookings WHERE status IN ('PENDING','CONFIRMED') GROUP BY pet_id, booking_date HAVING count(*) > 1) x`,
    duplicateActiveReminderConfigs: `SELECT count(*)::int AS count FROM (SELECT service_id FROM reminder_configs WHERE status = 'ACTIVE' GROUP BY service_id HAVING count(*) > 1) x`,
    invalidReminderDays: `SELECT count(*)::int AS count FROM reminder_configs WHERE reminder_days NOT BETWEEN 8 AND 364`,
    duplicateCrmPhones: `SELECT count(*)::int AS count FROM (SELECT phone FROM customers GROUP BY phone HAVING count(*) > 1) x`,
    overlappingActivePrices: `SELECT count(*)::int AS count FROM service_prices a JOIN service_prices b ON a.service_price_id < b.service_price_id AND a.service_id = b.service_id AND a.species = b.species AND a.status = 'ACTIVE' AND b.status = 'ACTIVE' AND a.min_weight < coalesce(b.max_weight, 1000) AND b.min_weight < coalesce(a.max_weight, 1000)`,
    multiServiceBookings: `SELECT count(*)::int AS count FROM (SELECT booking_id FROM booking_services GROUP BY booking_id HAVING count(*) > 1) x`,
    duplicateActiveServiceNames: `SELECT count(*)::int AS count FROM (SELECT lower(service_name) FROM services WHERE status = 'ACTIVE' GROUP BY lower(service_name) HAVING count(*) > 1) x`,
    invalidPetWeight: `SELECT count(*)::int AS count FROM pets WHERE weight <= 0 OR weight > 999.99`,
    invalidPriceRules: `SELECT count(*)::int AS count FROM service_prices WHERE min_weight < 0 OR (max_weight IS NOT NULL AND max_weight <= min_weight) OR price <= 0 OR price <> trunc(price)`,
    invalidBookingMoney: `SELECT count(*)::int AS count FROM bookings WHERE discount_amount < 0 OR discount_amount <> trunc(discount_amount)`,
    invalidSurchargeMoney: `SELECT count(*)::int AS count FROM booking_surcharges WHERE amount <= 0 OR amount <> trunc(amount)`,
  };
  for (const [name, sql] of Object.entries(checks)) {
    const result = await client.query(sql);
    console.log(`${name}: ${result.rows[0].count}`);
  }
} finally {
  await client.end();
}
