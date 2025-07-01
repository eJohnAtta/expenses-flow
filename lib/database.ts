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

// User operations
export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase.from("users").select("*").order("name")

    if (error) {
      console.error("Database error in userService.getAll:", error)
      throw error
    }
    return data || []
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      console.error("Database error in userService.getById:", error)
      throw error
    }
    return data
  },

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      console.error("Database error in userService.getByEmail:", error)
      throw error
    }
    return data
  },

  async create(user: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> {
    const { data, error } = await supabase.from("users").insert(user).select().single()

    if (error) {
      console.error("Database error in userService.create:", error)
      throw error
    }
    return data
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Database error in userService.update:", error)
      throw error
    }
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) {
      console.error("Database error in userService.delete:", error)
      throw error
    }
  },
}

// Expense request operations
export const expenseService = {
  async getAll(): Promise<ExpenseRequest[]> {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error in expenseService.getAll:", error)
      throw error
    }
    return data || []
  },

  async getById(id: string): Promise<ExpenseRequest | null> {
    const { data, error } = await supabase.from("expense_requests").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      console.error("Database error in expenseService.getById:", error)
      throw error
    }
    return data
  },

  async getByUserId(userId: string): Promise<ExpenseRequest[]> {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error in expenseService.getByUserId:", error)
      throw error
    }
    return data || []
  },

  async getPendingForApprover(approverId: string): Promise<ExpenseRequest[]> {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .eq("current_approver", approverId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error in expenseService.getPendingForApprover:", error)
      throw error
    }
    return data || []
  },

  async create(expense: Omit<ExpenseRequest, "id" | "created_at" | "updated_at">): Promise<ExpenseRequest> {
    const { data, error } = await supabase.from("expense_requests").insert(expense).select().single()

    if (error) {
      console.error("Database error in expenseService.create:", error)
      throw error
    }
    return data
  },

  async update(id: string, updates: Partial<ExpenseRequest>): Promise<ExpenseRequest> {
    const { data, error } = await supabase
      .from("expense_requests")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Database error in expenseService.update:", error)
      throw error
    }
    return data
  },

  async updateStatus(id: string, status: "approved" | "rejected", currentApprover?: string): Promise<ExpenseRequest> {
    const updates: Partial<ExpenseRequest> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status !== "pending") {
      updates.current_approver = undefined
    } else if (currentApprover) {
      updates.current_approver = currentApprover
    }

    const { data, error } = await supabase.from("expense_requests").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Database error in expenseService.updateStatus:", error)
      throw error
    }
    return data
  },
}

// Budget level operations
export const budgetService = {
  async getAll(): Promise<BudgetLevel[]> {
    const { data, error } = await supabase.from("budget_levels").select("*").eq("is_active", true).order("min_amount")

    if (error) {
      console.error("Database error in budgetService.getAll:", error)
      throw error
    }
    return data || []
  },

  async getForAmount(amount: number): Promise<BudgetLevel | null> {
    const { data, error } = await supabase
      .from("budget_levels")
      .select("*")
      .eq("is_active", true)
      .lte("min_amount", amount)
      .gte("max_amount", amount)
      .single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      console.error("Database error in budgetService.getForAmount:", error)
      throw error
    }
    return data
  },

  async create(budgetLevel: Omit<BudgetLevel, "id" | "created_at" | "updated_at">): Promise<BudgetLevel> {
    const { data, error } = await supabase.from("budget_levels").insert(budgetLevel).select().single()

    if (error) {
      console.error("Database error in budgetService.create:", error)
      throw error
    }
    return data
  },

  async update(id: string, updates: Partial<BudgetLevel>): Promise<BudgetLevel> {
    const { data, error } = await supabase
      .from("budget_levels")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Database error in budgetService.update:", error)
      throw error
    }
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("budget_levels").update({ is_active: false }).eq("id", id)

    if (error) {
      console.error("Database error in budgetService.delete:", error)
      throw error
    }
  },
}

