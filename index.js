require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
const { saveServiceRequest, saveMessage } = require('./supabase');

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
    // Handle function calls from Charlotte (when she collects service info)
    if (event.type === 'function.called' && event.function_name === 'save_service_request') {
      console.log('Charlotte called save_service_request with:', event.function_arguments);

      const args = event.function_arguments;

      // Save to Charlotte's service_requests table
      const savedRequest = await saveServiceRequest({
        phone_number: event.from_number || null,
        customer_name: args.customer_name || null,
        email: args.email || null,
        address: args.address || null,
        home_size: args.home_size || null,
        issue_description: args.issue_description || null,
        urgency_level: args.urgency_level || 'routine',
        last_service_date: args.last_service_date || null,
        preferred_time: args.preferred_time || null,
        additional_notes: args.additional_notes || null,
        contact_method: 'voice',
        status: 'pending'
      });

      console.log('✅ Saved service request to Supabase!', savedRequest);
    }

    // Also handle conversation completion for logging
    if (event.type === 'conversation.completed') {
      console.log('Conversation completed. Call ID:', event.call_id);
      console.log('Full event data:', JSON.stringify(event, null, 2));
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling AI event:', error);
    console.error('Event was:', JSON.stringify(event, null, 2));
    res.status(500).send('Internal Server Error');
  }
});

// Handle incoming SMS/MMS messages
app.post('/webhook/messaging', async (req, res) => {
  const event = req.body;

  console.log('SMS/MMS Event:', JSON.stringify(event, null, 2));

  try {
    const eventType = event.data?.event_type;
    const payload = event.data?.payload;

    switch (eventType) {
      case 'message.received':
        await handleIncomingMessage(payload);
        break;

      case 'message.sent':
        console.log('Message sent successfully:', payload.id);
        break;

      case 'message.failed':
        console.error('Message failed:', payload);
        break;

      default:
        console.log('Unhandled messaging event:', eventType);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling messaging webhook:', error);
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

  console.log('Call answered, AI Assistant should take over:', call_control_id);

  // If Charlotte AI Assistant is configured on your Telnyx number,
  // she will automatically start the conversation.
  // No need to send speak commands - that interferes with the AI.

  // The AI Assistant will handle:
  // 1. Greeting the caller
  // 2. Collecting information
  // 3. Sending events to /webhook/ai-events when done
}

// Handle call hangup
async function handleCallHangup(payload) {
  const { call_control_id } = payload;

  console.log('Call ended:', call_control_id);

  // Clean up call data
  const callData = activeCalls.get(call_control_id);

  if (callData && Object.keys(callData.data).length > 0) {
    try {
      // Save collected data to Charlotte's service_requests table
      await saveServiceRequest({
        phone_number: callData.from,
        customer_name: callData.data.name || null,
        email: callData.data.email || null,
        address: callData.data.address || null,
        issue_description: callData.data.reason || callData.data.issue_description || null,
        additional_notes: callData.data.notes || null,
        contact_method: 'voice',
        call_start: callData.startTime,
        call_end: new Date(),
        status: 'pending'
      });

      console.log('Saved service request to Supabase');
    } catch (error) {
      console.error('Error saving service request:', error);
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

// Handle incoming SMS/MMS messages with Charlotte's personality
async function handleIncomingMessage(payload) {
  const { from, to, text, media } = payload;

  console.log(`Received message from ${from}: ${text}`);

  // Check if there are media attachments (MMS)
  if (media && media.length > 0) {
    console.log(`Message includes ${media.length} media attachment(s):`, media);
  }

  try {
    // Charlotte's SMS response - warm and helpful
    let responseText = '';

    // Detect intent and respond accordingly
    const lowerText = (text || '').toLowerCase();

    if (lowerText.includes('emergency') || lowerText.includes('urgent') || lowerText.includes('no heat')) {
      // Emergency response
      responseText = "Hi! This is Charlotte from Fix My Furnace. I see you need urgent help. For fastest service, please call us at " + process.env.TELNYX_PHONE_NUMBER + " and I'll get you taken care of right away.";
    } else if (lowerText.includes('schedule') || lowerText.includes('appointment') || lowerText.includes('book')) {
      // Scheduling request
      responseText = "Hi! I'm Charlotte with Fix My Furnace. I'd love to help schedule your service. Could you give me a call at " + process.env.TELNYX_PHONE_NUMBER + "? It'll just take a minute to get your appointment set up.";
    } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('quote')) {
      // Pricing inquiry
      responseText = "Hi! Thanks for reaching out to Fix My Furnace. Pricing depends on your specific situation. Give me a call at " + process.env.TELNYX_PHONE_NUMBER + " and I can get you connected with one of our techs for an accurate estimate.";
    } else if (lowerText.includes('hours') || lowerText.includes('open')) {
      // Business hours
      responseText = "Hi! Fix My Furnace is here to help. For service questions and scheduling, call me at " + process.env.TELNYX_PHONE_NUMBER + ". We offer emergency service 24/7!";
    } else {
      // General response
      responseText = "Hi! This is Charlotte from Fix My Furnace. Thanks for your message! For the fastest help, please call me at " + process.env.TELNYX_PHONE_NUMBER + " and I'll personally take care of you.";
    }

    // Send SMS response using Telnyx
    await telnyx.messages.create({
      from: to, // Our Telnyx number
      to: from, // Customer's number
      text: responseText,
      webhook_url: process.env.WEBHOOK_URL + '/webhook/messaging',
      use_profile_webhooks: false
    });

    console.log('Sent SMS response to:', from);

    // Save the incoming message to message_history
    const inboundMessage = await saveMessage({
      phone_number: from,
      direction: 'inbound',
      message_text: text,
      media_urls: media ? media.map(m => m.url) : null,
      status: 'received'
    });

    // Save the outbound response to message_history
    await saveMessage({
      phone_number: from,
      direction: 'outbound',
      message_text: responseText,
      status: 'sent'
    });

    // Determine urgency level based on keywords
    let urgencyLevel = 'routine';
    if (lowerText.includes('emergency') || lowerText.includes('no heat')) {
      urgencyLevel = 'emergency';
    } else if (lowerText.includes('urgent')) {
      urgencyLevel = 'urgent';
    }

    // Create a service request from the SMS inquiry
    await saveServiceRequest({
      phone_number: from,
      issue_description: text,
      urgency_level: urgencyLevel,
      additional_notes: `SMS inquiry. Media attachments: ${media ? media.length : 0}`,
      contact_method: 'sms',
      status: 'pending'
    });

    console.log('Saved SMS conversation and service request to Supabase');

  } catch (error) {
    console.error('Error handling incoming message:', error);

    // Send fallback response
    try {
      await telnyx.messages.create({
        from: to,
        to: from,
        text: "Hi! This is Charlotte from Fix My Furnace. I'm having trouble processing your message right now. Please call us at " + process.env.TELNYX_PHONE_NUMBER + " and I'll help you directly. Thanks!"
      });
    } catch (fallbackError) {
      console.error('Error sending fallback message:', fallbackError);
    }
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Voice agent server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`AI Events URL: http://localhost:${PORT}/webhook/ai-events`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
