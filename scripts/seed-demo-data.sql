-- Insert demo users
INSERT INTO users (id, email, name, role, position, department, level) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', 'System Admin', 'admin', 'System Administrator', 'IT', 1),
  ('550e8400-e29b-41d4-a716-446655440002', 'ahmed@company.com', 'Ahmed Director', 'user', 'Director', 'Executive', 1),
  ('550e8400-e29b-41d4-a716-446655440003', 'samuel@company.com', 'Samuel Manager', 'user', 'Manager', 'Operations', 2),
  ('550e8400-e29b-41d4-a716-446655440004', 'john@company.com', 'John Doe', 'user', 'Employee', 'Operations', 3),
  ('550e8400-e29b-41d4-a716-446655440005', 'jane@company.com', 'Jane Smith', 'user', 'Senior Employee', 'Operations', 3),
  ('550e8400-e29b-41d4-a716-446655440006', 'mike@company.com', 'Mike Johnson', 'user', 'Employee', 'Operations', 3)
ON CONFLICT (email) DO NOTHING;

-- Update manager relationships
UPDATE users SET manager_id = '550e8400-e29b-41d4-a716-446655440002' WHERE email = 'samuel@company.com';
UPDATE users SET manager_id = '550e8400-e29b-41d4-a716-446655440003' WHERE email IN ('john@company.com', 'jane@company.com', 'mike@company.com');

-- Insert budget levels
INSERT INTO budget_levels (name, min_amount, max_amount, required_approvers, approver_levels, description) VALUES
  ('Small Expenses', 0, 999, 1, '{2}', 'Small day-to-day expenses requiring single manager approval'),
  ('Medium Expenses', 1000, 4999, 2, '{2,1}', 'Medium expenses requiring manager and director approval'),
  ('Large Expenses', 5000, 19999, 3, '{2,1}', 'Large expenses requiring multiple levels of approval'),
  ('Major Expenses', 20000, 999999, 3, '{2,1}', 'Major expenses requiring executive approval')
ON CONFLICT DO NOTHING;

-- Insert sample expense requests
INSERT INTO expense_requests (id, title, amount, category, description, business_justification, status, submitted_by, current_approver) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Office Supplies for Q1', 450, 'Office Supplies', 'Stationery, printer paper, and office equipment for the first quarter', 'Essential supplies needed to maintain office operations and productivity', 'pending', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003'),
  ('650e8400-e29b-41d4-a716-446655440002', 'Software License Renewal', 2500, 'Software & Licenses', 'Annual renewal for project management software used by the development team', 'Critical software for project tracking and team collaboration', 'pending', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002'),
  ('650e8400-e29b-41d4-a716-446655440003', 'Team Lunch', 180, 'Meals & Entertainment', 'Monthly team lunch for operations department', 'Team building and morale improvement', 'approved', '550e8400-e29b-41d4-a716-446655440006', NULL),
  ('650e8400-e29b-41d4-a716-446655440004', 'Conference Ticket', 800, 'Training & Development', 'Annual tech conference registration', 'Professional development and networking', 'rejected', '550e8400-e29b-41d4-a716-446655440004', NULL)
ON CONFLICT DO NOTHING;

-- Insert approval history
INSERT INTO approval_history (expense_request_id, approver_id, action, comment) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'pending', NULL),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'Approved for team building'),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'rejected', 'Please provide more detailed business justification')
ON CONFLICT DO NOTHING;
