require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { saveVoiceLead } = require('./db/voice-leads');
const { saveMessage } = require('./db/messaging');

// Test Supabase connectivity
async function testSupabase() {
  console.log('Testing Supabase connection...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set (length: ' + process.env.SUPABASE_ANON_KEY.length + ')' : 'Not set');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    // Test 1: Check if we can query the service_requests_va table
    console.log('\n1. Testing service_requests_va table access...');
    const { data: serviceRequests, error: serviceError } = await supabase
      .from('service_requests_va')
      .select('*')
      .limit(1);

    if (serviceError) {
      console.error('❌ service_requests_va table error:', serviceError);
    } else {
      console.log('✅ service_requests_va table accessible:', serviceRequests);
    }

    // Test 2: Check if we can query the message_history_va table
    console.log('\n2. Testing message_history_va table access...');
    const { data: messages, error: messageError } = await supabase
      .from('message_history_va')
      .select('*')
      .limit(1);

    if (messageError) {
      console.error('❌ message_history_va table error:', messageError);
    } else {
      console.log('✅ message_history_va table accessible:', messages);
    }

    // Test 3: Try to insert a test voice lead using new modular function
    console.log('\n3. Testing voice lead insert with new modular function...');
    const testLead = {
      phone_number: '+12485505061',
      customer_name: 'Test Customer',
      address: 'Test Address, Michigan',
      issue_description: 'Test furnace issue',
      urgency_level: 'routine',
      contact_method: 'voice',
      status: 'pending'
    };

    try {
      const insertData = await saveVoiceLead(testLead);
      console.log('✅ Voice lead insert successful:', insertData);
      
      // Clean up test data
      if (insertData && insertData[0]) {
        const { error: deleteError } = await supabase
          .from('service_requests_va')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('⚠️ Cleanup error (test data remains):', deleteError);
        } else {
          console.log('✅ Test data cleaned up');
        }
      }
    } catch (insertError) {
      console.error('❌ Voice lead insert error:', insertError);
    }

    // Test 4: Test message insert using new modular function
    console.log('\n4. Testing message insert with new modular function...');
    const testMessage = {
      phone_number: '+12485505061',
      direction: 'inbound',
      message_text: 'Test message',
      status: 'received'
    };

    try {
      const msgInsertData = await saveMessage(testMessage);
      console.log('✅ Message insert successful:', msgInsertData);
      
      // Clean up test message
      if (msgInsertData && msgInsertData[0]) {
        await supabase
          .from('message_history_va')
          .delete()
          .eq('id', msgInsertData[0].id);
        console.log('✅ Test message cleaned up');
      }
    } catch (msgInsertError) {
      console.error('❌ Message insert error:', msgInsertError);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSupabase();