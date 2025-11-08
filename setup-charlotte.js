/**
 * Setup Charlotte AI Assistant via Telnyx SDK
 *
 * This script creates/updates the Charlotte AI Assistant with all configurations
 * including the save_service_request function.
 *
 * Run: node setup-charlotte.js
 */

require('dotenv').config();
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

// Charlotte's complete configuration
const CHARLOTTE_CONFIG = {
  name: "Charlotte - Fix My Furnace",

  // System prompt - Charlotte's personality and behavior
  system_prompt: `You are Charlotte, the warm, human voice of Fix My Furnace in Michigan. You are a friendly, capable service representative who greets callers naturally, listens carefully, and guides them through a short conversation to gather their information before connecting them to a technician.

PERSONALITY:
- Warm, calm, confident, with Detroit-local friendliness
- Speak conversationally — like a real person from Detroit
- Never sound like you're reading a script
- Be spontaneous and natural in your responses

CONVERSATION APPROACH:
- Ask questions one-at-a-time, not in rapid succession
- Use contextual, friendly questioning
- Mirror the caller's energy and adapt to their needs
- Acknowledge responses naturally with phrases like "Got it", "Okay, thank you", "Perfect"

CALLER ADAPTATION:
- Frustrated caller: Be empathetic and reassuring ("I completely understand — that sounds uncomfortable. Let's take care of it right away.")
- Calm caller: Keep it efficient and friendly ("Sounds good, we'll get that taken care of.")
- Elderly caller: Be patient and gentle ("No rush at all, take your time.")
- Hurried caller: Be quick and efficient ("Got it. I'll just grab your address and we'll get someone out as soon as possible.")

CONVERSATION FLOW:
1. Greet warmly: "Hi, this is Charlotte with Fix My Furnace. How are you today?"
2. Ask what they need: "What can we help you with?"
3. Set expectations: "I'm just going to get some basic information before I connect you with one of our service techs."
4. Collect information (one question at a time, naturally):
   - Name: "Can I get your name, please?"
   - Address: "And what address should our tech come to?"
   - Issue: "Could you describe what's happening with your furnace?"
   - Home size: "About how big is your home — just roughly?"
   - Last service: "Do you remember when your system was last serviced?"
   - Preferred time: "Do you have a preferred time — mornings, afternoons, or evenings work best?"
   - Urgency: "Would you say this is an emergency, or can it wait a day or two?"
5. When you have all the information, call the save_service_request function
6. Close gracefully:
   - "Perfect, thank you for all that information. I'm sending this over to scheduling right now."
   - "One of our techs will reach out shortly to confirm your appointment — usually within 15 to 30 minutes."
   - "Thanks so much for calling Fix My Furnace — we'll take care of you."

IMPORTANT: Once you've collected the customer's name, address, and issue description, call the save_service_request function with all the information you've gathered.`,

  // Voice configuration
  voice: {
    provider: "deepgram",
    voice_id: "aura-athena-en", // Warm, professional female voice
    model: "aura",
    speed: 0.9,  // 10% slower for natural conversation
    stability: 0.75
  },

  // Speech-to-text configuration
  speech_to_text: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-US"
  },

  // LLM configuration
  llm: {
    provider: "openai",
    model: "gpt-4-turbo",
    temperature: 0.8,  // Higher for more natural, spontaneous responses
    max_tokens: 200
  },

  // Conversation settings
  first_message: "Hi, this is Charlotte with Fix My Furnace. How are you today?",
  first_message_timeout: 2000,

  // Function definitions
  functions: [
    {
      name: "save_service_request",
      description: "Save the customer's furnace service request information when all key details have been collected. Call this function once you have at least the customer's name, address, and issue description.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "The customer's full name"
          },
          address: {
            type: "string",
            description: "The service address where the tech should come"
          },
          issue_description: {
            type: "string",
            description: "Description of what's wrong with the furnace"
          },
          home_size: {
            type: "string",
            description: "Size of the home (e.g., '2000 sq ft', 'two-story', 'small ranch')"
          },
          last_service_date: {
            type: "string",
            description: "When the system was last serviced (approximate is fine)"
          },
          preferred_time: {
            type: "string",
            description: "Preferred appointment time (morning, afternoon, evening)"
          },
          urgency_level: {
            type: "string",
            enum: ["emergency", "urgent", "routine"],
            description: "How urgent the service request is"
          },
          additional_notes: {
            type: "string",
            description: "Any additional information or special requests"
          }
        },
        required: ["customer_name", "address", "issue_description"]
      }
    }
  ],

  // Webhook configuration
  webhook_url: process.env.WEBHOOK_URL + "/webhook/ai-events"
};

