import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mozamdshnaydbycpbifd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiZmlmZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDkxMTc2OTYsImV4cCI6MjA2NDY5MzY5Nn0.test'

export const supabase = createClient(supabaseUrl, supabaseServiceKey)
