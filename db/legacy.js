const { supabase } = require('./client');

// ============================================================================
// Legacy Functions (Backward Compatibility)
// ============================================================================
// These functions support the old caller_info table structure
// Consider migrating to voice-leads.js functions for new features

/**
 * Save caller information to legacy caller_info table
 * @param {Object} callerInfo - Information collected from the caller
 * @returns {Promise<Object>} Result of the database operation
 * @deprecated Use saveVoiceLead() from voice-leads.js instead
 */
async function saveCallerInfo(callerInfo) {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  try {
    const { data, error } = await supabase
      .from('caller_info')
      .insert([
        {
          phone_number: callerInfo.phone_number,
          name: callerInfo.name || null,
          email: callerInfo.email || null,
          reason: callerInfo.reason || null,
          notes: callerInfo.notes || null,
          call_timestamp: callerInfo.call_timestamp || new Date().toISOString(),
          call_start: callerInfo.call_start || null,
          call_end: callerInfo.call_end || null,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully saved to legacy caller_info table:', data);
    return data;
  } catch (error) {
    console.error('Error saving caller info:', error);
    throw error;
  }
}

/**
 * Get all caller information from legacy table
 * @returns {Promise<Array>} Array of caller info records
 * @deprecated Use voice-leads functions instead
 */
async function getAllCallerInfo() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('caller_info')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching caller info:', error);
    throw error;
  }
}

/**
 * Get caller info by phone number from legacy table
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of caller info records
 * @deprecated Use getVoiceLeadsByPhone() from voice-leads.js instead
 */
async function getCallerInfoByPhone(phoneNumber) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('caller_info')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching caller info by phone:', error);
    throw error;
  }
}

module.exports = {
  saveCallerInfo,
  getAllCallerInfo,
  getCallerInfoByPhone
};