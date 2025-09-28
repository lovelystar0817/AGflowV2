// Simple test to identify the QR code generation issue
const testQRGeneration = async () => {
  try {
    console.log('🔍 Testing QR code generation endpoint...');
    
    // Step 1: Test dynamic import
    console.log('1. Testing QRCode import...');
    const QRCode = await import("qrcode");
    console.log('✅ QRCode imported successfully');
    
    // Step 2: Test URL generation
    const appUrl = `${process.env.PUBLIC_URL || 'http://localhost:5174'}/app/hair-by-lyric`;
    console.log('2. Generated app URL:', appUrl);
    
    // Step 3: Test QR generation
    console.log('3. Testing QR generation...');
    const qrDataUrl = await QRCode.toDataURL(appUrl);
    console.log('✅ QR code generated, length:', qrDataUrl.length);
    console.log('QR data URL preview:', qrDataUrl.substring(0, 100) + '...');
    
    console.log('🎉 QR generation test completed successfully');
    
  } catch (error) {
    console.error('❌ QR generation test failed:', error);
    console.error('Error stack:', error.stack);
  }
};

testQRGeneration();