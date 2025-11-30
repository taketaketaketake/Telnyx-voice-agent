require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
const { saveVoiceLead } = require('./db/voice-leads');
const { saveMessage } = require('./db/messaging');
const { 
  startCallLog, 
  updateCallStatus, 
  linkCallToServiceRequest,
  updateCallTranscript 
} = require('./call-logging');

// Import dashboard routes
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use dashboard routes
app.use('/', dashboardRoutes);

// Track basic call info (Telnyx handles conversation state)
const activeCalls = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Telnyx Voice Agent - Charlotte Edition',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook',
      aiEvents: '/webhook/ai-events',
      messaging: '/webhook/messaging'
    }
  });
});

// Handle AI events that might come to root
app.post('/', (req, res) => {
  if (req.body && req.body.data && req.body.data.event_type) {
    console.log('AI Event received at root - configure webhook URL properly');
  }
  res.status(200).send('OK');
});

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

      case 'call.recording.saved':
        await handleRecordingSaved(payload);
        break;

      case 'call.recording.transcription.saved':
        await handleTranscriptionSaved(payload);
        break;

      // Removed unused handlers - Telnyx AI manages call flow

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

      console.log('Extracted arguments for saveVoiceLead:', args);

      try {
        // Save to Charlotte's voice leads table
        const savedLead = await saveVoiceLead({
          phone_number: event.from_number?.phone_number || event.from_number || null,
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

        console.log('✅ Saved voice lead to database!', savedLead);
      } catch (dbError) {
        console.error('❌ Database error saving voice lead:', dbError);
      }
    }

    // Log conversation completion and capture transcript
    if (event.type === 'conversation.completed') {
      console.log('✅ Charlotte completed conversation for call:', event.call_id);
      
      // Try to capture transcript and summary if available in event data
      if (event.call_id) {
        try {
          // Extract transcript from event data (if available)
          const transcript = event.transcript || event.conversation_transcript || null;
          const summary = event.summary || event.conversation_summary || null;
          
          if (transcript || summary) {
            await updateCallTranscript(event.call_id, transcript, summary);
            console.log('📝 Call transcript saved for:', event.call_id);
          } else {
            console.log('ℹ️ No transcript data available in conversation.completed event');
          }
        } catch (transcriptError) {
          console.error('❌ Error saving call transcript:', transcriptError);
        }
      }
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

  console.log(`📞 Incoming call from ${from.phone_number} to ${to.phone_number}`);
  console.log('🔍 Assistant ID from env:', process.env.CHARLOTTE_AI_ASSISTANT_ID);

  // Track basic call info in memory
  activeCalls.set(call_control_id, {
    from: from.phone_number,
    startTime: new Date()
  });

  try {
    console.log('🎯 Step 1: Answering call...');
    await telnyx.calls.answer(call_control_id);
    console.log('✅ Call answered successfully - AI should auto-start from phone number config');
    
    // Start call log in database (after core functionality works)
    await startCallLog(call_control_id, from.phone_number);
    console.log('📊 Call log started:', call_control_id);
    
    // Start recording with transcription for reliable data capture
    await telnyx.calls.startRecording(call_control_id, {
      channels: 'dual',
      transcription: {
        transcription_engine: 'telnyx',
        language: 'en'
      },
      webhook_url: process.env.WEBHOOK_URL + '/webhook'
    });
    console.log('🎙️ Recording with transcription started:', call_control_id);
    
    // Update call status to answered
    await updateCallStatus(call_control_id, 'answered');
  } catch (error) {
    console.error('❌ Detailed error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    // Minimal fallback - just answer the call
    try {
      await telnyx.calls.answer(call_control_id);
      console.log('📞 Fallback: Call answered - check Telnyx phone number AI config');
    } catch (answerError) {
      console.error('❌ Even basic answer failed:', answerError);
    }
  }
}

// Handle call answered
async function handleCallAnswered(payload) {
  const { call_control_id } = payload;

  console.log('📞 Call answered, Charlotte AI handling conversation:', call_control_id);
  
  try {
    // Update call status to in_progress when AI starts conversation
    await updateCallStatus(call_control_id, 'in_progress');
    console.log('📊 Call status: in_progress');
  } catch (error) {
    console.error('❌ Error updating call status to in_progress:', error);
  }
}

// Handle call hangup
async function handleCallHangup(payload) {
  const { call_control_id, hangup_cause } = payload;

  console.log('📞 Call ended:', call_control_id, 'Cause:', hangup_cause);

  try {
    // Update call status based on hangup cause
    let status = 'completed';
    if (hangup_cause === 'NO_ANSWER') status = 'no_answer';
    else if (hangup_cause === 'BUSY') status = 'busy';
    else if (hangup_cause?.includes('FAIL') || hangup_cause?.includes('ERROR')) status = 'failed';
    
    await updateCallStatus(call_control_id, status);
    console.log('📊 Call completed with status:', status);
  } catch (error) {
    console.error('❌ Error updating call completion status:', error);
  }

  // Clean up call data from memory
  activeCalls.delete(call_control_id);
}

// Handle recording saved webhook
async function handleRecordingSaved(payload) {
  const { call_control_id, recording_url } = payload;
  
  console.log('🎙️ Recording saved for call:', call_control_id);
  console.log('📁 Recording URL:', recording_url);
  
  try {
    // Update call log with recording URL
    await updateCallTranscript(call_control_id, null, `Recording: ${recording_url}`);
  } catch (error) {
    console.error('❌ Error saving recording URL:', error);
  }
}

// Handle transcription saved webhook - THIS IS THE RELIABLE DATA CAPTURE
async function handleTranscriptionSaved(payload) {
  const { call_control_id, transcription_url, transcription_text } = payload;
  
  console.log('📝 Transcription saved for call:', call_control_id);
  console.log('📄 Transcription text:', transcription_text);
  
  try {
    // Save full transcript to database
    await updateCallTranscript(call_control_id, transcription_text, 'Auto-captured transcript');
    console.log('✅ Transcript saved to database');
    
    // Extract customer info from transcript using simple parsing
    const customerData = extractCustomerFromTranscript(transcription_text);
    
    if (customerData.name || customerData.address || customerData.issue) {
      // Save voice lead from transcript data
      const lead = await saveVoiceLead({
        phone_number: activeCalls.get(call_control_id)?.from || null,
        customer_name: customerData.name,
        address: customerData.address,
        issue_description: customerData.issue,
        urgency_level: customerData.urgency || 'routine',
        additional_notes: `Extracted from transcript: ${transcription_text?.substring(0, 200)}...`,
        contact_method: 'voice',
        status: 'pending'
      });
      
      console.log('✅ Voice lead created from transcript:', lead.id);
    }
    
  } catch (error) {
    console.error('❌ Error processing transcription:', error);
  }
}

// Simple transcript parsing to extract customer info
function extractCustomerFromTranscript(transcript) {
  if (!transcript) return {};
  
  const text = transcript.toLowerCase();
  
  // Basic extraction patterns - can be improved
  const nameMatch = text.match(/(?:my name is|i'm|i am|this is)\s+([a-zA-Z\s]+)/);
  const addressMatch = text.match(/(?:address is|live at|come to)\s+([^.!?]*)/);
  const issueMatch = text.match(/(?:problem|issue|wrong|broken|not working)[^.!?]*/);
  const urgencyMatch = text.match(/(?:emergency|urgent|no heat|freezing|cold)/);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    address: addressMatch ? addressMatch[1].trim() : null,
    issue: issueMatch ? issueMatch[0].trim() : null,
    urgency: urgencyMatch ? 'urgent' : 'routine'
  };
}

// Removed: extractCallerInfo - Charlotte AI handles data extraction via function calls

// Handle incoming SMS/MMS messages with Charlotte's personality
async function handleIncomingMessage(payload) {
  const { from, to, text, media } = payload;

  console.log(`Received message from ${from.phone_number}: ${text}`);

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
      from: to.phone_number, // Our Telnyx number
      to: from.phone_number, // Customer's number
      text: responseText,
      webhook_url: process.env.WEBHOOK_URL + '/webhook/messaging',
      use_profile_webhooks: false
    });

    console.log('Sent SMS response to:', from.phone_number);

    // Save the incoming message to message_history
    const inboundMessage = await saveMessage({
      phone_number: from.phone_number,
      direction: 'inbound',
      message_text: text,
      media_urls: media ? media.map(m => m.url) : null,
      status: 'received'
    });

    // Save the outbound response to message_history
    await saveMessage({
      phone_number: from.phone_number,
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

    // Create a voice lead from the SMS inquiry
    await saveVoiceLead({
      phone_number: from.phone_number,
      issue_description: text,
      urgency_level: urgencyLevel,
      additional_notes: `SMS inquiry. Media attachments: ${media ? media.length : 0}`,
      contact_method: 'sms',
      status: 'pending'
    });

    console.log('Saved SMS conversation and voice lead to database');

  } catch (error) {
    console.error('Error handling incoming message:', error);

    // Send fallback response
    try {
      await telnyx.messages.create({
        from: to.phone_number,
        to: from.phone_number,
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
