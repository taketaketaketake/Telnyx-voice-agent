require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug: Log ALL incoming requests
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

// Main webhook endpoint for Telnyx
app.post('/webhook', async (req, res) => {
  console.log('\n📞 VOICE WEBHOOK RECEIVED:');
  console.log('Event Type:', req.body.data?.event_type);
  console.log('Call ID:', req.body.data?.payload?.call_control_id);
  console.log('From:', req.body.data?.payload?.from);
  console.log('To:', req.body.data?.payload?.to);
  console.log('Full payload:', JSON.stringify(req.body, null, 2));
  
  res.status(200).send('OK - Debug received');
});

// Handle AI Assistant events
app.post('/webhook/ai-events', async (req, res) => {
  console.log('\n🤖 AI WEBHOOK RECEIVED:');
  console.log('Event Type:', req.body.type);
  console.log('Call ID:', req.body.call_id);
  console.log('Function Name:', req.body.function_name);
  console.log('From Number:', req.body.from_number);
  console.log('Full event:', JSON.stringify(req.body, null, 2));
  
  res.status(200).send('OK - Debug received');
});

// Handle incoming SMS/MMS messages
app.post('/webhook/messaging', async (req, res) => {
  console.log('\n💬 SMS WEBHOOK RECEIVED:');
  console.log('Event Type:', req.body.data?.event_type);
  console.log('From:', req.body.data?.payload?.from);
  console.log('To:', req.body.data?.payload?.to);
  console.log('Text:', req.body.data?.payload?.text);
  console.log('Full payload:', JSON.stringify(req.body, null, 2));
  
  res.status(200).send('OK - Debug received');
});

// Catch all other requests
app.all('*', (req, res) => {
  console.log(`\n❓ UNKNOWN REQUEST: ${req.method} ${req.url}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK - Unknown endpoint');
});

// Start server
app.listen(PORT, () => {
  console.log(`🔍 Debug webhook server running on port ${PORT}`);
  console.log(`📞 Voice webhook: http://localhost:${PORT}/webhook`);
  console.log(`🤖 AI webhook: http://localhost:${PORT}/webhook/ai-events`);
  console.log(`💬 SMS webhook: http://localhost:${PORT}/webhook/messaging`);
  console.log('\n🎯 Call your number now and watch for webhook activity...\n');
});