/**
 * Create Charlotte AI Assistant via Telnyx REST API
 *
 * This bypasses the web UI and creates Charlotte directly via API
 * Run: node create-charlotte-api.js
 */

require('dotenv').config();
const https = require('https');

const CHARLOTTE_CONFIG = {
  friendly_name: "Charlotte - Fix My Furnace",
  webhook_url: process.env.WEBHOOK_URL + "/webhook/ai-events",
  webhook_failover_url: null,

  voice_settings: {
    provider: "deepgram",
    model: "aura",
    voice: "aura-athena-en",
    speed: 0.9,
    stability: 0.75
  },

  transcription_settings: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-US"
  },

  llm_settings: {
    provider: "openai",
    model: "gpt-4-turbo",
    temperature: 0.8,
    max_tokens: 200
  },

  prompt: `You are Charlotte, the warm, human voice of Fix My Furnace in Michigan. You are a friendly, capable service representative who greets callers naturally, listens carefully, and guides them through a short conversation to gather their information before connecting them to a technician.

PERSONALITY:
- Warm, calm, confident, with Detroit-local friendliness
- Speak conversationally — like a real person from Detroit
- Never sound like you're reading a script

CONVERSATION FLOW:
1. Greet: "Hi, this is Charlotte with Fix My Furnace. How are you today?"
2. Ask what they need
3. Collect: name, address, issue description, home size, preferred time, urgency
4. Call save_service_request function with the information
5. Thank them and confirm scheduling

Ask questions one at a time. Be warm and natural. When you have the required information (name, address, issue), call the save_service_request function.`,

  first_message: "Hi, this is Charlotte with Fix My Furnace. How are you today?",

  tools: [
    {
      type: "function",
      function: {
        name: "save_service_request",
        description: "Save customer furnace service request. Call this once you have name, address, and issue description.",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string", description: "Customer's full name" },
            address: { type: "string", description: "Service address" },
            issue_description: { type: "string", description: "What's wrong with furnace" },
            home_size: { type: "string", description: "Home size (optional)" },
            last_service_date: { type: "string", description: "Last service date (optional)" },
            preferred_time: { type: "string", description: "Preferred time: morning/afternoon/evening" },
            urgency_level: { type: "string", enum: ["emergency", "urgent", "routine"], description: "Urgency" },
            additional_notes: { type: "string", description: "Additional notes" }
          },
          required: ["customer_name", "address", "issue_description"]
        }
      }
    }
  ]
};

async function makeAPIRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telnyx.com',
      path: `/v2${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(response, null, 2)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}\nBody: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function createCharlotte() {
  console.log('\n🤖 Creating Charlotte AI Assistant via Telnyx API...\n');

  try {
    // Validate environment
    if (!process.env.TELNYX_API_KEY) {
      throw new Error('TELNYX_API_KEY not found in .env');
    }
    if (!process.env.WEBHOOK_URL) {
      throw new Error('WEBHOOK_URL not found in .env');
    }

    console.log('✓ Environment validated');
    console.log(`  API Key: ${process.env.TELNYX_API_KEY.substring(0, 10)}...`);
    console.log(`  Webhook: ${CHARLOTTE_CONFIG.webhook_url}\n`);

    // Try to create the AI assistant
    console.log('📡 Sending request to Telnyx API...');

    const response = await makeAPIRequest('POST', '/ai/assistants', {
      data: CHARLOTTE_CONFIG
    });

    console.log('\n✅ SUCCESS! Charlotte has been created!\n');
    console.log('Assistant ID:', response.data.id);
    console.log('\n📝 Add this to your .env file:');
    console.log(`CHARLOTTE_AI_ASSISTANT_ID=${response.data.id}\n`);

    console.log('Full response:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('\n❌ Error creating Charlotte via API:', error.message);

    if (error.message.includes('404') || error.message.includes('not found')) {
      console.log('\n⚠️  The AI Assistants API endpoint might not be available yet.');
      console.log('This feature may still be in beta or require special access.\n');
      console.log('📞 Contact Telnyx Support:');
      console.log('   - Email: support@telnyx.com');
      console.log('   - Ask about: AI Assistants API access');
      console.log('   - Or: How to configure functions/tools for AI Assistants\n');
    }

    console.log('💡 Alternative: Manual Setup');
    console.log('   Run: node setup-charlotte.js');
    console.log('   This will show you what to configure manually in the portal.\n');
  }
}

createCharlotte();
