"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Users, DollarSign, FileText, Clock, CheckCircle, XCircle, Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"

interface Stats {
  totalRequests: number
  pendingApprovals: number
  totalEmployees: number
  monthlyBudget: number
}

interface ExpenseRequest {
  id: string
  title: string
  amount: number
  status: "pending" | "approved" | "rejected"
  submitted_by: string
  current_approver?: string
  created_at: string
  submitter_name?: string
  approver_name?: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingApprovals: 0,
    totalEmployees: 0,
    monthlyBudget: 0,
  })
  const [recentRequests, setRecentRequests] = useState<ExpenseRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // Add a small delay to ensure auth context is fully loaded
    const timer = setTimeout(() => {
      if (user) {
        loadDashboardData()
      } else {
        setIsLoading(false)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [user])

  const getCurrentUserId = async (): Promise<string | null> => {
    if (!user) return null

    try {
      const { userService } = await import("@/lib/database")
      const userData = await userService.getByEmail(user.email)
      return userData?.id || null
    } catch (error) {
      console.error("Error getting current user ID:", error)
      return null
    }
  }

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setDatabaseError(false)

      // Get current user ID first
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)

      if (!userId) {
        console.log("User not found in database, using mock data")
        setDatabaseError(true)
        loadMockData()
        return
      }

      // Try to load from database
      try {
        const { expenseService, userService } = await import("@/lib/database")

        if (user?.role === "admin") {
          // Admin sees all data
          const [expenses, users] = await Promise.all([expenseService.getAll(), userService.getAll()])

          // Get names for recent requests
          const expensesWithNames = await Promise.all(
            expenses.slice(0, 10).map(async (expense) => {
              const submitter = users.find((u) => u.id === expense.submitted_by)
              const approver = expense.current_approver ? users.find((u) => u.id === expense.current_approver) : null

              return {
                ...expense,
                submitter_name: submitter?.name || "Unknown",
                approver_name: approver?.name || undefined,
              }
            }),
          )

          setRecentRequests(expensesWithNames)
          setStats({
            totalRequests: expenses.length,
            pendingApprovals: expenses.filter((e) => e.status === "pending").length,
            totalEmployees: users.length,
            monthlyBudget: expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0),
          })
        } else {
          // Regular users see their own requests and requests they need to approve
          const [myExpenses, pendingApprovals, allUsers] = await Promise.all([
            expenseService.getByUserId(userId),
            expenseService.getPendingForApprover(userId),
            userService.getAll(),
          ])

          const allRelevantRequests = [...myExpenses, ...pendingApprovals]
          const uniqueRequests = allRelevantRequests.filter(
            (request, index, self) => index === self.findIndex((r) => r.id === request.id),
          )

          // Get names for recent requests
          const expensesWithNames = await Promise.all(
            uniqueRequests.slice(0, 10).map(async (expense) => {
              const submitter = allUsers.find((u) => u.id === expense.submitted_by)
              const approver = expense.current_approver ? allUsers.find((u) => u.id === expense.current_approver) : null

              return {
                ...expense,
                submitter_name: submitter?.name || "Unknown",
                approver_name: approver?.name || undefined,
              }
            }),
          )

          setRecentRequests(expensesWithNames)
          setStats({
            totalRequests: myExpenses.length,
            pendingApprovals: pendingApprovals.length,
            totalEmployees: 0, // Regular users don't see total employees
            monthlyBudget: myExpenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0),
          })
        }
      } catch (dbError) {
        console.log("Database error, using mock data:", dbError)
        setDatabaseError(true)
        loadMockData()
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setDatabaseError(true)
      loadMockData()
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockData = () => {
    // Mock data for when database is not available
    const mockRequests: ExpenseRequest[] = [
      {
        id: "1",
        title: "Office Supplies for Q1",
        amount: 450,
        status: "pending",
        submitted_by: user?.email || "",
        current_approver: "samuel@company.com",
        created_at: new Date().toISOString(),
        submitter_name: user?.name || "You",
        approver_name: "Samuel Manager",
      },
      {
        id: "2",
        title: "Software License Renewal",
        amount: 2500,
        status: "approved",
        submitted_by: user?.email || "",
        created_at: new Date().toISOString(),
        submitter_name: user?.name || "You",
      },
      {
        id: "3",
        title: "Team Lunch",
        amount: 180,
        status: "approved",
        submitted_by: user?.email || "",
        created_at: new Date().toISOString(),
        submitter_name: user?.name || "You",
      },
    ]

    setRecentRequests(mockRequests)
    setStats({
      totalRequests: mockRequests.length,
      pendingApprovals: mockRequests.filter((r) => r.status === "pending").length,
      totalEmployees: user?.role === "admin" ? 6 : 0,
      monthlyBudget: mockRequests.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount, 0),
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isMyRequest = (request: ExpenseRequest) => {
    return request.submitted_by === currentUserId || request.submitter_name === user?.name
  }

  const needsMyApproval = (request: ExpenseRequest) => {
    return request.current_approver === currentUserId || request.approver_name === user?.name
  }

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Database Warning */}
            {databaseError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Database connection failed or user not found. Please run the SQL scripts to set up the database.
                  Currently showing mock data.
                </AlertDescription>
              </Alert>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user?.role === "admin" ? "Admin Dashboard" : "My Dashboard"}
                </h1>
                <p className="text-gray-600 mt-1">
                  {user?.role === "admin"
                    ? "Monitor company expenses and system configuration"
                    : "View your expenses and pending approvals"}
                </p>
              </div>
              {user?.role !== "admin" && (
                <Link href="/expense/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Expense Request
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats Cards - Show different stats based on role */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {user?.role === "admin" ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRequests}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
                      <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                      <p className="text-xs text-muted-foreground">Active users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${stats.monthlyBudget.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">My Requests</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRequests}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Need My Approval</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
                      <p className="text-xs text-muted-foreground">Awaiting your review</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {recentRequests.filter((r) => r.status === "approved" && isMyRequest(r)).length}
                      </div>
                      <p className="text-xs text-muted-foreground">My approved requests</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${stats.monthlyBudget.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">My approved amount</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Quick Actions - Different for admin vs user */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {user?.role === "admin" ? (
                <>
                  <Link href="/structure">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Organization Structure
                        </CardTitle>
                        <CardDescription>Define company hierarchy and reporting relationships</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link href="/budget-levels">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Budget Levels
                        </CardTitle>
                        <CardDescription>Configure approval thresholds and budget limits</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link href="/system-overview">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          System Overview
                        </CardTitle>
                        <CardDescription>View all transactions and system activity</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/my-requests">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          My Requests
                        </CardTitle>
                        <CardDescription>View history of your expense requests</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link href="/approvals">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Pending Approvals
                        </CardTitle>
                        <CardDescription>Review requests that need your approval</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link href="/expense/new">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          New Request
                        </CardTitle>
                        <CardDescription>Submit a new expense request</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </>
              )}
            </div>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>{user?.role === "admin" ? "Recent Expense Requests" : "My Recent Activity"}</CardTitle>
                <CardDescription>
                  {user?.role === "admin"
                    ? "Latest expense requests and their approval status"
                    : "Your recent requests and approvals"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                      <p className="text-gray-600">
                        {user?.role === "admin"
                          ? "No expense requests have been submitted yet."
                          : "Start by creating your first expense request."}
                      </p>
                    </div>
                  ) : (
                    recentRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(request.status)}
                          <div>
                            <h4 className="font-medium">{request.title}</h4>
                            <p className="text-sm text-gray-600">
                              {user?.role === "admin" || !isMyRequest(request)
                                ? `Submitted by ${request.submitter_name}`
                                : "Submitted by you"}{" "}
                              on {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            {needsMyApproval(request) && request.status === "pending" && user?.role !== "admin" && (
                              <p className="text-sm text-blue-600 font-medium">⚠️ Awaiting your approval</p>
                            )}
                            {request.current_approver && request.approver_name && !needsMyApproval(request) && (
                              <p className="text-sm text-gray-500">Pending approval from {request.approver_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">${request.amount.toLocaleString()}</span>
                          <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
