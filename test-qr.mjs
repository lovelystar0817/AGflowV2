// Test QR code generation to identify the issue
import { db } from './server/db.ts';
import { stylists } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testQRGeneration() {
  try {
    console.log('Testing QR code generation...');
    
    // Test 1: Dynamic import of qrcode
    console.log('1. Testing QRCode import...');
    const QRCode = await import("qrcode");
    console.log('✅ QRCode imported successfully');
    
    // Test 2: Generate QR code
    console.log('2. Testing QR generation...');
    const appUrl = 'http://localhost:5174/app/hair-by-lyric';
    const qrDataUrl = await QRCode.toDataURL(appUrl);
    console.log('✅ QR code generated, length:', qrDataUrl.length);
    
    // Test 3: Database connection
    console.log('3. Testing database connection...');
    const testUserId = "4dda224d-d95b-4dca-a406-c88b5cc87162";
    const [stylist] = await db
      .select({ id: stylists.id, appSlug: stylists.appSlug })
      .from(stylists)
      .where(eq(stylists.id, testUserId));
    console.log('✅ Database query successful:', stylist);
    
    // Test 4: Database update
    console.log('4. Testing database update...');
    await db.update(stylists)
      .set({ appQrCodeUrl: qrDataUrl })
      .where(eq(stylists.id, testUserId));
    console.log('✅ Database update successful');
    
    console.log('🎉 All tests passed! QR generation should work.');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testQRGeneration();