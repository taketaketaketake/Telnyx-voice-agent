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

// ============================================================================
// Charlotte-specific service request functions
// ============================================================================

/**
 * Save furnace service request (Charlotte)
 * @param {Object} serviceRequest - Service request information
 * @returns {Promise<Object>} Result of the database operation
 */
async function saveServiceRequest(serviceRequest) {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  try {
    const { data, error } = await supabase
      .from('service_requests_va')
      .insert([
        {
          phone_number: serviceRequest.phone_number,
          customer_name: serviceRequest.customer_name || null,
          email: serviceRequest.email || null,
          address: serviceRequest.address || null,
          home_size: serviceRequest.home_size || null,
          issue_description: serviceRequest.issue_description || null,
          urgency_level: serviceRequest.urgency_level || 'routine',
          last_service_date: serviceRequest.last_service_date || null,
          preferred_time: serviceRequest.preferred_time || null,
          additional_notes: serviceRequest.additional_notes || null,
          contact_method: serviceRequest.contact_method || 'voice',
          call_start: serviceRequest.call_start || null,
          call_end: serviceRequest.call_end || null,
          status: serviceRequest.status || 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error saving service request:', error);
      throw error;
    }

    console.log('Successfully saved service request to Supabase:', data);
    return data;
  } catch (error) {
    console.error('Error saving service request:', error);
    throw error;
  }
}

/**
 * Save SMS/MMS message to history
 * @param {Object} messageInfo - Message information
 * @returns {Promise<Object>} Result of the database operation
 */
async function saveMessage(messageInfo) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .insert([
        {
          phone_number: messageInfo.phone_number,
          direction: messageInfo.direction, // 'inbound' or 'outbound'
          message_text: messageInfo.message_text || null,
          media_urls: messageInfo.media_urls || null,
          service_request_id: messageInfo.service_request_id || null,
          telnyx_message_id: messageInfo.telnyx_message_id || null,
          status: messageInfo.status || 'sent',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error saving message:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Get all pending service requests
 * @returns {Promise<Array>} Array of pending service requests
 */
async function getPendingRequests() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('pending_requests_va')
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }
}

/**
 * Get customer history by phone number
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of service request records
 */
async function getCustomerHistory(phoneNumber) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .rpc('get_customer_history', { caller_phone: phoneNumber });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching customer history:', error);
    throw error;
  }
}

/**
 * Check if customer is a repeat customer
 * @param {string} phoneNumber - Phone number to check
 * @returns {Promise<boolean>} True if repeat customer
 */
async function isRepeatCustomer(phoneNumber) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .rpc('is_repeat_customer', { caller_phone: phoneNumber });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error checking repeat customer:', error);
    return false;
  }
}

module.exports = {
  supabase,
  saveCallerInfo,
  getAllCallerInfo,
  getCallerInfoByPhone,
  // Charlotte-specific functions
  saveServiceRequest,
  saveMessage,
  getPendingRequests,
  getCustomerHistory,
  isRepeatCustomer
};
