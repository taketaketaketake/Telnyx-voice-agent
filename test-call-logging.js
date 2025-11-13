require('dotenv').config();
const { 
  startCallLog, 
  updateCallStatus, 
  linkCallToServiceRequest,
  updateCallTranscript,
  getActiveCalls,
  getRecentCalls 
} = require('./call-logging');

// Test call logging functionality
async function testCallLogging() {
  console.log('🧪 Testing Call Logging Functions...\n');

  const testCallId = 'test-call-' + Date.now();
  const testPhone = '+12485505061';

  try {
    // Test 1: Start a call log
    console.log('1. Testing startCallLog...');
    const callLogId = await startCallLog(testCallId, testPhone);
    console.log('✅ Call log started with ID:', callLogId);

    // Test 2: Update to answered
    console.log('\n2. Testing updateCallStatus (answered)...');
    await updateCallStatus(testCallId, 'answered');
    console.log('✅ Status updated to answered');

    // Test 3: Update to in_progress
    console.log('\n3. Testing updateCallStatus (in_progress)...');
    await updateCallStatus(testCallId, 'in_progress');
    console.log('✅ Status updated to in_progress');

    // Test 4: Add transcript
    console.log('\n4. Testing updateCallTranscript...');
    const testTranscript = "Customer: Hi, my furnace isn't working.\nCharlotte: I'm sorry to hear that! Let me help you get that fixed. Can you tell me your name and address?";
    const testSummary = "Customer called about furnace not working. Charlotte collected contact information and scheduled service.";
    
    await updateCallTranscript(testCallId, testTranscript, testSummary);
    console.log('✅ Transcript and summary added');

    // Test 5: Complete the call
    console.log('\n5. Testing updateCallStatus (completed)...');
    await updateCallStatus(testCallId, 'completed');
    console.log('✅ Call completed');

    // Test 6: Get active calls (should be empty now)
    console.log('\n6. Testing getActiveCalls...');
    const activeCalls = await getActiveCalls();
    console.log('✅ Active calls:', activeCalls.length, 'calls');

    // Test 7: Get recent calls (should include our test)
    console.log('\n7. Testing getRecentCalls...');
    const recentCalls = await getRecentCalls(5);
    console.log('✅ Recent calls:', recentCalls.length, 'calls');
    
    if (recentCalls.length > 0) {
      const ourCall = recentCalls.find(call => call.telnyx_call_id === testCallId);
      if (ourCall) {
        console.log('   Found our test call:', ourCall.telnyx_call_id);
        console.log('   Status:', ourCall.status);
        console.log('   Duration:', ourCall.call_duration_seconds, 'seconds');
        console.log('   Summary preview:', ourCall.summary_preview);
      }
    }

    console.log('\n🎉 All call logging tests passed!');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { error } = await supabase
      .from('call_log_va')
      .delete()
      .eq('telnyx_call_id', testCallId);
    
    if (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test real-time call tracking view
async function testRealTimeViews() {
  console.log('\n📊 Testing Real-time Call Views...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Test active calls view
    console.log('1. Testing active_calls_va view...');
    const { data: activeCalls, error: activeError } = await supabase
      .from('active_calls_va')
      .select('*');
    
    if (activeError) {
      console.log('❌ Active calls view error:', activeError.message);
    } else {
      console.log('✅ Active calls view working:', activeCalls.length, 'active calls');
    }

    // Test recent calls view  
    console.log('\n2. Testing recent_calls_summary_va view...');
    const { data: recentCalls, error: recentError } = await supabase
      .from('recent_calls_summary_va')
      .select('*')
      .limit(5);
    
    if (recentError) {
      console.log('❌ Recent calls view error:', recentError.message);
    } else {
      console.log('✅ Recent calls view working:', recentCalls.length, 'recent calls');
      
      if (recentCalls.length > 0) {
        console.log('   Sample call:');
        console.log('   - Phone:', recentCalls[0].phone_number);
        console.log('   - Status:', recentCalls[0].status);
        console.log('   - Date:', recentCalls[0].call_initiated_at);
      }
    }

    // Test call quality stats view
    console.log('\n3. Testing call_quality_stats_va view...');
    const { data: qualityStats, error: qualityError } = await supabase
      .from('call_quality_stats_va')
      .select('*')
      .limit(5);
    
    if (qualityError) {
      console.log('❌ Call quality stats view error:', qualityError.message);
    } else {
      console.log('✅ Call quality stats view working:', qualityStats.length, 'days of data');
    }

  } catch (error) {
    console.error('❌ Real-time views test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testCallLogging();
  await testRealTimeViews();
}

runAllTests();