-- Add call_log_va table to track phone call lifecycle
-- Run this in your Supabase SQL Editor

-- Create call_log_va table
CREATE TABLE IF NOT EXISTS call_log_va (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Call Identification
  telnyx_call_id VARCHAR(255) UNIQUE NOT NULL,  -- Telnyx call control ID
  phone_number VARCHAR(20) NOT NULL,            -- Caller's phone number
  
  -- Call Lifecycle
  status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN (
    'initiated',     -- Call started
    'answered',      -- Call answered
    'in_progress',   -- Conversation happening
    'completed',     -- Call ended successfully
    'failed',        -- Call failed/dropped
    'no_answer',     -- Call not answered
    'busy'          -- Line busy
  )),
  
  -- Call Timing
  call_initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  call_answered_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  call_duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (call_ended_at - call_answered_at))::INTEGER
  ) STORED,
  total_call_duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (call_ended_at - call_initiated_at))::INTEGER
  ) STORED,
  
  -- Call Content
  transcript TEXT,                               -- Full conversation transcript
  conversation_summary TEXT,                     -- AI-generated summary
  
  -- Call Quality & Metadata
  call_quality_score DECIMAL(3,2),              -- 0.00 to 5.00 rating
  dropped_connection BOOLEAN DEFAULT FALSE,      -- If call was dropped
  telnyx_hangup_cause VARCHAR(100),             -- Telnyx hangup reason
  
  -- Business Links
  service_request_id UUID REFERENCES service_requests_va(id) ON DELETE SET NULL,
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
  
  -- AI Assistant Data
  ai_assistant_used BOOLEAN DEFAULT TRUE,
  ai_function_calls_count INTEGER DEFAULT 0,
  ai_interruptions_count INTEGER DEFAULT 0,     -- How many times customer interrupted AI
  
  -- Recording & Compliance
  recording_url TEXT,                           -- Telnyx recording URL if enabled
  consent_recorded BOOLEAN DEFAULT FALSE,       -- If customer gave recording consent
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_log_va_telnyx_id ON call_log_va(telnyx_call_id);
CREATE INDEX IF NOT EXISTS idx_call_log_va_phone ON call_log_va(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_log_va_status ON call_log_va(status);
CREATE INDEX IF NOT EXISTS idx_call_log_va_initiated_at ON call_log_va(call_initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_log_va_service_request ON call_log_va(service_request_id);
CREATE INDEX IF NOT EXISTS idx_call_log_va_duration ON call_log_va(call_duration_seconds) WHERE call_duration_seconds IS NOT NULL;

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_call_log_va_updated_at
  BEFORE UPDATE ON call_log_va
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE call_log_va ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Enable all access for service role on call_log_va"
  ON call_log_va
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users on call_log_va"
  ON call_log_va
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert/update access for anon users on call_log_va"
  ON call_log_va
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create useful views for call analytics

-- Active calls view
CREATE OR REPLACE VIEW active_calls_va AS
SELECT
  id,
  telnyx_call_id,
  phone_number,
  status,
  call_initiated_at,
  call_answered_at,
  EXTRACT(EPOCH FROM (NOW() - call_answered_at))::INTEGER as current_duration_seconds
FROM call_log_va
WHERE status IN ('answered', 'in_progress')
ORDER BY call_initiated_at ASC;

-- Recent calls summary
CREATE OR REPLACE VIEW recent_calls_summary_va AS
SELECT
  id,
  telnyx_call_id,
  phone_number,
  status,
  call_initiated_at,
  call_duration_seconds,
  total_call_duration_seconds,
  LEFT(conversation_summary, 100) as summary_preview,
  service_request_id,
  customer_satisfaction
FROM call_log_va
WHERE call_initiated_at >= NOW() - INTERVAL '7 days'
ORDER BY call_initiated_at DESC;

-- Call quality analytics
CREATE OR REPLACE VIEW call_quality_stats_va AS
SELECT
  DATE(call_initiated_at) as call_date,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
  COUNT(*) FILTER (WHERE dropped_connection = true) as dropped_calls,
  AVG(call_duration_seconds) as avg_duration_seconds,
  AVG(call_quality_score) as avg_quality_score,
  AVG(customer_satisfaction) as avg_satisfaction
FROM call_log_va
WHERE call_initiated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(call_initiated_at)
ORDER BY call_date DESC;

-- Grant access to views
GRANT SELECT ON active_calls_va TO anon, authenticated, service_role;
GRANT SELECT ON recent_calls_summary_va TO anon, authenticated, service_role;
GRANT SELECT ON call_quality_stats_va TO anon, authenticated, service_role;

-- Helper functions for call management

-- Function to start a new call log entry
CREATE OR REPLACE FUNCTION start_call_log(
  p_telnyx_call_id VARCHAR,
  p_phone_number VARCHAR
)
RETURNS UUID AS $$
DECLARE
  call_log_id UUID;
BEGIN
  INSERT INTO call_log_va (telnyx_call_id, phone_number, status)
  VALUES (p_telnyx_call_id, p_phone_number, 'initiated')
  RETURNING id INTO call_log_id;
  
  RETURN call_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update call status
CREATE OR REPLACE FUNCTION update_call_status(
  p_telnyx_call_id VARCHAR,
  p_status VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  update_data JSONB := '{}';
BEGIN
  -- Set the appropriate timestamp based on status
  IF p_status = 'answered' THEN
    update_data = update_data || jsonb_build_object('call_answered_at', NOW());
  ELSIF p_status IN ('completed', 'failed', 'no_answer', 'busy') THEN
    update_data = update_data || jsonb_build_object('call_ended_at', NOW());
  END IF;
  
  -- Update the call log
  UPDATE call_log_va
  SET 
    status = p_status,
    call_answered_at = COALESCE(call_answered_at, (update_data->>'call_answered_at')::TIMESTAMPTZ),
    call_ended_at = COALESCE(call_ended_at, (update_data->>'call_ended_at')::TIMESTAMPTZ)
  WHERE telnyx_call_id = p_telnyx_call_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to link call to service request
CREATE OR REPLACE FUNCTION link_call_to_service_request(
  p_telnyx_call_id VARCHAR,
  p_service_request_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE call_log_va
  SET service_request_id = p_service_request_id
  WHERE telnyx_call_id = p_telnyx_call_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to add transcript and summary
CREATE OR REPLACE FUNCTION update_call_transcript(
  p_telnyx_call_id VARCHAR,
  p_transcript TEXT,
  p_summary TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE call_log_va
  SET 
    transcript = p_transcript,
    conversation_summary = COALESCE(p_summary, conversation_summary)
  WHERE telnyx_call_id = p_telnyx_call_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant execution rights to functions
GRANT EXECUTE ON FUNCTION start_call_log TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_call_status TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION link_call_to_service_request TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_call_transcript TO anon, authenticated, service_role;

-- Add helpful comments
COMMENT ON TABLE call_log_va IS 'Voice Agent: Tracks complete phone call lifecycle with status, transcripts, and analytics';
COMMENT ON COLUMN call_log_va.status IS 'Call status: initiated -> answered -> in_progress -> completed/failed/no_answer/busy';
COMMENT ON COLUMN call_log_va.transcript IS 'Full conversation transcript from Charlotte AI';
COMMENT ON COLUMN call_log_va.conversation_summary IS 'AI-generated summary of the call';
COMMENT ON COLUMN call_log_va.call_quality_score IS 'Call quality rating 0.00-5.00 based on audio quality, interruptions, etc.';
COMMENT ON COLUMN call_log_va.ai_function_calls_count IS 'Number of times Charlotte called functions during this call';

-- Example usage after running this script:
/*
-- Start a call
SELECT start_call_log('call_12345', '+18334948669');

-- Update to answered
SELECT update_call_status('call_12345', 'answered');

-- Update to in progress  
SELECT update_call_status('call_12345', 'in_progress');

-- Link to service request when Charlotte saves data
SELECT link_call_to_service_request('call_12345', 'service-request-uuid');

-- Add transcript when call completes
SELECT update_call_transcript('call_12345', 'Full transcript here...', 'Customer called about furnace repair');

-- Complete the call
SELECT update_call_status('call_12345', 'completed');
*/