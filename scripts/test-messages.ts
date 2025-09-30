import { db } from "../server/db";
import { messages, stylists, clients } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testMessagesAPI() {
  console.log("Testing messages API functionality...");

  // Get test users
  const testStylist = await db.select().from(stylists).where(eq(stylists.email, "test-stylist@example.com")).limit(1);
  const testClient = await db.select().from(clients).where(eq(clients.email, "test-client@example.com")).limit(1);

  if (testStylist.length === 0 || testClient.length === 0) {
    console.log("Test users not found. Running seed script first...");
    // Import and run seed script
    await import("./seed-messages");
  }

  // Re-fetch after seeding
  const stylist = await db.select().from(stylists).where(eq(stylists.email, "test-stylist@example.com")).limit(1);
  const client = await db.select().from(clients).where(eq(clients.email, "test-client@example.com")).limit(1);

  if (stylist.length === 0 || client.length === 0) {
    console.error("Failed to find or create test users");
    return;
  }

  const stylist1 = stylist[0];
  const client1 = client[0];
  const conversationId = [stylist1.id, client1.id].sort().join('-');

  console.log(`Testing with conversation: ${conversationId}`);
  console.log(`Stylist: ${stylist1.firstName} (${stylist1.id})`);
  console.log(`Client: ${client1.firstName} (${client1.id})`);

  // Test getting messages
  console.log("\n--- Testing GET messages ---");
  const messagesResult = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  console.log(`Found ${messagesResult.length} messages:`);
  messagesResult.forEach((msg, i) => {
    console.log(`${i + 1}. ${msg.senderType === 'stylist' ? stylist1.firstName : client1.firstName}: ${msg.content.substring(0, 50)}...`);
  });

  // Test creating a new message
  console.log("\n--- Testing POST message ---");
  const newMessage = {
    conversationId,
    senderId: stylist1.id,
    senderType: 'stylist' as const,
    receiverId: client1.id,
    receiverType: 'client' as const,
    content: "This is a test message from the API test script",
    isRead: false,
    createdAt: new Date()
  };

  const insertedMessage = await db.insert(messages).values(newMessage).returning();
  console.log("Created new message:", insertedMessage[0]);

  // Verify the message was created
  const updatedMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  console.log(`\nTotal messages after creation: ${updatedMessages.length}`);
  console.log("Latest message:", updatedMessages[updatedMessages.length - 1].content);

  console.log("\n✅ Messages API test completed successfully!");
}

testMessagesAPI()
  .then(() => {
    console.log("Test script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });