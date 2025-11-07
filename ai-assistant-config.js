/**
 * AI Assistant Configuration for Telnyx Voice Agent
 *
 * This configuration defines the behavior and prompts for your voice AI assistant.
 * You'll create this assistant in the Telnyx Mission Control Portal.
 */

const AI_ASSISTANT_CONFIG = {
  // Basic assistant information
  name: "Information Collection Assistant",

  // System prompt - defines the assistant's behavior and personality
  systemPrompt: `You are a friendly and professional voice assistant. Your goal is to collect basic information from callers in a natural, conversational way.

Follow these steps in order:
1. Greet the caller warmly
2. Ask for their full name
3. Ask for their email address (if they're comfortable sharing)
4. Ask what they're calling about or how you can help them
5. Ask if there's anything else they'd like to add
6. Thank them and let them know someone will follow up
7. End the call politely

Guidelines:
- Be conversational and natural, not robotic
- If the caller provides information out of order, that's fine - adapt to the conversation
- Confirm important details by repeating them back
- Be patient if the caller needs to repeat information
- Keep responses brief and to the point
- If the caller asks questions you can't answer, let them know someone will follow up with them

Remember to stay in character as a helpful assistant collecting information.`,

  // Voice settings - these will be configured in Telnyx
  voice: {
    provider: "deepgram", // Use Deepgram for low latency
    model: "nova-2", // or "flux" when available
    language: "en-US",
    voice_id: "en-US-Neural2-A" // Natural sounding voice
  },

  // Transcription settings
  transcription: {
    provider: "deepgram",
    model: "nova-2", // High accuracy transcription
    language: "en-US",
    interim_results: true // Get partial results for faster responses
  },

  // LLM settings for conversation
  llm: {
    provider: "openai", // or another provider from Telnyx
    model: "gpt-4-turbo", // Fast and capable
    temperature: 0.7, // Balanced creativity
    max_tokens: 150 // Keep responses concise
  },

  // Function calling - define data extraction
  functions: [
    {
      name: "save_caller_information",
      description: "Save the caller's information when all required details have been collected",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The caller's full name"
          },
          email: {
            type: "string",
            description: "The caller's email address (if provided)"
          },
          reason: {
            type: "string",
            description: "The reason for their call or how they need help"
          },
          notes: {
            type: "string",
            description: "Any additional information or notes from the conversation"
          }
        },
        required: ["name"]
      }
    }
  ],

  // Conversation settings
  conversation: {
    interruptible: true, // Allow caller to interrupt the AI
    end_of_turn_silence_ms: 800, // Wait 800ms of silence before responding
    max_duration_seconds: 300, // 5 minute max call duration
    background_sound: "office-ambiance" // Optional: add subtle background
  },

  // Webhook URLs for events
  webhooks: {
    events: [
      "conversation.started",
      "conversation.completed",
      "function.called",
      "transcription.received",
      "error.occurred"
    ],
    url: process.env.WEBHOOK_URL + "/webhook/ai-events"
  }
};

module.exports = AI_ASSISTANT_CONFIG;
