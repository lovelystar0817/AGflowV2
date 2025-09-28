import { db } from './server/db.ts';
import { eq } from 'drizzle-orm';
import { stylists } from './shared/schema.ts';

const result = await db.select({ 
  appSlug: stylists.appSlug, 
  id: stylists.id, 
  businessName: stylists.businessName 
})
  .from(stylists)
  .where(eq(stylists.id, '4dda224d-d95b-4dca-a406-c88b5cc87162'));

console.log('User data:', JSON.stringify(result, null, 2));
process.exit(0);