-- Create database tables for expense approval system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user')),
  position VARCHAR(255),
  department VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_levels table
CREATE TABLE IF NOT EXISTS budget_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  min_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(10,2) NOT NULL,
  required_approvers INTEGER NOT NULL DEFAULT 1,
  approver_levels INTEGER[] NOT NULL DEFAULT '{2}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense_requests table
CREATE TABLE IF NOT EXISTS expense_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  urgency VARCHAR(50) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  submitted_by UUID NOT NULL REFERENCES users(id),
  current_approver UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approval_history table
CREATE TABLE IF NOT EXISTS approval_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'pending')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_submitted_by ON expense_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expense_requests_current_approver ON expense_requests(current_approver);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_history_expense_request_id ON approval_history(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_attachments_expense_request_id ON attachments(expense_request_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Only admins can insert users" ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can update users" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for expense_requests table
CREATE POLICY "Users can view their own requests and requests they need to approve" ON expense_requests FOR SELECT USING (
  submitted_by = auth.uid() OR 
  current_approver = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can insert their own expense requests" ON expense_requests FOR INSERT WITH CHECK (
  submitted_by = auth.uid()
);

CREATE POLICY "Approvers and admins can update expense requests" ON expense_requests FOR UPDATE USING (
  current_approver = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for approval_history table
CREATE POLICY "Users can view approval history for their requests or requests they approved" ON approval_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_request_id AND (
      er.submitted_by = auth.uid() OR 
      approver_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Approvers can insert approval history" ON approval_history FOR INSERT WITH CHECK (
  approver_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for attachments table
CREATE POLICY "Users can view attachments for their requests or requests they need to approve" ON attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_request_id AND (
      er.submitted_by = auth.uid() OR 
      er.current_approver = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Users can insert attachments for their own requests" ON attachments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_request_id AND er.submitted_by = auth.uid()
  )
);

-- RLS Policies for budget_levels table
CREATE POLICY "Everyone can view budget levels" ON budget_levels FOR SELECT USING (true);
CREATE POLICY "Only admins can modify budget levels" ON budget_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
