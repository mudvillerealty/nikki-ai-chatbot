import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Load .env.local file
config({ path: '.env.local' });

const runMigrate = async () => {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ POSTGRES_URL is not defined in .env.local');
    process.exit(1);
  }

  const connection = postgres(databaseUrl, {
    ssl: 'require',
    max: 1, // Only allow one connection during migration
  });

  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  try {
    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log(`✅ Migrations completed in ${end - start}ms`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed');
    console.error(error);
    process.exit(1);
  }
};

runMigrate();
