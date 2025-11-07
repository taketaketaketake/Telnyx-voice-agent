-- Supabase Database Schema for Voice Agent Caller Information
-- Run this SQL in your Supabase SQL Editor to create the necessary table

-- Create the caller_info table
CREATE TABLE IF NOT EXISTS caller_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  reason TEXT,
  notes TEXT,
  call_timestamp TIMESTAMPTZ,
  call_start TIMESTAMPTZ,
  call_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_caller_info_phone ON caller_info(phone_number);

-- Create an index on created_at for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_caller_info_created_at ON caller_info(created_at DESC);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_caller_info_updated_at
  BEFORE UPDATE ON caller_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE caller_info ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow service role to do everything
CREATE POLICY "Enable all access for service role"
  ON caller_info
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a policy to allow authenticated users to read all records
CREATE POLICY "Enable read access for authenticated users"
  ON caller_info
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a policy to allow anon users to insert (for the webhook)
CREATE POLICY "Enable insert access for anon users"
  ON caller_info
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Optional: Create a view for easy querying of recent calls
CREATE OR REPLACE VIEW recent_calls AS
SELECT
  id,
  phone_number,
  name,
  email,
  reason,
  LEFT(notes, 100) AS notes_preview,
  call_timestamp,
  call_start,
  call_end,
  EXTRACT(EPOCH FROM (call_end - call_start)) AS call_duration_seconds,
  created_at
FROM caller_info
ORDER BY created_at DESC
LIMIT 100;

-- Grant access to the view
GRANT SELECT ON recent_calls TO anon, authenticated, service_role;

-- Optional: Create a function to get caller history
CREATE OR REPLACE FUNCTION get_caller_history(caller_phone VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  reason TEXT,
  call_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.reason,
    c.call_timestamp,
    c.created_at
  FROM caller_info c
  WHERE c.phone_number = caller_phone
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION get_caller_history TO anon, authenticated, service_role;

COMMENT ON TABLE caller_info IS 'Stores information collected from voice agent calls';
COMMENT ON COLUMN caller_info.phone_number IS 'Caller phone number in E.164 format';
COMMENT ON COLUMN caller_info.name IS 'Full name provided by caller';
COMMENT ON COLUMN caller_info.email IS 'Email address provided by caller';
COMMENT ON COLUMN caller_info.reason IS 'Reason for calling or help needed';
COMMENT ON COLUMN caller_info.notes IS 'Additional notes from the conversation';
COMMENT ON COLUMN caller_info.call_timestamp IS 'Timestamp when the call occurred';
COMMENT ON COLUMN caller_info.call_start IS 'When the call started';
COMMENT ON COLUMN caller_info.call_end IS 'When the call ended';
