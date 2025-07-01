import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  position?: string
  department?: string
  manager_id?: string
  level: number
  created_at: string
  updated_at: string
}

export interface BudgetLevel {
  id: string
  name: string
  min_amount: number
  max_amount: number
  required_approvers: number
  approver_levels: number[]
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ExpenseRequest {
  id: string
  title: string
  amount: number
  category: string
  description: string
  business_justification: string
  status: "pending" | "approved" | "rejected"
  urgency: "low" | "medium" | "high"
  submitted_by: string
  current_approver?: string
  created_at: string
  updated_at: string
}

export interface ApprovalHistory {
  id: string
  expense_request_id: string
  approver_id: string
  action: "approved" | "rejected" | "pending"
  comment?: string
  created_at: string
}

export interface Attachment {
  id: string
  expense_request_id: string
  filename: string
  file_path: string
  file_size?: number
  mime_type?: string
  created_at: string
}
