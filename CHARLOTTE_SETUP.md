# Charlotte - Fix My Furnace Setup Guide

This guide explains how to integrate the Charlotte AI assistant persona and enable SMS/MMS messaging for your Telnyx voice agent.

## What's New

### Charlotte AI Assistant
Charlotte is a warm, professional voice assistant specifically designed for Fix My Furnace in Michigan. Unlike the generic assistant, Charlotte has:

- **Natural Detroit-local personality** - Warm, confident, with subtle Midwest friendliness
- **Contextual responses** - Adapts to frustrated, calm, elderly, or hurried callers
- **Furnace-specific data collection** - Gathers home size, urgency, service history, etc.
- **Professional call flow** - Mirrors real CSR conversations, not scripted responses
- **Enhanced voice settings** - Optimized pace, pitch, and tone for maximum warmth

### SMS/MMS Support
The system now handles text messages in addition to voice calls:

- **Auto-respond to texts** - Charlotte responds to SMS inquiries automatically
- **MMS support** - Customers can send pictures of their furnace issues
- **Intent detection** - Recognizes emergencies, scheduling requests, pricing questions
- **Message history** - All SMS/MMS conversations saved to database

---

## Setup Instructions

### Step 1: Update Your Database

You need to run the new database schema to support Charlotte's enhanced features.

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Open the file `supabase-schema-charlotte.sql` from your project
4. Copy and paste the entire SQL script
5. Click **Run** to create the new tables and functions

**New Tables Created:**
- `service_requests` - Enhanced table for furnace service requests
- `message_history` - Tracks all SMS/MMS conversations

**New Views Created:**
- `emergency_requests` - Quick view of emergency service needs
- `todays_appointments` - Today's scheduled service calls
- `pending_requests` - Requests waiting for tech assignment

**Note:** The old `caller_info` table is kept for backward compatibility. You can migrate existing data using the migration query included at the bottom of the schema file.

### Step 2: Create Charlotte AI Assistant in Telnyx

