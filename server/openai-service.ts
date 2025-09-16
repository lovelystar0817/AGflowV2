import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIActionResponse {
  action: string;
  weeksInactive?: number;
  amount?: number;
  deliveryMethod?: string;
  error?: string;
}

export async function parseAICommand(command: string, stylistInfo: any): Promise<AIActionResponse> {
  try {
    const systemPrompt = `You are an AI salon assistant for a hair stylist, barber, or nail stylist.
Your job is to turn stylist commands into API actions.
You must respond with a JSON object describing what to do.

Available actions:
- "send_coupon": Send a coupon to clients
- "unknown": For commands you can't understand

For send_coupon actions, include:
- weeksInactive: number (how many weeks since last visit, default 4)
- amount: number (dollar amount for coupon)
- deliveryMethod: "email" (always email for now)

Examples:
Input: "Send $25 coupon to inactive clients"
Output: {"action": "send_coupon", "weeksInactive": 4, "amount": 25, "deliveryMethod": "email"}

Input: "Send $20 off to clients who haven't been here in 6 weeks"
Output: {"action": "send_coupon", "weeksInactive": 6, "amount": 20, "deliveryMethod": "email"}

Input: "What's the weather like?"
Output: {"action": "unknown", "error": "I can only help with salon business tasks like sending coupons to clients"}

Business Context:
- Business Name: ${stylistInfo.businessName || "Your Salon"}
- Business Type: ${stylistInfo.businessType || "Salon"}
- Default appointment duration: ${stylistInfo.defaultAppointmentDuration || 30} minutes

Respond only with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsedResponse: AIActionResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error) {
    console.error("Error parsing AI command:", error);
    return {
      action: "unknown",
      error: error instanceof Error ? error.message : "Failed to parse command"
    };
  }
}