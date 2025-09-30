import http from 'http';

// Test the QR endpoint
const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stylists/4dda224d-d95b-4dca-a406-c88b5cc87162/app-qr',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing QR endpoint...');
const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ QR generation succeeded!');
      const response = JSON.parse(data);
      if (response.qrCodeUrl && response.qrCodeUrl.startsWith('data:image')) {
        console.log('✅ QR code data URL generated successfully');
        console.log('QR Code URL length:', response.qrCodeUrl.length);
      } else {
        console.log('⚠️ Unexpected response format:', response);
      }
    } else {
      console.log('❌ QR generation failed');
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();