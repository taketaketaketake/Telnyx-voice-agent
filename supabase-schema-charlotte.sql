-- Enhanced Supabase Database Schema for Charlotte - Fix My Furnace
-- Run this SQL in your Supabase SQL Editor to create/update tables for furnace service requests

-- Create enhanced service_requests table for Charlotte
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Customer Information
  phone_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  email VARCHAR(255),

  -- Service Address
  address TEXT NOT NULL,
  home_size VARCHAR(100),  -- e.g., "2000 sq ft", "two-story", "small ranch"

  -- Service Details
  issue_description TEXT NOT NULL,
  urgency_level VARCHAR(20) CHECK (urgency_level IN ('emergency', 'urgent', 'routine')),
  last_service_date VARCHAR(100),  -- Approximate is fine
  preferred_time VARCHAR(50),  -- morning, afternoon, evening
  additional_notes TEXT,

  -- Call/Message Metadata
  contact_method VARCHAR(10) CHECK (contact_method IN ('voice', 'sms', 'mms')),
  call_start TIMESTAMPTZ,
  call_end TIMESTAMPTZ,
  call_duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (call_end - call_start))::INTEGER
  ) STORED,

  -- Status Tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  assigned_tech VARCHAR(255),
  scheduled_time TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep the old caller_info table for backward compatibility (optional)
-- You can migrate data from caller_info to service_requests if needed

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_phone ON service_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_urgency ON service_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_service_requests_scheduled ON service_requests(scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Enable all access for service role"
  ON service_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for anon users"
  ON service_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create view for emergency requests
CREATE OR REPLACE VIEW emergency_requests AS
SELECT
  id,
  phone_number,
  customer_name,
  address,
  issue_description,
  urgency_level,
  contact_method,
  status,
  created_at
FROM service_requests
WHERE urgency_level = 'emergency'
  AND status IN ('pending', 'scheduled')
ORDER BY created_at ASC;

GRANT SELECT ON emergency_requests TO anon, authenticated, service_role;

-- Create view for today's scheduled appointments
CREATE OR REPLACE VIEW todays_appointments AS
SELECT
  id,
  phone_number,
  customer_name,
  address,
  issue_description,
  scheduled_time,
  assigned_tech,
  status,
  urgency_level
FROM service_requests
WHERE scheduled_time::DATE = CURRENT_DATE
  AND status = 'scheduled'
ORDER BY scheduled_time ASC;

GRANT SELECT ON todays_appointments TO anon, authenticated, service_role;

-- Create view for pending requests needing attention
CREATE OR REPLACE VIEW pending_requests AS
SELECT
  id,
  phone_number,
  customer_name,
  address,
  issue_description,
  urgency_level,
  preferred_time,
  contact_method,
  created_at,
  CASE
    WHEN urgency_level = 'emergency' THEN 1
    WHEN urgency_level = 'urgent' THEN 2
    ELSE 3
  END as priority_order
FROM service_requests
WHERE status = 'pending'
ORDER BY priority_order ASC, created_at ASC;

GRANT SELECT ON pending_requests TO anon, authenticated, service_role;

-- Function to get customer history by phone number
CREATE OR REPLACE FUNCTION get_customer_history(caller_phone VARCHAR)
RETURNS TABLE (
  id UUID,
  customer_name VARCHAR,
  address TEXT,
  issue_description TEXT,
  urgency_level VARCHAR,
  status VARCHAR,
  contact_method VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.customer_name,
    sr.address,
    sr.issue_description,
    sr.urgency_level,
    sr.status,
    sr.contact_method,
    sr.created_at
  FROM service_requests sr
  WHERE sr.phone_number = caller_phone
  ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_customer_history TO anon, authenticated, service_role;

-- Function to check for repeat customers (helps Charlotte personalize)
CREATE OR REPLACE FUNCTION is_repeat_customer(caller_phone VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM service_requests
    WHERE phone_number = caller_phone
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION is_repeat_customer TO anon, authenticated, service_role;

-- Function to get service request statistics
CREATE OR REPLACE FUNCTION get_service_stats()
RETURNS TABLE (
  total_requests BIGINT,
  pending_count BIGINT,
  scheduled_count BIGINT,
  emergency_count BIGINT,
  avg_response_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
    COUNT(*) FILTER (WHERE urgency_level = 'emergency') as emergency_count,
    AVG(
      EXTRACT(EPOCH FROM (scheduled_time - created_at)) / 3600
    )::NUMERIC(10,2) as avg_response_time_hours
  FROM service_requests
  WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_service_stats TO anon, authenticated, service_role;

-- Create table for SMS/MMS conversation history
CREATE TABLE IF NOT EXISTS message_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  media_urls TEXT[],  -- Array of media URLs for MMS
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  telnyx_message_id VARCHAR(255),
  status VARCHAR(20),  -- sent, delivered, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_history_phone ON message_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_message_history_created_at ON message_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_history_service_request ON message_history(service_request_id);

ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for service role on messages"
  ON message_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users on messages"
  ON message_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for anon users on messages"
  ON message_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE service_requests IS 'Furnace service requests collected by Charlotte AI assistant';
COMMENT ON COLUMN service_requests.urgency_level IS 'emergency: immediate attention needed, urgent: within 24 hours, routine: scheduled maintenance';
COMMENT ON COLUMN service_requests.contact_method IS 'How the customer contacted us: voice call, SMS, or MMS';
COMMENT ON TABLE message_history IS 'SMS/MMS conversation history with customers';

-- Migration query (optional - run this to migrate from old caller_info table)
-- INSERT INTO service_requests (
--   phone_number, customer_name, email, issue_description,
--   additional_notes, call_start, call_end, contact_method, created_at
-- )
-- SELECT
--   phone_number, name, email, reason,
--   notes, call_start, call_end, 'voice', created_at
-- FROM caller_info
-- WHERE id NOT IN (SELECT id FROM service_requests);
