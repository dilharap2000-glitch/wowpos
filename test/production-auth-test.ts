import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

async function runProductionAuthTest() {
  console.log('=====================================================');
  console.log('STARTING REAL MONGODB PRODUCTION AUTH END-TO-END TEST');
  console.log('=====================================================\n');

  // 1. Spin up a genuine MongoDB server instance
  console.log('[STEP 0] Launching isolated MongoDB Server instance...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const dbName = 'gym_pos_db';

  console.log(`[STEP 0] MongoDB Server running at: ${uri}`);
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = dbName;
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'gym_saas_secure_jwt_secret_key_2026';

  // Import app and services AFTER setting environment variables
  const { app } = await import('../src/server/app.ts');
  const { getMongoDb } = await import('../src/db/mongodb.ts');

  // 2. Start test server
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[STEP 0] Test API listening at ${baseUrl}\n`);

  try {
    // ---------------------------------------------------------------
    // STEP A: Register brand-new test gym owner
    // ---------------------------------------------------------------
    console.log('[STEP A] Registering brand-new test gym owner via POST /api/auth/register...');
    const testRegistration = {
      gymName: 'Apex Performance Gym',
      ownerName: 'Marcus Vance',
      email: 'marcus.vance@apexperformance.com',
      phone: '+1 555-0199',
      password: 'SecureGymOwnerPass2026!',
      confirmPassword: 'SecureGymOwnerPass2026!',
    };

    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRegistration),
    });

    const registerBody = await registerRes.json();
    console.log(`[STEP A] Registration HTTP Status: ${registerRes.status}`);
    if (registerRes.status !== 201 || !registerBody.token) {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }
    console.log('[STEP A] Registration succeeded. Auto-login token received.');
    console.log('[STEP A] Registered User payload:', {
      id: registerBody.user?.id,
      uid: registerBody.user?.uid,
      username: registerBody.user?.username,
      email: registerBody.user?.email,
      role: registerBody.user?.role,
      businessId: registerBody.user?.businessId,
      gymName: registerBody.user?.gymName,
      status: registerBody.user?.status,
    });

    const registeredUsername = registerBody.user.username;
    const registeredEmail = registerBody.user.email;

    // ---------------------------------------------------------------
    // STEP B & C: Confirm record exists in MongoDB and inspect fields (WITHOUT EXPOSING HASH)
    // ---------------------------------------------------------------
    console.log('\n[STEP B & C] Inspecting MongoDB Atlas database directly...');
    const directClient = new MongoClient(uri);
    await directClient.connect();
    const db = directClient.db(dbName);

    const mongoOwner = await db.collection('users').findOne({ email: registeredEmail });
    if (!mongoOwner) {
      throw new Error(`CRITICAL: Registered user was NOT persisted in MongoDB collection "users"!`);
    }
    console.log('[STEP B] Owner record successfully found in MongoDB collection "users"!');

    // Inspect fields securely (DO NOT EXPOSE PASSWORD OR HASH)
    const sanitizedOwnerFields = {
      _id: mongoOwner._id?.toString(),
      id: mongoOwner.id,
      uid: mongoOwner.uid,
      businessId: mongoOwner.businessId,
      gymId: mongoOwner.gymId,
      username: mongoOwner.username,
      email: mongoOwner.email,
      name: mongoOwner.name,
      phone: mongoOwner.phone,
      role: mongoOwner.role,
      status: mongoOwner.status,
      hasPassword: Boolean(mongoOwner.password),
      passwordFormat: typeof mongoOwner.password === 'string' && mongoOwner.password.includes(':') ? 'salt:hash' : 'invalid',
      createdAt: mongoOwner.createdAt,
    };
    console.log('[STEP C] Persisted MongoDB Record Metadata (Password hidden):', sanitizedOwnerFields);

    const mongoGym = await db.collection('businesses').findOne({ businessId: mongoOwner.businessId });
    console.log('[STEP C] Persisted MongoDB Gym Record Metadata:', {
      businessId: mongoGym?.businessId,
      gymName: mongoGym?.gymName,
      email: mongoGym?.email,
      status: mongoGym?.status,
    });

    // ---------------------------------------------------------------
    // STEP D: Login immediately using email + password through POST /api/auth/login
    // ---------------------------------------------------------------
    console.log('\n[STEP D] Testing immediate login with EMAIL via POST /api/auth/login...');
    const loginEmailRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registeredEmail,
        password: testRegistration.password,
      }),
    });

    const loginEmailBody = await loginEmailRes.json();
    console.log(`[STEP D] Login with EMAIL HTTP Status: ${loginEmailRes.status}`);
    if (loginEmailRes.status !== 200 || !loginEmailBody.success || !loginEmailBody.token) {
      throw new Error(`Login with email failed: ${JSON.stringify(loginEmailBody)}`);
    }
    console.log('[STEP D] Login with EMAIL succeeded! Token received.');

    // ---------------------------------------------------------------
    // STEP E: Simulate client-side logout
    // ---------------------------------------------------------------
    console.log('\n[STEP E] Simulating client-side logout (clearing auth session)...');
    let clientSessionToken: string | null = null;
    console.log('[STEP E] Client session cleared. User is logged out.');

    // ---------------------------------------------------------------
    // STEP F: Login again with the same credentials (using USERNAME this time)
    // ---------------------------------------------------------------
    console.log('\n[STEP F] Testing login after logout with USERNAME via POST /api/auth/login...');
    const loginUserRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: registeredUsername,
        password: testRegistration.password,
      }),
    });

    const loginUserBody = await loginUserRes.json();
    console.log(`[STEP F] Login with USERNAME HTTP Status: ${loginUserRes.status}`);
    if (loginUserRes.status !== 200 || !loginUserBody.success || !loginUserBody.token) {
      throw new Error(`Login with username failed: ${JSON.stringify(loginUserBody)}`);
    }
    clientSessionToken = loginUserBody.token;
    console.log('[STEP F] Login with USERNAME succeeded! New token received.');

    // ---------------------------------------------------------------
    // STEP G: Refresh and verify authenticated session via GET /api/auth/me
    // ---------------------------------------------------------------
    console.log('\n[STEP G] Verifying session via GET /api/auth/me with Bearer token...');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${clientSessionToken}`,
      },
    });

    const meBody = await meRes.json();
    console.log(`[STEP G] /api/auth/me HTTP Status: ${meRes.status}`);
    if (meRes.status !== 200 || !meBody.user) {
      throw new Error(`/api/auth/me verification failed: ${JSON.stringify(meBody)}`);
    }
    console.log('[STEP G] Verified authenticated session for user:', {
      id: meBody.user.id,
      uid: meBody.user.uid,
      role: meBody.user.role,
      businessId: meBody.user.businessId,
    });

    // ---------------------------------------------------------------
    // STEP H: Repeat with seeded existing gym owner account (titan / admin)
    // ---------------------------------------------------------------
    console.log('\n[STEP H] Testing login for existing seeded account (titan)...');
    const existingLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'titan',
        password: 'admin123',
      }),
    });

    const existingLoginBody = await existingLoginRes.json();
    console.log(`[STEP H] Existing user login HTTP Status: ${existingLoginRes.status}`);
    if (existingLoginRes.status !== 200 || !existingLoginBody.success) {
      throw new Error(`Existing user login failed: ${JSON.stringify(existingLoginBody)}`);
    }
    console.log('[STEP H] Existing user login succeeded for:', existingLoginBody.user.username);

    // ---------------------------------------------------------------
    // NEGATIVE TEST: Confirm invalid password returns 401 with proper rejection
    // ---------------------------------------------------------------
    console.log('\n[NEGATIVE TEST] Testing login with wrong password...');
    const badPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registeredEmail,
        password: 'IncorrectPassword999!',
      }),
    });
    const badPassBody = await badPassRes.json();
    console.log(`[NEGATIVE TEST] Wrong password HTTP Status: ${badPassRes.status}`, badPassBody);
    if (badPassRes.status !== 401) {
      throw new Error(`Expected 401 for wrong password, got ${badPassRes.status}`);
    }

    await directClient.close();
    console.log('\n=====================================================');
    console.log('ALL PRODUCTION AUTH E2E TESTS PASSED SUCCESSFULLY!');
    console.log('=====================================================');
    process.exit(0);
  } finally {
    server.close();
    await mongod.stop();
  }
}

runProductionAuthTest().catch((err) => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
