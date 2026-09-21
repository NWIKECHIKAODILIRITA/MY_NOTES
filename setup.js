const { execSync } = require('child_process');
const { initDB, pool } = require('./database');

async function setup() {
  console.log('========================================');
  console.log('   Notely - Premium Notes Setup');
  console.log('========================================\n');

  console.log('Step 1: Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.error('\nFailed to install dependencies. Please run `npm install` manually.');
    process.exit(1);
  }

  console.log('\nStep 2: Connecting to PostgreSQL database...');
  try {
    await initDB();
    await pool.query('SELECT NOW()');
    console.log('Database connection established!');
  } catch (error) {
    console.error('\nFailed to connect to database.');
    console.error('Please make sure:');
    console.error('  1. PostgreSQL is installed and running');
    console.error('  2. You have created a database named "notes_db"');
    console.error('  3. Update the .env file with your correct credentials\n');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('   Setup complete!');
  console.log('========================================');
  console.log('\nTo start the server, run:');
  console.log('  npm start');
  console.log('\nThen open http://localhost:3000 in your browser\n');

  process.exit(0);
}

setup();