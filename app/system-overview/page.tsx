"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"

interface ExpenseRequest {
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
  submitter_name?: string
  approver_name?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  department?: string
}

export default function SystemOverview() {
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")

  useEffect(() => {
    loadSystemData()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, statusFilter, urgencyFilter])

  const loadSystemData = async () => {
    try {
      setIsLoading(true)
      setDatabaseError(false)

      try {
        const { expenseService, userService } = await import("@/lib/database")
        const [expenseData, userData] = await Promise.all([expenseService.getAll(), userService.getAll()])

        // Enrich expenses with user names
        const enrichedExpenses = expenseData.map((expense) => {
          const submitter = userData.find((u) => u.id === expense.submitted_by)
          const approver = expense.current_approver ? userData.find((u) => u.id === expense.current_approver) : null

          return {
            ...expense,
            submitter_name: submitter?.name || "Unknown User",
            approver_name: approver?.name || undefined,
          }
        })

        setExpenses(enrichedExpenses)
        setUsers(userData)
      } catch (dbError) {
        console.log("Database error, using mock data:", dbError)
        setDatabaseError(true)
        loadMockData()
      }
    } catch (error) {
      console.error("Error loading system data:", error)
      setDatabaseError(true)
      loadMockData()
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockData = () => {
    const mockUsers: User[] = [
      { id: "1", name: "John Employee", email: "john@company.com", role: "user", department: "Engineering" },
      { id: "2", name: "Sarah Manager", email: "sarah@company.com", role: "user", department: "Engineering" },
      { id: "3", name: "Mike Director", email: "mike@company.com", role: "user", department: "Operations" },
    ]

    const mockExpenses: ExpenseRequest[] = [
      {
        id: "1",
        title: "Office Supplies for Q1",
        amount: 450,
        category: "Office Supplies",
        description: "Pens, paper, notebooks for the team",
        business_justification: "Essential supplies for daily operations",
        status: "pending",
        urgency: "medium",
        submitted_by: "1",
        current_approver: "2",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        submitter_name: "John Employee",
        approver_name: "Sarah Manager",
      },
      {
        id: "2",
        title: "Software License Renewal",
        amount: 2500,
        category: "Software",
        description: "Annual license for development tools",
        business_justification: "Required for development team productivity",
        status: "approved",
        urgency: "high",
        submitted_by: "1",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        submitter_name: "John Employee",
      },
      {
        id: "3",
        title: "Team Building Event",
        amount: 1200,
        category: "Events",
        description: "Quarterly team building activity",
        business_justification: "Improve team morale and collaboration",
        status: "rejected",
        urgency: "low",
        submitted_by: "2",
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        submitter_name: "Sarah Manager",
      },
    ]

    setExpenses(mockExpenses)
    setUsers(mockUsers)
  }

  const filterExpenses = () => {
    let filtered = expenses

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((expense) => expense.status === statusFilter)
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((expense) => expense.urgency === urgencyFilter)
    }

    setFilteredExpenses(filtered)
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const exportData = () => {
    const csvContent = [
      ["ID", "Title", "Amount", "Status", "Submitter", "Category", "Urgency", "Created", "Updated"].join(","),
      ...filteredExpenses.map((expense) =>
        [
          expense.id,
          `"${expense.title}"`,
          expense.amount,
          expense.status,
          `"${expense.submitter_name}"`,
          expense.category,
          expense.urgency,
          new Date(expense.created_at).toLocaleDateString(),
          new Date(expense.updated_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading system data...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Database Warning */}
            {databaseError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Database connection failed. Using mock data. Please check your database connection and run the SQL
                  scripts.
                </AlertDescription>
              </Alert>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
                <p className="text-gray-600 mt-1">Monitor all expense requests and system activity</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={loadSystemData} className="flex items-center gap-2 bg-transparent">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={exportData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{expenses.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {expenses.filter((e) => e.status === "pending").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {expenses.filter((e) => e.status === "approved").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {expenses
                      .filter((e) => e.status === "approved")
                      .reduce((sum, e) => sum + e.amount, 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by title, submitter, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="urgency">Urgency</Label>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All urgencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Urgencies</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Requests Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Expense Requests ({filteredExpenses.length})</CardTitle>
                <CardDescription>Complete list of all expense requests in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                      <p className="text-gray-600">
                        {expenses.length === 0
                          ? "No expense requests have been submitted yet."
                          : "No requests match your current filters."}
                      </p>
                    </div>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <div key={expense.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(expense.status)}
                              <h4 className="font-semibold text-lg">{expense.title}</h4>
                              <Badge className={getUrgencyColor(expense.urgency)}>{expense.urgency}</Badge>
                            </div>
                            <p className="text-gray-600 mb-2">{expense.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-500">Submitter:</span>
                                <p>{expense.submitter_name}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Category:</span>
                                <p>{expense.category}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Created:</span>
                                <p>{new Date(expense.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Updated:</span>
                                <p>{new Date(expense.updated_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {expense.current_approver && expense.approver_name && (
                              <p className="text-sm text-blue-600 mt-2">
                                Pending approval from: {expense.approver_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-2xl font-bold">${expense.amount.toLocaleString()}</span>
                            <Badge className={getStatusColor(expense.status)}>{expense.status}</Badge>
                            <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                              <Eye className="h-3 w-3" />
                              View Details
                            </Button>
                          </div>
                        </div>
                        {expense.business_justification && (
                          <div className="border-t pt-3">
                            <span className="font-medium text-gray-500 text-sm">Business Justification:</span>
                            <p className="text-sm text-gray-700 mt-1">{expense.business_justification}</p>
                          </div>
                        )}
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
