import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaXdoc2NicXZhZG5scXJ1aGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDMxOTUsImV4cCI6MjEwNDg3OTE5NX0.gpJdd9rzjeck9qED6A2sV7uHp4jpC8BvmJ94MPeqE9c";

  return createBrowserClient(supabaseUrl, supabaseKey);
}
