# Webhook Configuration Tester

## Quick Test Instructions

### 1. Deploy the Webhook Tester
Replace your current `index.js` temporarily with `webhook-tester.js`:

```bash
# On Railway or your deployment platform
# Deploy webhook-tester.js as your main file
```

### 2. Test Your Webhook URLs

**Visit these URLs in your browser:**

- **Health Check**: `https://telnyx-voice-agent-production.up.railway.app/health`
  - Should return JSON with status "healthy"

- **Events Dashboard**: `https://telnyx-voice-agent-production.up.railway.app/events` 
  - Shows webhook activity in real-time

### 3. Make Test Calls

**Call your Telnyx number**: `+1-833-494-8669`

**Watch for webhook activity:**
- Console logs (if you have Railway CLI: `railway logs --follow`)
- Events dashboard at `/events` endpoint

### 4. Expected Webhook Flow

**For a successful call, you should see:**

1. **Voice Webhook** (`/webhook`):
   ```json
   {
     "data": {
       "event_type": "call.initiated",
       "payload": {
         "call_control_id": "abc123",
         "from": {"phone_number": "+1234567890"},
         "to": {"phone_number": "+18334948669"}
       }
     }
   }
   ```

2. **AI Assistant Webhooks** (`/webhook/ai-events`):
   ```json
   {
     "type": "function.called",
     "call_id": "abc123", 
     "function_name": "save_service_request",
     "from_number": "+1234567890"
   }
   ```

3. **Conversation Completion** (`/webhook/ai-events`):
   ```json
   {
     "type": "conversation.completed",
     "call_id": "abc123"
   }
   ```

## Common Issues & Fixes

### ❌ No webhooks received at all
**Problem**: Webhook URLs not configured in Telnyx
**Fix**: Check Telnyx Mission Control:
- Go to **Phone Numbers** → Your number → **Voice Settings**
- Set **Webhook URL**: `https://telnyx-voice-agent-production.up.railway.app/webhook`

### ❌ Voice webhooks work, but no AI webhooks
**Problem**: AI Assistant webhook URL not configured
**Fix**: Check Telnyx Mission Control:
- Go to **AI** → **Assistants** → Charlotte
- Set **Webhook URL**: `https://telnyx-voice-agent-production.up.railway.app/webhook/ai-events`

### ❌ Getting 404 errors
**Problem**: Webhook URLs pointing to wrong endpoints
**Fix**: Verify exact URLs:
- Voice: `/webhook` (not `/webhooks` or `/voice`)
- AI: `/webhook/ai-events` (not `/ai` or `/assistant`)

### ❌ Getting timeout errors  
**Problem**: Server not responding
**Fix**: Check if Railway app is running:
- Visit health check endpoint
- Check Railway deployment logs

## Telnyx Configuration Checklist

### Phone Number Settings (Mission Control)
- [x] Number: `+1-833-494-8669`
- [x] Voice Webhook URL: `https://telnyx-voice-agent-production.up.railway.app/webhook`
- [x] AI Assistant assigned to number

### AI Assistant Settings (Mission Control)  
- [x] Assistant Name: Charlotte
- [x] Webhook URL: `https://telnyx-voice-agent-production.up.railway.app/webhook/ai-events`
- [x] Functions configured (save_service_request)

### Railway Deployment
- [x] App deployed and running
- [x] Environment variables set (TELNYX_API_KEY, SUPABASE_URL, etc.)
- [x] Health check endpoint responding

## After Testing

**Once webhooks are confirmed working:**

1. **Switch back to production code**:
   - Deploy your actual `index.js` (not webhook-tester.js)

2. **Verify data saving**:
   - Make another test call
   - Check Supabase for new records in `call_log_va` and `service_requests_va`

3. **Monitor logs**:
   - Watch for successful database saves
   - Check for any errors

## Troubleshooting URLs

**If your actual Railway URL is different, update these everywhere:**
- Telnyx Mission Control webhook settings
- Environment variable `WEBHOOK_URL` 
- This documentation

**Common Railway URL patterns:**
- `https://your-app-name.up.railway.app`
- `https://your-app-name-production.up.railway.app`
- Custom domain if configured