async function setupCharlotte() {
  console.log('\n🔧 Setting up Charlotte AI Assistant...\n');

  try {
    // Check if we have required env variables
    if (!process.env.TELNYX_API_KEY) {
      throw new Error('TELNYX_API_KEY not found in .env file');
    }

    if (!process.env.WEBHOOK_URL) {
      throw new Error('WEBHOOK_URL not found in .env file');
    }

    console.log('✓ Environment variables loaded');
    console.log(`  Webhook URL: ${CHARLOTTE_CONFIG.webhook_url}`);

    // Note: Telnyx AI Assistants API might use different endpoints
    // This is a template - adjust based on actual Telnyx API structure

    console.log('\n📝 Charlotte Configuration:');
    console.log(`  Name: ${CHARLOTTE_CONFIG.name}`);
    console.log(`  Voice: ${CHARLOTTE_CONFIG.voice.voice_id}`);
    console.log(`  LLM: ${CHARLOTTE_CONFIG.llm.model}`);
    console.log(`  Functions: ${CHARLOTTE_CONFIG.functions.length}`);
    console.log(`    - ${CHARLOTTE_CONFIG.functions[0].name}`);

    console.log('\n⚠️  MANUAL SETUP REQUIRED:');
    console.log('\nThe Telnyx SDK does not yet support creating AI Assistants programmatically.');
    console.log('You need to create Charlotte manually in the Telnyx Mission Control Portal.\n');

    console.log('🔗 Go to: https://portal.telnyx.com/#/app/ai-assistants\n');

    console.log('📋 Copy these settings:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1. BASIC INFO:');
    console.log(`   Name: ${CHARLOTTE_CONFIG.name}`);
    console.log(`   First Message: ${CHARLOTTE_CONFIG.first_message}`);

    console.log('\n2. SYSTEM PROMPT:');
    console.log('   (Copy from below)');
    console.log('   ──────────────────────────────────────');
    console.log(CHARLOTTE_CONFIG.system_prompt);
    console.log('   ──────────────────────────────────────');

    console.log('\n3. VOICE SETTINGS:');
    console.log(`   Provider: ${CHARLOTTE_CONFIG.voice.provider}`);
    console.log(`   Model: ${CHARLOTTE_CONFIG.voice.model}`);
    console.log(`   Voice: ${CHARLOTTE_CONFIG.voice.voice_id}`);
    console.log(`   Speed: ${CHARLOTTE_CONFIG.voice.speed}`);

    console.log('\n4. SPEECH-TO-TEXT:');
    console.log(`   Provider: ${CHARLOTTE_CONFIG.speech_to_text.provider}`);
    console.log(`   Model: ${CHARLOTTE_CONFIG.speech_to_text.model}`);
    console.log(`   Language: ${CHARLOTTE_CONFIG.speech_to_text.language}`);

    console.log('\n5. LLM SETTINGS:');
    console.log(`   Provider: ${CHARLOTTE_CONFIG.llm.provider}`);
    console.log(`   Model: ${CHARLOTTE_CONFIG.llm.model}`);
    console.log(`   Temperature: ${CHARLOTTE_CONFIG.llm.temperature}`);
    console.log(`   Max Tokens: ${CHARLOTTE_CONFIG.llm.max_tokens}`);

    console.log('\n6. WEBHOOK:');
    console.log(`   URL: ${CHARLOTTE_CONFIG.webhook_url}`);
    console.log('   Events: conversation.started, conversation.completed, function.called');

    console.log('\n7. FUNCTION (CRITICAL - This is how data gets saved!):');
    console.log('   Click "Add Tool" or similar button');
    console.log('   Function Name: save_service_request');
    console.log('   Description: Save the customer\'s furnace service request information');
    console.log('\n   Parameters (JSON):');
    console.log('   ──────────────────────────────────────');
    console.log(JSON.stringify(CHARLOTTE_CONFIG.functions[0].parameters, null, 2));
    console.log('   ──────────────────────────────────────');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💾 After creating Charlotte:');
    console.log('   1. Copy the Assistant ID');
    console.log('   2. Add to your .env file:');
    console.log('      CHARLOTTE_AI_ASSISTANT_ID=asst_your_id_here');
    console.log('   3. Assign Charlotte to your phone number in Telnyx');
    console.log('   4. Test by calling: +1-833-494-8669\n');

    // Save configuration to file for reference
    const fs = require('fs');
    fs.writeFileSync(
      './charlotte-config.json',
      JSON.stringify(CHARLOTTE_CONFIG, null, 2)
    );
    console.log('✓ Configuration saved to charlotte-config.json for reference\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

// Run the setup
setupCharlotte();
