# Telnyx Voice AI Agent

A low-latency voice agent built with Telnyx and Deepgram that collects caller information and stores it in Supabase.

## Features

- **Low Latency Voice AI**: Uses Telnyx's Voice AI with Deepgram for ultra-fast speech recognition
- **Natural Conversations**: Conversational AI that collects caller information naturally
- **Database Storage**: Automatically saves caller information to Supabase
- **Production Ready**: Built with Node.js/Express with proper error handling

## Phone Number

This agent is configured for: **+1-833-494-8669**

## Prerequisites

1. **Telnyx Account**: Sign up at [telnyx.com](https://telnyx.com)
2. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
3. **Node.js**: Version 18 or higher
4. **Public Webhook URL**: Use ngrok or deploy to a hosting service

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project in Supabase
2. Go to the SQL Editor
3. Run the SQL script in `supabase-schema.sql` to create the database table
4. Go to Project Settings > API to get your:
   - Project URL
   - Anon/Public Key

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Telnyx Configuration
TELNYX_API_KEY=your_api_key_here
TELNYX_PHONE_NUMBER=+18334948669
TELNYX_AI_ASSISTANT_ID=your_assistant_id

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-public-url.com
```

### 4. Set Up Telnyx AI Assistant

1. Log in to [Telnyx Mission Control](https://portal.telnyx.com)
2. Navigate to **AI, Storage and Compute** > **AI Assistants**
3. Click **Create New Assistant**
4. Configure your assistant:
   - **Name**: Information Collection Assistant
   - **System Prompt**: Copy from `ai-assistant-config.js`
   - **Voice Provider**: Deepgram
   - **Model**: Nova 2 (or Flux when available)
   - **Voice**: en-US-Neural2-A (or your preferred voice)
   - **LLM**: GPT-4-Turbo (or your preferred model)
5. Under **Functions**, add the `save_caller_information` function from `ai-assistant-config.js`
6. Save and copy your **Assistant ID** to the `.env` file

### 5. Configure Your Phone Number

1. In Telnyx Mission Control, go to **Numbers** > **My Numbers**
2. Find your number: **+1-833-494-8669**
3. Click to edit the number
4. Under **Voice Settings**:
   - **Connection Type**: Select "TeXML" or "Call Control"
   - **Webhook URL**: Enter your public webhook URL: `https://your-domain.com/webhook`
   - **AI Assistant**: Select the assistant you created above
5. Save the configuration

### 6. Expose Your Local Server (for Development)

If testing locally, use ngrok:

```bash
# Install ngrok if you haven't
npm install -g ngrok

# In a separate terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io) to your .env as WEBHOOK_URL
```

Update your Telnyx phone number configuration with the ngrok URL.

### 7. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:

```
Voice agent server running on port 3000
Webhook URL: http://localhost:3000/webhook
AI Events URL: http://localhost:3000/webhook/ai-events
Health check: http://localhost:3000/health
```

### 8. Test Your Voice Agent

Call your Telnyx number: **+1-833-494-8669**

The AI assistant will:
1. Greet you
2. Ask for your name
3. Ask for your email
4. Ask what you're calling about
5. Collect any additional notes
6. Thank you and end the call

All information is automatically saved to your Supabase database!

## Project Structure

```
telnyx-voice-agent/
├── index.js                 # Main Express server with webhook handling
├── supabase.js             # Supabase client and database functions
├── ai-assistant-config.js  # AI assistant configuration
├── supabase-schema.sql     # Database schema
├── package.json            # Node.js dependencies
├── .env.example            # Environment variables template
├── .env                    # Your actual environment variables (git-ignored)
└── README.md               # This file
```

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /webhook` - Main webhook for Telnyx call events
- `POST /webhook/ai-events` - Webhook for AI assistant events

## Database Schema

The `caller_info` table stores:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone_number | VARCHAR(20) | Caller's phone number |
| name | VARCHAR(255) | Caller's name |
| email | VARCHAR(255) | Caller's email |
| reason | TEXT | Reason for calling |
| notes | TEXT | Additional notes |
| call_timestamp | TIMESTAMPTZ | When the call occurred |
| call_start | TIMESTAMPTZ | Call start time |
| call_end | TIMESTAMPTZ | Call end time |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

## Monitoring and Debugging

### View Logs

The server logs all webhook events. Check your console for:
- Incoming call events
- AI conversation events
- Database save operations
- Any errors

### Check Supabase Data

1. Go to your Supabase project
2. Click on **Table Editor**
3. Select the `caller_info` table
4. View all collected caller information

### Telnyx Call Logs

1. In Telnyx Mission Control
2. Go to **Reports** > **Call Detail Records**
3. Find your number to see all call activity

## Customization

### Modify AI Behavior

Edit `ai-assistant-config.js` to change:
- System prompt (personality and conversation flow)
- Voice settings
- LLM model and parameters
- Functions for data extraction

Then update your assistant in Telnyx Mission Control.

### Add More Data Fields

1. Update the `save_caller_information` function in `ai-assistant-config.js`
2. Modify the database schema in `supabase-schema.sql`
3. Update the `saveCallerInfo` function in `supabase.js`

### Change Voice Provider

Telnyx supports multiple providers:
- Deepgram (recommended for low latency)
- Google Cloud TTS
- Amazon Polly
- Microsoft Azure

Update the voice settings in your AI assistant configuration.

## Production Deployment

### Deploy to a Hosting Service

Recommended platforms:
- **Railway**: Easy Node.js deployment
- **Render**: Free tier available
- **Heroku**: Simple deployment
- **DigitalOean App Platform**: Scalable
- **AWS/GCP/Azure**: Enterprise-grade

### Environment Variables

Make sure to set all environment variables in your hosting platform.

### Webhook URLs

Update your Telnyx phone number configuration with your production webhook URL.

## Troubleshooting

### Calls Not Connecting

- Verify your phone number is configured correctly in Telnyx
- Check that the webhook URL is publicly accessible
- Ensure the webhook URL uses HTTPS (required by Telnyx)

### AI Not Responding

- Verify your AI Assistant ID is correct
- Check that the assistant is properly configured in Mission Control
- Review the server logs for error messages

### Database Not Saving

- Verify Supabase credentials in `.env`
- Check that the table exists (run `supabase-schema.sql`)
- Review Supabase logs in your project dashboard

### Webhook Errors

- Check that your server is running
- Verify the webhook URL is correct and publicly accessible
- Review server logs for incoming webhook events

## Support

- **Telnyx Docs**: [developers.telnyx.com](https://developers.telnyx.com)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Deepgram Docs**: [developers.deepgram.com](https://developers.deepgram.com)

## License

MIT

## Next Steps

Once your basic agent is working, you can:

1. **Add custom business logic** - Route calls based on caller info
2. **Integrate with CRM** - Connect to Salesforce, HubSpot, etc.
3. **Add SMS follow-up** - Send confirmation texts using Telnyx SMS API
4. **Build a dashboard** - Create a web interface to view caller data
5. **Add analytics** - Track call metrics and conversation quality
6. **Multi-language support** - Handle calls in different languages
7. **Advanced AI features** - Sentiment analysis, intent detection, etc.

Happy building!
