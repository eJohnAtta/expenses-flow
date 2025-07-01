-- Update seed data to ensure proper relationships and add more test data

-- First, let's add some additional expense requests for testing
INSERT INTO expense_requests (id, title, amount, category, description, business_justification, status, submitted_by, current_approver, urgency) VALUES
  ('650e8400-e29b-41d4-a716-446655440005', 'Marketing Campaign Materials', 750, 'Marketing & Advertising', 'Print materials and promotional items for Q2 campaign', 'Essential marketing materials to support product launch', 'pending', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'high'),
  ('650e8400-e29b-41d4-a716-446655440006', 'Training Course Registration', 1500, 'Training & Development', 'Professional development course for skill enhancement', 'Investment in employee development and skill building', 'pending', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'medium'),
  ('650e8400-e29b-41d4-a716-446655440007', 'Office Equipment', 320, 'Equipment & Hardware', 'Ergonomic keyboard and mouse for workstation', 'Improve employee comfort and productivity', 'approved', '550e8400-e29b-41d4-a716-446655440006', NULL, 'low'),
  ('650e8400-e29b-41d4-a716-446655440008', 'Client Meeting Expenses', 95, 'Meals & Entertainment', 'Lunch meeting with potential client', 'Business development and relationship building', 'approved', '550e8400-e29b-41d4-a716-446655440004', NULL, 'low')
ON CONFLICT (id) DO NOTHING;

-- Add more approval history entries
INSERT INTO approval_history (expense_request_id, approver_id, action, comment) VALUES
  ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'Approved for employee comfort'),
  ('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'Good for business development')
ON CONFLICT DO NOTHING;

-- Update some existing requests to have proper approval history
UPDATE approval_history SET created_at = '2024-01-10 10:00:00' WHERE expense_request_id = '650e8400-e29b-41d4-a716-446655440003';
UPDATE approval_history SET created_at = '2024-01-09 14:30:00' WHERE expense_request_id = '650e8400-e29b-41d4-a716-446655440004';

-- Ensure all users have proper timestamps
UPDATE users SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Ensure all expense requests have proper timestamps
UPDATE expense_requests SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;
