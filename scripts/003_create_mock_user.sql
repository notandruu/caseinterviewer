-- Create mock user profile and stats for demo mode
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@caseprep.ai',
  'Demo User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_stats (user_id, total_interviews, completed_interviews, average_score, current_streak, longest_streak, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0,
  0,
  0,
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;
