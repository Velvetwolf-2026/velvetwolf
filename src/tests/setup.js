import "@testing-library/jest-dom";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-12345";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-supabase-role-key";
