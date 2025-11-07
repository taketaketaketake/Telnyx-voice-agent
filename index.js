require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
const { saveCallerInfo } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store active calls and collected data
const activeCalls = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main webhook endpoint for Telnyx
app.post('/webhook', async (req, res) => {
  const event = req.body;

  console.log('Received webhook:', JSON.stringify(event, null, 2));

  try {
    const eventType = event.data?.event_type;
    const payload = event.data?.payload;

    switch (eventType) {
      case 'call.initiated':
        await handleCallInitiated(payload);
        break;

      case 'call.answered':
        await handleCallAnswered(payload);
        break;

      case 'call.hangup':
        await handleCallHangup(payload);
        break;

      case 'call.speak.ended':
        console.log('Speak ended for call:', payload.call_control_id);
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle AI Assistant events
app.post('/webhook/ai-events', async (req, res) => {
  const event = req.body;

  console.log('AI Event:', JSON.stringify(event, null, 2));

  try {
    // Handle conversation completion and extract data
    if (event.type === 'conversation.completed') {
      const callId = event.call_id;
      const conversationData = event.conversation_data;

      // Extract user information from conversation
      const callerInfo = extractCallerInfo(conversationData);

      if (callerInfo) {
        await saveCallerInfo(callerInfo);
        console.log('Saved caller info to Supabase:', callerInfo);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling AI event:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle incoming call
async function handleCallInitiated(payload) {
  const { call_control_id, from, to } = payload;

  console.log(`Incoming call from ${from} to ${to}`);

  // Initialize call data storage
  activeCalls.set(call_control_id, {
    from,
    to,
    startTime: new Date(),
    data: {}
  });

  try {
    // Answer the call
    await telnyx.calls.answer(call_control_id);
    console.log('Call answered:', call_control_id);
  } catch (error) {
    console.error('Error answering call:', error);
  }
}

// Handle call answered
async function handleCallAnswered(payload) {
  const { call_control_id } = payload;

  try {
    // Transfer to AI Assistant
    // Note: You'll need to configure your AI Assistant in Telnyx Mission Control
    // and use the assistant ID from your environment variables

    // For now, we'll use a simple speak command as a fallback
    // In production, you would integrate with Telnyx AI Assistant API
    await telnyx.calls.speak(call_control_id, {
      payload: "Hello! Thank you for calling. I'm your AI assistant. May I have your name please?",
      voice: "en-US-Neural2-A",
      language: "en-US"
    });

    console.log('AI greeting sent to call:', call_control_id);
  } catch (error) {
    console.error('Error starting AI conversation:', error);
  }
}

// Handle call hangup
async function handleCallHangup(payload) {
  const { call_control_id } = payload;

  console.log('Call ended:', call_control_id);

  // Clean up call data
  const callData = activeCalls.get(call_control_id);

  if (callData && Object.keys(callData.data).length > 0) {
    try {
      // Save collected data to Supabase
      await saveCallerInfo({
        phone_number: callData.from,
        call_start: callData.startTime,
        call_end: new Date(),
        ...callData.data
      });

      console.log('Saved call data to Supabase');
    } catch (error) {
      console.error('Error saving call data:', error);
    }
  }

  activeCalls.delete(call_control_id);
}

// Extract caller information from conversation data
function extractCallerInfo(conversationData) {
  // This is a placeholder - you'll need to parse the actual conversation
  // based on your AI assistant's response format
  try {
    return {
      phone_number: conversationData.caller_phone,
      name: conversationData.caller_name,
      email: conversationData.caller_email,
      reason: conversationData.call_reason,
      notes: conversationData.additional_notes,
      call_timestamp: new Date()
    };
  } catch (error) {
    console.error('Error extracting caller info:', error);
    return null;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Voice agent server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`AI Events URL: http://localhost:${PORT}/webhook/ai-events`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
