require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Store webhook events for testing
const receivedEvents = [];

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const event = {
    timestamp,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  };
  
  receivedEvents.push(event);
  
  // Keep only last 50 events
  if (receivedEvents.length > 50) {
    receivedEvents.shift();
  }
  
  console.log(`\n🌐 ${timestamp} - ${req.method} ${req.url}`);
  console.log('From IP:', req.ip || req.connection.remoteAddress);
  console.log('User-Agent:', req.headers['user-agent']);
  
  if (Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  next();
});

// Root endpoint - health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Telnyx Webhook Tester - Ready to receive webhooks!',
    status: 'running',
    timestamp: new Date().toISOString(),
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: {
      health: '/health',
      webhook: '/webhook (for voice calls)',
      aiEvents: '/webhook/ai-events (for AI assistant)',
      messaging: '/webhook/messaging (for SMS/MMS)',
      events: '/events (see received webhooks)'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      webhookUrl: process.env.WEBHOOK_URL
    }
  });
});

// View received events
app.get('/events', (req, res) => {
  res.json({
    totalEvents: receivedEvents.length,
    events: receivedEvents.slice(-10), // Show last 10 events
    instructions: {
      message: "Call your Telnyx number to see webhooks appear here",
      phoneNumber: process.env.TELNYX_PHONE_NUMBER,
      refreshUrl: req.protocol + '://' + req.get('host') + '/events'
    }
  });
});

// Clear events log
app.post('/events/clear', (req, res) => {
  const clearedCount = receivedEvents.length;
  receivedEvents.length = 0;
  res.json({ 
    message: 'Events cleared', 
    clearedCount,
    timestamp: new Date().toISOString() 
  });
});

// Voice call webhook
app.post('/webhook', (req, res) => {
  console.log('\n📞 VOICE WEBHOOK RECEIVED!');
  console.log('Event Type:', req.body.data?.event_type);
  console.log('Call Control ID:', req.body.data?.payload?.call_control_id);
  console.log('From:', req.body.data?.payload?.from?.phone_number);
  console.log('To:', req.body.data?.payload?.to?.phone_number);
  
  const eventType = req.body.data?.event_type;
  const callId = req.body.data?.payload?.call_control_id;
  
  if (eventType === 'call.initiated') {
    console.log('🎯 PERFECT! Voice webhook is working - call.initiated received');
  }
  
  res.status(200).json({
    message: 'Voice webhook received successfully',
    eventType,
    callId,
    timestamp: new Date().toISOString(),
    status: 'processed'
  });
});

// AI Assistant webhook
app.post('/webhook/ai-events', (req, res) => {
  console.log('\n🤖 AI ASSISTANT WEBHOOK RECEIVED!');
  console.log('Event Type:', req.body.type);
  console.log('Call ID:', req.body.call_id);
  console.log('Function Name:', req.body.function_name);
  console.log('From Number:', req.body.from_number);
  
  const eventType = req.body.type;
  const callId = req.body.call_id;
  
  if (eventType === 'function.called') {
    console.log('🎯 PERFECT! AI webhook is working - function.called received');
  }
  
  if (eventType === 'conversation.completed') {
    console.log('🎯 PERFECT! AI webhook is working - conversation.completed received');
  }
  
  res.status(200).json({
    message: 'AI webhook received successfully',
    eventType,
    callId,
    timestamp: new Date().toISOString(),
    status: 'processed'
  });
});

// SMS/MMS webhook
app.post('/webhook/messaging', (req, res) => {
  console.log('\n💬 MESSAGING WEBHOOK RECEIVED!');
  console.log('Event Type:', req.body.data?.event_type);
  console.log('From:', req.body.data?.payload?.from?.phone_number);
  console.log('Text:', req.body.data?.payload?.text);
  
  const eventType = req.body.data?.event_type;
  const from = req.body.data?.payload?.from?.phone_number;
  
  if (eventType === 'message.received') {
    console.log('🎯 PERFECT! SMS webhook is working - message.received');
  }
  
  res.status(200).json({
    message: 'Messaging webhook received successfully',
    eventType,
    from,
    timestamp: new Date().toISOString(),
    status: 'processed'
  });
});

// Catch-all for testing other endpoints
app.all('*', (req, res) => {
  console.log(`\n❓ UNKNOWN ENDPOINT: ${req.method} ${req.url}`);
  console.log('This might be a misconfigured webhook URL');
  
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    url: req.url,
    message: 'This endpoint is not configured for webhooks',
    availableEndpoints: [
      '/webhook (for voice calls)',
      '/webhook/ai-events (for AI assistant)', 
      '/webhook/messaging (for SMS/MMS)',
      '/events (to view received webhooks)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('\n❌ SERVER ERROR:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server with comprehensive logging
app.listen(PORT, () => {
  console.log('\n🚀 TELNYX WEBHOOK TESTER STARTED');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌐 Base URL: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}`);
  console.log('\n📞 WEBHOOK ENDPOINTS:');
  console.log(`   Voice calls: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/webhook`);
  console.log(`   AI assistant: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/webhook/ai-events`);
  console.log(`   SMS/MMS: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/webhook/messaging`);
  console.log('\n🔍 TESTING ENDPOINTS:');
  console.log(`   Health check: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/health`);
  console.log(`   View events: ${process.env.WEBHOOK_URL || 'http://localhost:' + PORT}/events`);
  console.log('\n📱 TEST INSTRUCTIONS:');
  console.log(`   1. Call your Telnyx number: ${process.env.TELNYX_PHONE_NUMBER}`);
  console.log(`   2. Watch console logs for webhook activity`);
  console.log(`   3. Visit /events endpoint to see webhook history`);
  console.log(`   4. Check Telnyx Mission Control webhook settings if no activity`);
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Ready to test webhooks! Make a call now...\n');
});