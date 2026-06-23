import { supabaseAdmin } from "./backend/lambda/src/config/supabase.js";

async function run() {
  console.log("Checking if users table has personality_type column...");
  const { data, error } = await supabaseAdmin.from("users").select("personality_type").limit(1);
  if (error) {
    console.error("users.personality_type check failed:", error);
  } else {
    console.log("users.personality_type column exists!");
  }

  console.log("Checking if user_style_profiles table exists...");
  const { data: data2, error: error2 } = await supabaseAdmin.from("user_style_profiles").select("*").limit(1);
  if (error2) {
    console.error("user_style_profiles check failed:", error2);
  } else {
    console.log("user_style_profiles table exists!");
  }
}
run();