// Approval history operations
export const approvalService = {
  async getByExpenseId(expenseId: string): Promise<ApprovalHistory[]> {
    const { data, error } = await supabase
      .from("approval_history")
      .select("*")
      .eq("expense_request_id", expenseId)
      .order("created_at")

    if (error) {
      console.error("Database error in approvalService.getByExpenseId:", error)
      throw error
    }
    return data || []
  },

  async create(approval: Omit<ApprovalHistory, "id" | "created_at">): Promise<ApprovalHistory> {
    const { data, error } = await supabase.from("approval_history").insert(approval).select().single()

    if (error) {
      console.error("Database error in approvalService.create:", error)
      throw error
    }
    return data
  },
}

// Attachment operations
export const attachmentService = {
  async getByExpenseId(expenseId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("expense_request_id", expenseId)
      .order("created_at")

    if (error) {
      console.error("Database error in attachmentService.getByExpenseId:", error)
      throw error
    }
    return data || []
  },

  async create(attachment: Omit<Attachment, "id" | "created_at">): Promise<Attachment> {
    const { data, error } = await supabase.from("attachments").insert(attachment).select().single()

    if (error) {
      console.error("Database error in attachmentService.create:", error)
      throw error
    }
    return data
  },

  async uploadFile(file: File, expenseId: string): Promise<string> {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${expenseId}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage.from("expense-attachments").upload(fileName, file)

      if (error) {
        console.error("File upload error:", error)
        throw error
      }

      return data.path
    } catch (error) {
      console.error("Error uploading file:", error)
      throw error
    }
  },
}

// Helper function to get the approval chain based on budget levels
export async function getApprovalChain(submitterId: string, amount: number): Promise<string[]> {
  try {
    const approvers: string[] = []

    // Get the submitter
    const submitter = await userService.getById(submitterId)
    if (!submitter) return approvers

    // Get the applicable budget level for this amount
    const budgetLevel = await budgetService.getForAmount(amount)

    console.log(`Getting approval chain for amount $${amount}, budget level:`, budgetLevel)

    if (!budgetLevel) {
      // Fallback to simple manager approval if no budget level found
      if (submitter.manager_id) {
        approvers.push(submitter.manager_id)
      }
      return approvers
    }

    // Build approval chain based on budget level configuration
    const requiredLevels = budgetLevel.approver_levels.sort((a, b) => b - a) // Sort descending (highest level first)

    // Get all users to find approvers at required levels (exclude admins from approval chain)
    const allUsers = await userService.getAll()
    const nonAdminUsers = allUsers.filter((user) => user.role !== "admin")

    // Start from submitter and work up the hierarchy
    let currentUser = submitter

    for (const requiredLevel of requiredLevels) {
      // Find an approver at the required level in the user's hierarchy
      let approver = null

      // First, check if current user's manager is at the required level
      if (currentUser.manager_id) {
        const manager = nonAdminUsers.find((u) => u.id === currentUser.manager_id)
        if (manager && manager.level === requiredLevel) {
          approver = manager
        } else if (manager) {
          // Look up the hierarchy for someone at the required level
          let hierarchyUser = manager
          while (hierarchyUser && hierarchyUser.manager_id) {
            const nextManager = nonAdminUsers.find((u) => u.id === hierarchyUser.manager_id)
            if (nextManager && nextManager.level === requiredLevel) {
              approver = nextManager
              break
            }
            hierarchyUser = nextManager || null
          }
        }
      }

      // If we couldn't find someone in the hierarchy, find any user at that level (excluding admins)
      if (!approver) {
        approver = nonAdminUsers.find(
          (u) => u.level === requiredLevel && u.id !== submitterId && !approvers.includes(u.id),
        )
      }

      if (approver && !approvers.includes(approver.id)) {
        approvers.push(approver.id)
        currentUser = approver
        console.log(`Added approver: ${approver.name} (level ${approver.level})`)
      }
    }

    console.log(`Final approval chain for $${amount}:`, approvers)
    return approvers
  } catch (error) {
    console.error("Error building approval chain:", error)
    return []
  }
}

