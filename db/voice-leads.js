const { supabase } = require('./client');

// ============================================================================
// Voice Lead Capture Functions
// ============================================================================

/**
 * Save voice lead from Charlotte's call
 * @param {Object} voiceLead - Lead information collected during voice call
 * @returns {Promise<Object>} Result of the database operation
 */
async function saveVoiceLead(voiceLead) {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  try {
    const { data, error } = await supabase
      .from('service_requests_va') // TODO: rename table to voice_leads_va
      .insert([
        {
          phone_number: voiceLead.phone_number,
          customer_name: voiceLead.customer_name || null,
          email: voiceLead.email || null,
          address: voiceLead.address || null,
          home_size: voiceLead.home_size || null,
          issue_description: voiceLead.issue_description || null,
          urgency_level: voiceLead.urgency_level || 'routine',
          last_service_date: voiceLead.last_service_date || null,
          preferred_time: voiceLead.preferred_time || null,
          additional_notes: voiceLead.additional_notes || null,
          contact_method: voiceLead.contact_method || 'voice',
          call_start: voiceLead.call_start || null,
          call_end: voiceLead.call_end || null,
          status: voiceLead.status || 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error saving voice lead:', error);
      throw error;
    }

    console.log('✅ Voice lead saved to database:', data);
    return data;
  } catch (error) {
    console.error('Error saving voice lead:', error);
    throw error;
  }
}

/**
 * Get all pending voice leads
 * @returns {Promise<Array>} Array of pending voice leads
 */
async function getPendingVoiceLeads() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('pending_requests_va') // View of pending leads
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching pending voice leads:', error);
    throw error;
  }
}

/**
 * Get customer history by phone number
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of voice lead records for this customer
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

/**
 * Get voice leads by phone number
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of voice leads for this phone number
 */
async function getVoiceLeadsByPhone(phoneNumber) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('service_requests_va')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching voice leads by phone:', error);
    throw error;
  }
}

/**
 * Update voice lead status
 * @param {string} leadId - Voice lead ID
 * @param {string} status - New status (pending, contacted, qualified, closed)
 * @returns {Promise<Object>} Updated lead data
 */
async function updateVoiceLeadStatus(leadId, status) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('service_requests_va')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select();

    if (error) {
      throw error;
    }

    console.log('📝 Voice lead status updated:', leadId, '→', status);
    return data;
  } catch (error) {
    console.error('Error updating voice lead status:', error);
    throw error;
  }
}

module.exports = {
  saveVoiceLead,
  getPendingVoiceLeads,
  getCustomerHistory,
  isRepeatCustomer,
  getVoiceLeadsByPhone,
  updateVoiceLeadStatus
};