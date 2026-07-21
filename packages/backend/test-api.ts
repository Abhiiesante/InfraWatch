import 'dotenv/config';
import { z } from 'zod';

const test = async () => {
  // 1. Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.local', password: 'Demo@Password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.tokens?.accessToken;
  console.log('Login status:', loginRes.status, !!token);

  if (!token) {
    console.error(loginData);
    return;
  }

  const typeId = 1;
  console.log('Got Asset Type ID:', typeId);

  // 3. Create asset
  const assetRes = await fetch('http://localhost:3000/api/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Asset from Script',
      assetTypeId: typeId,
      description: 'Testing the API route'
    })
  });
  const assetData = await assetRes.json();
  console.log('Create Asset status:', assetRes.status);
  console.log('Create Asset Response:', assetData);
};

test().catch(console.error);
