import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const mockSupabase = {
  from: (table) => ({
    select: (cols = '*') => ({
      order: (field, { ascending } = {}) => ({
        eq: (filterField, filterValue) => ({
          single: () => {
            if (table === 'stories_public') {
              // Mock for story slug lookup
              return Promise.resolve({ data: null }) // No stories in demo
            }
            if (table === 'profiles') {
              // Mock for profile fetch
              return Promise.resolve({ data: { id: 'demo-user', full_name: 'Demo User', email: 'demo@example.com', role: 'reader' } })
            }
            return Promise.resolve({ data: null })
          }
        }),
        // For list mode fetchStories - no eq, directly after order
        single: () => Promise.resolve({ data: null }),
      }),
      eq: (field, val) => ({
        single: () => {
          if (table === 'stories_public' && field === 'slug') {
            return Promise.resolve({ data: null }) // Story not found in demo
          }
          return Promise.resolve({ data: null })
        }
      }),
      // Direct select without order for some queries
      // Return query builder for chaining flexibility
      order: (field, { ascending } = {}) => ({
        // Supports order after select
        eq: (filterField, filterValue) => ({
          single: () => Promise.resolve({ data: null })
        }),
        single: () => Promise.resolve({ data: null })
      })
    }),
    insert: (data) => {
      // Mock insert for story_views etc.
      console.log('Demo: Insert mocked:', data)
      return Promise.resolve({ data: [{ id: 1, ...data }] })
    }
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    signInWithPassword: ({ email, password }) => Promise.resolve({ error: { message: 'Demo mode: Configure .env with real Supabase URL/key for login.' } }),
    signUp: (data) => Promise.resolve({ error: { message: 'Demo mode: Configure .env with real Supabase URL/key for register.' } }),
    signOut: () => Promise.resolve({}),
    onAuthStateChange: (cb) => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
};

let supabase;
if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
  console.warn('Demo mode: Invalid/missing Supabase env vars. Using mock client. Edit .env and refresh.');
  supabase = mockSupabase;
} else {
  console.log('Supabase client initialized with real env vars.');
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

