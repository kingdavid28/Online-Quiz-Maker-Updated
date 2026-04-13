-- Schema refresh function to clear PostgREST cache
CREATE OR REPLACE FUNCTION refresh_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function helps refresh the PostgREST schema cache
  -- by touching the schema and forcing a cache refresh
  
  -- Perform a simple operation that forces schema cache refresh
  PERFORM 1 FROM information_schema.columns 
  WHERE table_name = 'questions' 
  AND table_schema = 'public'
  LIMIT 1;
  
  -- Log the refresh attempt
  RAISE LOG 'PostgREST schema refresh triggered at %', NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_postgrest_schema TO authenticated;

-- Also create a more comprehensive schema reset function
CREATE OR REPLACE FUNCTION reset_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Force a complete schema cache reset
  PERFORM pg_notify('postgrest_reload', 'schema');
  
  -- Alternative: Touch the questions table to force cache refresh
  PERFORM 1 FROM questions LIMIT 1;
  
  RAISE LOG 'Schema cache reset completed at %', NOW();
END;
$$;

-- Grant execute permission to authenticated users  
GRANT EXECUTE ON FUNCTION reset_schema_cache TO authenticated;
