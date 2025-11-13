// Database module exports for easy importing
// Usage: const { saveVoiceLead, saveMessage } = require('./db');

const voiceLeads = require('./voice-leads');
const messaging = require('./messaging');
const legacy = require('./legacy');
const { supabase } = require('./client');

module.exports = {
  // Supabase client
  supabase,
  
  // Voice lead functions (main business logic)
  ...voiceLeads,
  
  // SMS/MMS messaging functions
  ...messaging,
  
  // Legacy functions (backward compatibility)
  ...legacy
};