1. Log in to [Telnyx Mission Control](https://portal.telnyx.com)
2. Navigate to **AI, Storage and Compute** > **AI Assistants**
3. Click **Create New Assistant**

#### Basic Configuration

| Field | Value |
|-------|-------|
| **Name** | Charlotte - Fix My Furnace |
| **Description** | Warm, professional voice for Fix My Furnace in Michigan |

#### System Prompt

Copy the entire `systemPrompt` from `ai-assistant-charlotte.js` (lines 13-59).

This prompt includes:
- Charlotte's personality and tone
- Conversation adaptation strategies
- Natural question flow (one-at-a-time)
- Caller type responses (frustrated, calm, elderly, hurried)
- Greeting and closing scripts

#### Voice Settings

| Setting | Recommended Value | Alternative |
|---------|-------------------|-------------|
| **Provider** | Deepgram | - |
| **Model** | Aura | Nova-2 |
| **Voice ID** | `aura-athena-en` | `aura-luna-en`, `aura-stella-en` |
| **Speed** | 0.9 (10% slower) | Adjust for naturalness |
| **Pitch** | 0.95 (slightly lower) | Adds authority |

**Why these settings?**
- Aura voices sound most natural and conversational
- Slower pace gives customers time to think
- Lower pitch conveys confidence and professionalism

#### Transcription Settings

| Setting | Value |
|---------|-------|
| **Provider** | Deepgram |
| **Model** | Nova-2 |
| **Language** | en-US |
| **Interim Results** | Enabled |
| **Smart Format** | Enabled (auto-formats addresses, times) |
| **Punctuation** | Enabled |

#### LLM Settings

| Setting | Value | Why |
|---------|-------|-----|
| **Provider** | OpenAI | Best for conversational AI |
| **Model** | GPT-4-Turbo | Fast and capable |
| **Temperature** | 0.8 | Higher for spontaneity |
| **Max Tokens** | 200 | Allows complete, warm sentences |
| **Frequency Penalty** | 0.3 | Reduces repetitive phrases |
| **Presence Penalty** | 0.3 | Encourages topic variation |

#### Function Configuration

Add the `save_service_request` function from `ai-assistant-charlotte.js` (lines 61-87).

Click **Add Function** and fill in:

**Function Name:** `save_service_request`

**Description:** "Save the customer's furnace service request information when all key details have been collected"

**Parameters (JSON Schema):**

```json
{
  "type": "object",
  "properties": {
    "customer_name": {
      "type": "string",
      "description": "The customer's full name"
    },
    "address": {
      "type": "string",
      "description": "The service address where the tech should come"
    },
    "issue_description": {
      "type": "string",
      "description": "Description of what's wrong with the furnace"
    },
    "home_size": {
      "type": "string",
      "description": "Size of the home (e.g., '2000 sq ft', 'two-story', 'small ranch')"
    },
    "last_service_date": {
      "type": "string",
      "description": "When the system was last serviced (approximate is fine)"
    },
    "preferred_time": {
      "type": "string",
      "description": "Preferred appointment time (morning, afternoon, evening)"
    },
    "urgency_level": {
      "type": "string",
      "enum": ["emergency", "urgent", "routine"],
      "description": "How urgent the service request is"
    },
    "additional_notes": {
      "type": "string",
      "description": "Any additional information or special requests"
    }
  },
  "required": ["customer_name", "address", "issue_description"]
}
```

#### Conversation Settings

| Setting | Value |
|---------|-------|
| **Interruptible** | Enabled (natural conversations) |
| **End of Turn Silence** | 1200ms (allows natural pauses) |
| **Max Duration** | 420 seconds (7 minutes) |
| **Background Sound** | None (clean audio) |

#### Webhooks

Set the webhook URL to: `https://your-domain.com/webhook/ai-events`

Enable these events:
- ✅ conversation.started
- ✅ conversation.completed
- ✅ function.called
- ✅ transcription.received
- ✅ error.occurred

#### Save and Copy Assistant ID

1. Click **Save Assistant**
2. Copy the **Assistant ID** (starts with "asst_...")
3. Add it to your `.env` file:

```env
CHARLOTTE_AI_ASSISTANT_ID=asst_your_charlotte_assistant_id_here
```

### Step 3: Enable SMS/MMS on Your Telnyx Number

1. Go to **Numbers** > **My Numbers** in Telnyx Mission Control
2. Find your number: **+1-833-494-8669**
3. Click to edit the number

#### Messaging Settings

1. Scroll to **Messaging Settings**
2. Enable the following:
   - ✅ **SMS** - Receive and send text messages
   - ✅ **MMS** - Receive and send media messages

3. Set **Messaging Profile** to your default profile (or create one)

4. Under **Webhooks**, set:
   - **Webhook URL:** `https://your-domain.com/webhook/messaging`
   - **Failover URL:** (optional) `https://your-backup-domain.com/webhook/messaging`

5. Enable these webhook events:
   - ✅ message.received
   - ✅ message.sent
   - ✅ message.failed
   - ✅ message.delivered (optional)

6. Click **Save**

### Step 4: Update Environment Variables

Edit your `.env` file to include Charlotte configuration:

```env
# Telnyx Configuration
TELNYX_API_KEY=your_actual_api_key
TELNYX_PHONE_NUMBER=+18334948669
TELNYX_AI_ASSISTANT_ID=asst_old_generic_assistant  # Optional: keep for fallback

# Charlotte AI Assistant
CHARLOTTE_AI_ASSISTANT_ID=asst_your_charlotte_assistant_id

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-actual-domain.com

# Business Configuration
BUSINESS_NAME="Fix My Furnace"
BUSINESS_LOCATION="Michigan"
```

### Step 5: Update Voice Settings in Telnyx

To use Charlotte for voice calls:

1. Go to **Numbers** > **My Numbers**
2. Click on **+1-833-494-8669**
3. Under **Voice Settings**:
   - **AI Assistant**: Select "Charlotte - Fix My Furnace"
   - **Webhook URL**: `https://your-domain.com/webhook`

4. Click **Save**

### Step 6: Test Your Setup

#### Test Voice Calls

1. Call your number: **+1-833-494-8669**
2. Charlotte should greet you warmly: "Hi, this is Charlotte with Fix My Furnace. How are you today?"
3. Provide service information when asked
4. Charlotte will collect:
   - Your name
   - Service address
   - Issue description
   - Home size
   - Last service date
   - Preferred appointment time
   - Urgency level

5. Check your Supabase `service_requests` table to verify data was saved

#### Test SMS

1. Send a text to **+1-833-494-8669**: "My furnace isn't working"
2. You should receive Charlotte's response within a few seconds
3. Check your Supabase `message_history` table to verify the conversation was logged

#### Test MMS

1. Send a picture message to **+1-833-494-8669** with text: "Here's a photo of my furnace"
2. Charlotte should acknowledge the media and respond appropriately
3. The media URLs will be stored in the `message_history` table

---

## How Charlotte Handles Different Scenarios

### SMS Intent Detection

Charlotte automatically detects customer intent and responds accordingly:

| Customer Says | Charlotte Responds |
|---------------|-------------------|
| "emergency", "urgent", "no heat" | Emergency response - encourages immediate call |
| "schedule", "appointment", "book" | Scheduling help - offers to set up appointment |
| "price", "cost", "quote" | Pricing inquiry - explains pricing varies, offers tech call |
| "hours", "open" | Business hours - mentions 24/7 emergency service |
| (anything else) | General friendly response - encourages phone call |

### Voice Call Adaptation

Charlotte adapts her tone based on caller type:

**Frustrated Caller:**
> "I completely understand — that sounds uncomfortable. Let's take care of it right away."

**Calm Caller:**
> "Sounds good, we'll get that taken care of."

**Elderly Caller:**
> "No rush at all, take your time. You're doing perfectly."

**Hurried Caller:**
> "Got it. I'll just grab your address and we'll get someone out as soon as possible."

---

## Monitoring and Analytics

### View Service Requests

**Emergency Requests:**
```sql
SELECT * FROM emergency_requests;
```

**Today's Appointments:**
```sql
SELECT * FROM todays_appointments;
```

**Pending Requests (by priority):**
```sql
SELECT * FROM pending_requests;
```

### Get Customer History

```sql
SELECT * FROM get_customer_history('+15551234567');
```

### Check Service Stats

```sql
SELECT * FROM get_service_stats();
```

Returns:
- Total requests (last 30 days)
- Pending count
- Scheduled count
- Emergency count
- Average response time (hours)

### View SMS/MMS History

```sql
SELECT
  phone_number,
  direction,
  message_text,
  ARRAY_LENGTH(media_urls, 1) as media_count,
  created_at
FROM message_history
ORDER BY created_at DESC
LIMIT 50;
```

---

## Customization

### Adjust Charlotte's Personality

Edit `ai-assistant-charlotte.js` and update:

- `systemPrompt` - Change conversation flow, greetings, or responses
- `voice.speed` - Make Charlotte speak faster (1.0) or slower (0.8)
- `voice.pitch` - Adjust pitch higher (1.0+) or lower (0.9-)
- `llm.temperature` - Lower (0.6) for consistency, higher (0.9) for variety

Then update the assistant in Telnyx Mission Control.

### Change SMS Responses

Edit the `handleIncomingMessage` function in `index.js` (lines 216-283) to modify:

- Intent detection keywords
- Response templates
- Auto-response behavior

### Add New Data Fields

1. Update `supabase-schema-charlotte.sql` to add columns to `service_requests`
2. Update the function parameters in `ai-assistant-charlotte.js`
3. Update `saveServiceRequest` in `supabase.js`
4. Update the Charlotte assistant function in Telnyx Mission Control

---

## Troubleshooting

### SMS Not Working

**Check Telnyx Configuration:**
1. Number has SMS enabled
2. Webhook URL is correct: `https://your-domain.com/webhook/messaging`
3. Webhook URL is publicly accessible (test with curl)

**Check Server Logs:**
```bash
# Look for incoming message events
grep "SMS/MMS Event" your-logs.txt

# Check for errors
grep "Error handling messaging webhook" your-logs.txt
```

**Test Webhook Manually:**
```bash
curl -X POST https://your-domain.com/webhook/messaging \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event_type": "message.received",
      "payload": {
        "from": "+15551234567",
        "to": "+18334948669",
        "text": "test message"
      }
    }
  }'
```

### Charlotte Sounds Robotic

**Increase Temperature:**
- Current: 0.8
- Try: 0.9 for more spontaneity

**Slow Down Pace:**
- Current: 0.9
- Try: 0.85 for more natural pauses

**Change Voice:**
Try different Deepgram Aura voices:
- `aura-luna-en` - More conversational
- `aura-stella-en` - Warmer tone
- `aura-orpheus-en` - Male alternative

### Data Not Saving to Supabase

**Verify Table Exists:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('service_requests', 'message_history');
```

**Check Row Level Security:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
```

**Test Insert Manually:**
```sql
INSERT INTO service_requests (
  phone_number, customer_name, address, issue_description
) VALUES (
  '+15551234567', 'Test Customer', '123 Main St', 'Test issue'
);
```

### Charlotte Not Using Function

**Check Function Configuration:**
1. Function name exactly matches: `save_service_request`
2. Required fields are marked: `customer_name`, `address`, `issue_description`
3. Assistant is instructed to call the function in the system prompt

**Enable Function Calling Logs:**
In Telnyx Mission Control, enable webhook event `function.called` to see when Charlotte attempts to save data.

---

## Next Steps

### Enhance Charlotte

1. **Add Call Transfer** - Transfer to live tech after data collection
2. **Implement Follow-ups** - Send SMS confirmations for appointments
3. **Integrate CRM** - Connect to HubSpot, Salesforce, etc.
4. **Add Voicemail** - Handle after-hours calls
5. **Multi-language** - Support Spanish for wider reach

### Build a Dashboard

Create a web interface to:
- View pending service requests
- Assign techs to appointments
- See SMS conversation history
- Track response times and metrics

### Advanced Features

1. **Sentiment Analysis** - Detect frustrated customers and escalate
2. **Predictive Scheduling** - Suggest appointment times based on history
3. **Automated Follow-up** - Send "how did we do?" texts after service
4. **Smart Routing** - Route emergency calls to on-call tech

---

## Support Resources

- **Telnyx Docs:** [developers.telnyx.com](https://developers.telnyx.com)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Deepgram Voice API:** [developers.deepgram.com/docs/tts](https://developers.deepgram.com/docs/tts)
- **OpenAI Function Calling:** [platform.openai.com/docs/guides/function-calling](https://platform.openai.com/docs/guides/function-calling)

---

## Summary

You now have:

✅ Charlotte AI assistant with warm, local personality
✅ SMS/MMS support for text message inquiries
✅ Enhanced database for furnace service tracking
✅ Automatic intent detection and smart responses
✅ Message history and analytics
✅ Emergency request prioritization

Charlotte is ready to help Fix My Furnace customers in Michigan with professional, warm, and efficient service!
