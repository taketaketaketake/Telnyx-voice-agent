const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Database features will not work.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Save caller information to Supabase
 * @param {Object} callerInfo - Information collected from the caller
 * @returns {Promise<Object>} Result of the database operation
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

    console.log('Successfully saved to Supabase:', data);
    return data;
  } catch (error) {
    console.error('Error saving caller info:', error);
    throw error;
  }
}

/**
 * Get all caller information from Supabase
 * @returns {Promise<Array>} Array of caller info records
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
 * Get caller info by phone number
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of caller info records
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
  supabase,
  saveCallerInfo,
  getAllCallerInfo,
  getCallerInfoByPhone
};
