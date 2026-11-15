import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE AUTH VALIDATION ---');
  let passed = 0;
  let total = 0;

  // Test 1: Student Register with 4GE prefix
  total++;
  const r1 = await post('/api/auth/register', {
    role: 'student',
    fullName: 'Test Student',
    usn: '4GE22CS010',
    email: 'test4ge@gechassan.ac.in',
    department: 'Computer Science & Engineering',
    semester: '5th Sem',
    password: 'Password@123',
    confirmPassword: 'Password@123'
  });
  if (r1.status === 400 && r1.body.message.includes('Student USN must start with authorized college code 4HG')) {
    console.log('✔ Test 1 Passed: 4GE USN registration rejected with mandatory 4HG error message');
    passed++;
  } else {
    console.error('✘ Test 1 Failed:', r1);
  }

  // Test 2: Student Register with invalid format USN (4HG999)
  total++;
  const r2 = await post('/api/auth/register', {
    role: 'student',
    fullName: 'Test Format',
    usn: '4HG999',
    email: 'format@gechassan.ac.in',
    department: 'Computer Science & Engineering',
    semester: '5th Sem',
    password: 'Password@123',
    confirmPassword: 'Password@123'
  });
  if (r2.status === 400 && r2.body.message.includes('Invalid Student USN format')) {
    console.log('✔ Test 2 Passed: Malformed 4HG USN registration rejected');
    passed++;
  } else {
    console.error('✘ Test 2 Failed:', r2);
  }

  // Test 3: Student Register with valid 4HG USN
  total++;
  const r3 = await post('/api/auth/register', {
    role: 'student',
    fullName: 'Anush M N',
    usn: '4HG22CS088',
    email: 'anushmn@gmail.com',
    department: 'Computer Science & Engineering',
    semester: '5th Sem',
    password: 'Password@360',
    confirmPassword: 'Password@360'
  });
  if (r3.status === 201 && r3.body.success) {
    console.log('✔ Test 3 Passed: Valid 4HG USN registration succeeded');
    passed++;
  } else {
    console.error('✘ Test 3 Failed:', r3);
  }

  // Test 4: Student Login by Full Name ('Nithin A')
  total++;
  const r4 = await post('/api/auth/login', {
    role: 'student',
    identifier: 'Nithin A',
    password: 'Campus@360'
  });
  if (r4.status === 200 && r4.body.success && r4.body.user.name === 'Nithin A' && r4.body.user.usn === '4HG22CS045') {
    console.log('✔ Test 4 Passed: Student login by registered Name succeeded and returned USN 4HG22CS045');
    passed++;
  } else {
    console.error('✘ Test 4 Failed:', r4);
  }

  // Test 5: Student Login by registered USN ('4HG22CS045')
  total++;
  const r5 = await post('/api/auth/login', {
    role: 'student',
    identifier: '4HG22CS045',
    password: 'Campus@360'
  });
  if (r5.status === 200 && r5.body.success && r5.body.user.name === 'Nithin A') {
    console.log('✔ Test 5 Passed: Student login by 4HG USN succeeded');
    passed++;
  } else {
    console.error('✘ Test 5 Failed:', r5);
  }

  // Test 6: Student Login by Newly Registered Name ('Anush M N')
  total++;
  const r6 = await post('/api/auth/login', {
    role: 'student',
    identifier: 'Anush M N',
    password: 'Password@360'
  });
  if (r6.status === 200 && r6.body.success && r6.body.user.usn === '4HG22CS088') {
    console.log('✔ Test 6 Passed: Newly registered student logged in by Name successfully');
    passed++;
  } else {
    console.error('✘ Test 6 Failed:', r6);
  }

  // Test 7: Student Login with 4GE USN
  total++;
  const r7 = await post('/api/auth/login', {
    role: 'student',
    identifier: '4GE22CS010',
    password: 'Campus@360'
  });
  if (r7.status === 400 && r7.body.message.includes('Student USN must start with authorized college code 4HG')) {
    console.log('✔ Test 7 Passed: Student login with 4GE USN rejected with mandatory 4HG error');
    passed++;
  } else {
    console.error('✘ Test 7 Failed:', r7);
  }

  // Test 8: Student Login with Unregistered Name
  total++;
  const r8 = await post('/api/auth/login', {
    role: 'student',
    identifier: 'Unknown Student',
    password: 'Campus@360'
  });
  if (r8.status === 401 && r8.body.message.includes('No registered student account found matching identifier')) {
    console.log('✔ Test 8 Passed: Unregistered student name rejected with clear account-not-found error');
    passed++;
  } else {
    console.error('✘ Test 8 Failed:', r8);
  }

  // Test 9: Student Login with Wrong Password
  total++;
  const r9 = await post('/api/auth/login', {
    role: 'student',
    identifier: 'Nithin A',
    password: 'WrongPassword'
  });
  if (r9.status === 401 && r9.body.message.includes('Invalid password')) {
    console.log('✔ Test 9 Passed: Wrong password rejected with appropriate error');
    passed++;
  } else {
    console.error('✘ Test 9 Failed:', r9);
  }

  // Test 10: Faculty Login
  total++;
  const r10 = await post('/api/auth/login', {
    role: 'faculty',
    identifier: 'GEC-FAC-101',
    password: 'Faculty@360'
  });
  if (r10.status === 200 && r10.body.success && r10.body.user.role === 'faculty') {
    console.log('✔ Test 10 Passed: Faculty login succeeded');
    passed++;
  } else {
    console.error('✘ Test 10 Failed:', r10);
  }

  // Test 11: Admin Login
  total++;
  const r11 = await post('/api/auth/login', {
    role: 'admin',
    identifier: 'admin@gechassan.ac.in',
    password: 'Admin@Campus360'
  });
  if (r11.status === 200 && r11.body.success && r11.body.user.role === 'admin') {
    console.log('✔ Test 11 Passed: Admin login succeeded');
    passed++;
  } else {
    console.error('✘ Test 11 Failed:', r11);
  }

  console.log(`\nRESULTS: ${passed}/${total} TESTS PASSED.`);
}

runTests();

