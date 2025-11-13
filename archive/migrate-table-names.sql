-- Migration script to rename tables for voice agent (VA) project
-- Run this in your Supabase SQL Editor

-- 1. Rename tables with _va suffix
ALTER TABLE service_requests RENAME TO service_requests_va;
ALTER TABLE message_history RENAME TO message_history_va;

-- 2. Update views to use new table names
DROP VIEW IF EXISTS pending_requests;
CREATE OR REPLACE VIEW pending_requests_va AS
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
FROM service_requests_va
WHERE status = 'pending'
ORDER BY priority_order ASC, created_at ASC;

DROP VIEW IF EXISTS emergency_requests;
CREATE OR REPLACE VIEW emergency_requests_va AS
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
FROM service_requests_va
WHERE urgency_level = 'emergency'
  AND status IN ('pending', 'scheduled')
ORDER BY created_at ASC;

DROP VIEW IF EXISTS todays_appointments;
CREATE OR REPLACE VIEW todays_appointments_va AS
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
FROM service_requests_va
WHERE scheduled_time::DATE = CURRENT_DATE
  AND status = 'scheduled'
ORDER BY scheduled_time ASC;

-- 3. Update functions to use new table names
DROP FUNCTION IF EXISTS get_customer_history(VARCHAR);
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
  FROM service_requests_va sr
  WHERE sr.phone_number = caller_phone
  ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS is_repeat_customer(VARCHAR);
CREATE OR REPLACE FUNCTION is_repeat_customer(caller_phone VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM service_requests_va
    WHERE phone_number = caller_phone
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_service_stats();
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
  FROM service_requests_va
  WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 4. Update foreign key reference in message_history_va
ALTER TABLE message_history_va 
DROP CONSTRAINT IF EXISTS message_history_service_request_id_fkey;

ALTER TABLE message_history_va 
ADD CONSTRAINT message_history_va_service_request_id_fkey 
FOREIGN KEY (service_request_id) REFERENCES service_requests_va(id) ON DELETE SET NULL;

-- 5. Grant permissions to views and functions
GRANT SELECT ON pending_requests_va TO anon, authenticated, service_role;
GRANT SELECT ON emergency_requests_va TO anon, authenticated, service_role;
GRANT SELECT ON todays_appointments_va TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_customer_history TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_repeat_customer TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_service_stats TO anon, authenticated, service_role;

-- 6. Update table comments
COMMENT ON TABLE service_requests_va IS 'Voice Agent: Furnace service requests collected by Charlotte AI assistant';
COMMENT ON TABLE message_history_va IS 'Voice Agent: SMS/MMS conversation history with customers';

-- Migration complete!
-- Your tables are now renamed with _va suffix to distinguish from other project tables