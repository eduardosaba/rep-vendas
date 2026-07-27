import { seedDistributors } from './distributors';

async function runAll() {
  try {
    await seedDistributors();
    console.log('All seed operations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

runAll();
