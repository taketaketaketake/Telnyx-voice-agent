const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Call logging will not work.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ============================================================================
// Call Logging Functions
// ============================================================================

/**
 * Start a new call log entry
 * @param {string} telnyxCallId - Telnyx call control ID
 * @param {string} phoneNumber - Caller's phone number
 * @returns {Promise<string>} Call log ID
 */
async function startCallLog(telnyxCallId, phoneNumber) {
  if (!supabase) {
    console.warn('Supabase not available - skipping call log');
    return null;
  }

  try {
    // Insert directly into call_log_va table instead of using stored procedure
    const { data, error } = await supabase
      .from('call_log_va')
      .insert([{
        telnyx_call_id: telnyxCallId,
        phone_number: phoneNumber,
        status: 'initiated',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.warn('Call log insert failed:', error.message);
      return null; // Don't throw error, just log warning
    }

    console.log('📞 Call log started:', telnyxCallId);
    return data?.[0];
  } catch (error) {
    console.warn('Call logging skipped due to error:', error.message);
    return null; // Don't throw error, just return null
  }
}

/**
 * Update call status
 * @param {string} telnyxCallId - Telnyx call control ID
 * @param {string} status - New status (initiated, answered, in_progress, completed, failed, no_answer, busy)
 * @returns {Promise<boolean>} Success status
 */
async function updateCallStatus(telnyxCallId, status) {
  if (!supabase) {
    console.warn('Supabase not available - skipping status update');
    return null;
  }

  try {
    // Update directly in call_log_va table
    const { data, error } = await supabase
      .from('call_log_va')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('telnyx_call_id', telnyxCallId)
      .select();

    if (error) {
      console.warn('Call status update failed:', error.message);
      return null;
    }

    console.log('📞 Call status updated:', telnyxCallId, '→', status);
    return data?.[0];
  } catch (error) {
    console.warn('Call status update skipped:', error.message);
    return null;
  }
}

/**
 * Link call to service request
 * @param {string} telnyxCallId - Telnyx call control ID
 * @param {string} serviceRequestId - Service request UUID
 * @returns {Promise<boolean>} Success status
 */
async function linkCallToServiceRequest(telnyxCallId, serviceRequestId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .rpc('link_call_to_service_request', { 
        p_telnyx_call_id: telnyxCallId, 
        p_service_request_id: serviceRequestId 
      });

    if (error) {
      throw error;
    }

    console.log('🔗 Call linked to service request:', telnyxCallId, '→', serviceRequestId);
    return data;
  } catch (error) {
    console.error('Error linking call to service request:', error);
    throw error;
  }
}

/**
 * Update call transcript and summary
 * @param {string} telnyxCallId - Telnyx call control ID
 * @param {string} transcript - Full conversation transcript
 * @param {string} summary - Optional conversation summary
 * @returns {Promise<boolean>} Success status
 */
async function updateCallTranscript(telnyxCallId, transcript, summary = null) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .rpc('update_call_transcript', { 
        p_telnyx_call_id: telnyxCallId, 
        p_transcript: transcript,
        p_summary: summary 
      });

    if (error) {
      throw error;
    }

    console.log('📝 Call transcript updated:', telnyxCallId);
    return data;
  } catch (error) {
    console.error('Error updating call transcript:', error);
    throw error;
  }
}

/**
 * Get active calls
 * @returns {Promise<Array>} Array of active call records
 */
async function getActiveCalls() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('active_calls_va')
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching active calls:', error);
    throw error;
  }
}

/**
 * Get recent calls summary
 * @param {number} limit - Number of calls to return (default 50)
 * @returns {Promise<Array>} Array of recent call summaries
 */
async function getRecentCalls(limit = 50) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('recent_calls_summary_va')
      .select('*')
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent calls:', error);
    throw error;
  }
}

/**
 * Update call quality metrics
 * @param {string} telnyxCallId - Telnyx call control ID
 * @param {Object} metrics - Quality metrics
 * @param {number} metrics.qualityScore - Call quality score (0.00-5.00)
 * @param {boolean} metrics.droppedConnection - If call was dropped
 * @param {number} metrics.customerSatisfaction - Customer satisfaction (1-5)
 * @param {number} metrics.aiFunctionCalls - Number of AI function calls
 * @param {number} metrics.aiInterruptions - Number of AI interruptions
 * @returns {Promise<boolean>} Success status
 */
async function updateCallMetrics(telnyxCallId, metrics) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const updateData = {};
    
    if (metrics.qualityScore !== undefined) updateData.call_quality_score = metrics.qualityScore;
    if (metrics.droppedConnection !== undefined) updateData.dropped_connection = metrics.droppedConnection;
    if (metrics.customerSatisfaction !== undefined) updateData.customer_satisfaction = metrics.customerSatisfaction;
    if (metrics.aiFunctionCalls !== undefined) updateData.ai_function_calls_count = metrics.aiFunctionCalls;
    if (metrics.aiInterruptions !== undefined) updateData.ai_interruptions_count = metrics.aiInterruptions;

    const { data, error } = await supabase
      .from('call_log_va')
      .update(updateData)
      .eq('telnyx_call_id', telnyxCallId)
      .select();

    if (error) {
      throw error;
    }

    console.log('📊 Call metrics updated:', telnyxCallId);
    return data;
  } catch (error) {
    console.error('Error updating call metrics:', error);
    throw error;
  }
}

module.exports = {
  startCallLog,
  updateCallStatus,
  linkCallToServiceRequest,
  updateCallTranscript,
  getActiveCalls,
  getRecentCalls,
  updateCallMetrics
};