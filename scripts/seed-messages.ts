import { db } from "../server/db";
import { messages, stylists, clients } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedMessages() {
  console.log("Seeding test messages...");

  // Create test stylist and client if they don't exist
  const testStylistEmail = "test-stylist@example.com";
  const testClientEmail = "test-client@example.com";

  let stylist = await db.select().from(stylists).where(eq(stylists.email, testStylistEmail)).limit(1);
  let client = await db.select().from(clients).where(eq(clients.email, testClientEmail)).limit(1);

  if (stylist.length === 0) {
    console.log("Creating test stylist...");
    const [newStylist] = await db.insert(stylists).values({
      email: testStylistEmail,
      firstName: "Test",
      lastName: "Stylist",
      passwordHash: "hashedpassword", // In real app, this would be properly hashed
      businessName: "Test Salon",
      businessType: "Hairstylist",
      city: "Test City",
      state: "TS",
    }).returning();
    stylist = [newStylist];
  }

  if (client.length === 0) {
    console.log("Creating test client...");
    const [newClient] = await db.insert(clients).values({
      stylistId: stylist[0].id,
      firstName: "Test",
      lastName: "Client",
      email: testClientEmail,
      phone: "555-0123",
    }).returning();
    client = [newClient];
  }

  const stylist1 = stylist[0];
  const client1 = client[0];

  // Create conversation ID
  const conversation1 = [stylist1.id, client1.id].sort().join('-');

  // Clear existing messages for this conversation
  await db.delete(messages).where(eq(messages.conversationId, conversation1));

    // Seed conversation 1
  const messages1 = [
    {
      conversationId: conversation1,
      senderId: stylist1.id,
      senderType: 'stylist' as const,
      receiverId: client1.id,
      receiverType: 'client' as const,
      content: "Hi! Thank you for booking with me. I'm looking forward to your appointment tomorrow.",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      conversationId: conversation1,
      senderId: client1.id,
      senderType: 'client' as const,
      receiverId: stylist1.id,
      receiverType: 'stylist' as const,
      content: "Thank you! I'm excited too. What should I expect for my first visit?",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes later
    },
    {
      conversationId: conversation1,
      senderId: stylist1.id,
      senderType: 'stylist' as const,
      receiverId: client1.id,
      receiverType: 'client' as const,
      content: "Great question! We'll start with a consultation to discuss your hair goals, then I'll give you a thorough wash and style. Do you have any specific concerns or preferences?",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
    },
    {
      conversationId: conversation1,
      senderId: client1.id,
      senderType: 'client' as const,
      receiverId: stylist1.id,
      receiverType: 'stylist' as const,
      content: "I want something fresh and modern. Maybe some layers to add volume?",
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  // Insert all messages
  await db.insert(messages).values(messages1);

  console.log(`Seeded ${messages1.length} test messages in 1 conversation`);
  console.log(`- Conversation: ${stylist1.firstName} ↔ ${client1.firstName} (${conversation1})`);
}

seedMessages()
  .then(() => {
    console.log("Seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });