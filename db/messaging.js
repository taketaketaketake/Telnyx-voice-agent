const { supabase } = require('./client');

// ============================================================================
// SMS/MMS Messaging Functions
// ============================================================================

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

    console.log('💬 Message saved to history:', data[0]?.id);
    return data;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Get message history for a phone number
 * @param {string} phoneNumber - Phone number to get history for
 * @param {number} limit - Maximum number of messages to return (default 50)
 * @returns {Promise<Array>} Array of message records
 */
async function getMessageHistory(phoneNumber, limit = 50) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching message history:', error);
    throw error;
  }
}

/**
 * Get conversation thread (alternating inbound/outbound messages)
 * @param {string} phoneNumber - Phone number to get conversation for
 * @param {number} limit - Maximum number of messages (default 20)
 * @returns {Promise<Array>} Array of messages in chronological order
 */
async function getConversationThread(phoneNumber, limit = 20) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: true }) // Chronological order for conversation
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching conversation thread:', error);
    throw error;
  }
}

/**
 * Get recent SMS leads (inbound messages that might be leads)
 * @param {number} hours - Hours to look back (default 24)
 * @returns {Promise<Array>} Array of recent inbound messages
 */
async function getRecentSmsLeads(hours = 24) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent SMS leads:', error);
    throw error;
  }
}

/**
 * Update message status (for delivery tracking)
 * @param {string} telnyxMessageId - Telnyx message ID
 * @param {string} status - New status (sent, delivered, failed)
 * @returns {Promise<Object>} Updated message data
 */
async function updateMessageStatus(telnyxMessageId, status) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .update({ status: status })
      .eq('telnyx_message_id', telnyxMessageId)
      .select();

    if (error) {
      throw error;
    }

    console.log('📱 Message status updated:', telnyxMessageId, '→', status);
    return data;
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
}

/**
 * Link message to voice lead (when SMS follows up on voice call)
 * @param {string} messageId - Message ID
 * @param {string} voiceLeadId - Voice lead ID to link to
 * @returns {Promise<Object>} Updated message data
 */
async function linkMessageToVoiceLead(messageId, voiceLeadId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('message_history_va')
      .update({ service_request_id: voiceLeadId })
      .eq('id', messageId)
      .select();

    if (error) {
      throw error;
    }

    console.log('🔗 Message linked to voice lead:', messageId, '→', voiceLeadId);
    return data;
  } catch (error) {
    console.error('Error linking message to voice lead:', error);
    throw error;
  }
}

module.exports = {
  saveMessage,
  getMessageHistory,
  getConversationThread,
  getRecentSmsLeads,
  updateMessageStatus,
  linkMessageToVoiceLead
};