// Helper function to determine next approver based on current approval state
export async function getNextApprover(expenseId: string): Promise<string | null> {
  try {
    // Get the expense request
    const expense = await expenseService.getById(expenseId)
    if (!expense) return null

    // Get the full approval chain needed for this expense
    const approvalChain = await getApprovalChain(expense.submitted_by, expense.amount)
    if (approvalChain.length === 0) return null

    // Get existing approvals
    const approvalHistory = await approvalService.getByExpenseId(expenseId)
    const approvedBy = approvalHistory
      .filter((approval) => approval.action === "approved")
      .map((approval) => approval.approver_id)

    console.log(`Expense ${expenseId} - Approval chain:`, approvalChain)
    console.log(`Already approved by:`, approvedBy)

    // Find the next approver in the chain who hasn't approved yet
    for (const approverId of approvalChain) {
      if (!approvedBy.includes(approverId)) {
        console.log(`Next approver: ${approverId}`)
        return approverId
      }
    }

    // If all approvers have approved, return null (fully approved)
    console.log(`All approvers have approved, expense can be fully approved`)
    return null
  } catch (error) {
    console.error("Error determining next approver:", error)
    return null
  }
}

// Helper function to process an approval
export async function processApproval(
  expenseId: string,
  approverId: string,
  action: "approved" | "rejected",
  comment?: string,
): Promise<{ success: boolean; nextApprover?: string; fullyApproved?: boolean }> {
  try {
    console.log(`Processing ${action} for expense ${expenseId} by approver ${approverId}`)

    // Add the approval to history
    await approvalService.create({
      expense_request_id: expenseId,
      approver_id: approverId,
      action,
      comment,
    })

    if (action === "rejected") {
      // If rejected, update status to rejected and clear current approver
      await expenseService.updateStatus(expenseId, "rejected")
      return { success: true, fullyApproved: false }
    }

    // If approved, determine next steps
    const nextApprover = await getNextApprover(expenseId)

    if (nextApprover) {
      // Move to next approver
      await expenseService.update(expenseId, {
        current_approver: nextApprover,
        status: "pending",
      })
      console.log(`Moved expense ${expenseId} to next approver: ${nextApprover}`)
      return { success: true, nextApprover, fullyApproved: false }
    } else {
      // Fully approved - no more approvers needed
      await expenseService.updateStatus(expenseId, "approved")
      console.log(`Expense ${expenseId} is fully approved`)
      return { success: true, fullyApproved: true }
    }
  } catch (error) {
    console.error("Error processing approval:", error)
    return { success: false }
  }
}

// Helper function to determine initial approver when creating a new expense
export async function getInitialApprover(submitterId: string, amount: number): Promise<string | null> {
  try {
    const approvalChain = await getApprovalChain(submitterId, amount)
    return approvalChain.length > 0 ? approvalChain[0] : null
  } catch (error) {
    console.error("Error getting initial approver:", error)
    return null
  }
}

// Helper function to get approval flow preview for UI
export async function getApprovalFlowPreview(
  submitterId: string,
  amount: number,
): Promise<{ name: string; level: number }[]> {
  try {
    const approvalChain = await getApprovalChain(submitterId, amount)
    const allUsers = await userService.getAll()
    const nonAdminUsers = allUsers.filter((user) => user.role !== "admin")

    return approvalChain.map((approverId) => {
      const approver = nonAdminUsers.find((u) => u.id === approverId)
      return {
        name: approver?.name || "Unknown",
        level: approver?.level || 0,
      }
    })
  } catch (error) {
    console.error("Error getting approval flow preview:", error)
    return []
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("users").select("count").limit(1)
    return !error
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}
