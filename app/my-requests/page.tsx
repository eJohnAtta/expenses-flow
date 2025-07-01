"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, Plus, AlertCircle, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface MyExpenseRequest {
  id: string
  title: string
  amount: number
  status: "pending" | "approved" | "rejected"
  submittedDate: string
  category: string
  currentApprover?: string
  approvalHistory: {
    approver: string
    action: "approved" | "rejected" | "pending"
    date?: string
    comment?: string
  }[]
}

export default function MyRequestsPage() {
  const { user } = useAuth()
  const [myRequests, setMyRequests] = useState<MyExpenseRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadMyRequests()
    }
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

  const loadMyRequests = async () => {
    try {
      setIsLoading(true)
      setDatabaseError(false)

      // Get current user ID first
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)

      if (!userId) {
        console.log("User not found in database, using mock data")
        setDatabaseError(true)
        loadMockRequests()
        return
      }

      try {
        const { expenseService, approvalService, userService } = await import("@/lib/database")

        // Get user's expense requests
        const expenses = await expenseService.getByUserId(userId)
        const allUsers = await userService.getAll()

        // Get approval history for each request
        const requestsWithHistory = await Promise.all(
          expenses.map(async (expense) => {
            const approvalHistory = await approvalService.getByExpenseId(expense.id)
            const currentApprover = expense.current_approver
              ? allUsers.find((u) => u.id === expense.current_approver)
              : null

            const historyWithNames = approvalHistory.map((history) => {
              const approver = allUsers.find((u) => u.id === history.approver_id)
              return {
                approver: approver?.name || "Unknown",
                action: history.action,
                date: history.created_at ? new Date(history.created_at).toISOString().split("T")[0] : undefined,
                comment: history.comment || undefined,
              }
            })

            return {
              id: expense.id,
              title: expense.title,
              amount: expense.amount,
              status: expense.status,
              submittedDate: new Date(expense.created_at).toISOString().split("T")[0],
              category: expense.category,
              currentApprover: currentApprover?.name,
              approvalHistory: historyWithNames,
            }
          }),
        )

        setMyRequests(requestsWithHistory)
      } catch (dbError) {
        console.log("Database error, using mock data:", dbError)
        setDatabaseError(true)
        loadMockRequests()
      }
    } catch (error) {
      console.error("Error loading my requests:", error)
      setDatabaseError(true)
      loadMockRequests()
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockRequests = () => {
    const mockRequests: MyExpenseRequest[] = [
      {
        id: "1",
        title: "Office Supplies for Q1",
        amount: 450,
        status: "approved",
        submittedDate: "2024-01-10",
        category: "Office Supplies",
        approvalHistory: [
          {
            approver: "Samuel Manager",
            action: "approved",
            date: "2024-01-11",
            comment: "Approved for necessary office supplies",
          },
        ],
      },
      {
        id: "2",
        title: "Conference Registration",
        amount: 1200,
        status: "pending",
        submittedDate: "2024-01-15",
        category: "Training & Development",
        currentApprover: "Samuel Manager",
        approvalHistory: [
          { approver: "Samuel Manager", action: "pending" },
          { approver: "Ahmed Director", action: "pending" },
        ],
      },
      {
        id: "3",
        title: "Client Dinner",
        amount: 180,
        status: "rejected",
        submittedDate: "2024-01-08",
        category: "Meals & Entertainment",
        approvalHistory: [
          {
            approver: "Samuel Manager",
            action: "rejected",
            date: "2024-01-09",
            comment: "Please provide more detailed business justification",
          },
        ],
      },
      {
        id: "4",
        title: "Software License",
        amount: 800,
        status: "approved",
        submittedDate: "2024-01-05",
        category: "Software & Licenses",
        approvalHistory: [
          { approver: "Samuel Manager", action: "approved", date: "2024-01-06", comment: "Essential for project work" },
        ],
      },
    ]
    setMyRequests(mockRequests)
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

  const filterRequestsByStatus = (status: string) => {
    if (status === "all") return myRequests
    return myRequests.filter((req) => req.status === status)
  }

  const RequestCard = ({ request }: { request: MyExpenseRequest }) => (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(request.status)}
            <div>
              <h3 className="font-semibold text-lg">{request.title}</h3>
              <p className="text-sm text-gray-600">
                {request.category} • Submitted on {request.submittedDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">${request.amount.toLocaleString()}</span>
            <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
          </div>
        </div>

        {request.currentApprover && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              Currently awaiting approval from <strong>{request.currentApprover}</strong>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Approval History:</h4>
          {request.approvalHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No approval history yet</p>
          ) : (
            request.approvalHistory.map((history, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    history.action === "approved"
                      ? "bg-green-500"
                      : history.action === "rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                />
                <span className="font-medium">{history.approver}</span>
                <span className="text-gray-600">
                  {history.action === "pending"
                    ? "Pending review"
                    : `${history.action} ${history.date ? `on ${history.date}` : ""}`}
                </span>
                {history.comment && <span className="text-gray-500 italic">- {history.comment}</span>}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading your requests...</p>
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
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Database Warning */}
            {databaseError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Database connection failed or user not found. Using mock data. Please run the SQL scripts and ensure
                  your user exists in the database.
                </AlertDescription>
              </Alert>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Expense Requests</h1>
                <p className="text-gray-600 mt-1">Track the status of your submitted expense requests</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadMyRequests} className="flex items-center gap-2 bg-transparent">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Link href="/expense/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                  </Button>
                </Link>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{myRequests.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{filterRequestsByStatus("pending").length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{filterRequestsByStatus("approved").length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    $
                    {filterRequestsByStatus("approved")
                      .reduce((sum, req) => sum + req.amount, 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Requests List with Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Request History</CardTitle>
                <CardDescription>View and track all your expense requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All ({myRequests.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({filterRequestsByStatus("pending").length})</TabsTrigger>
                    <TabsTrigger value="approved">Approved ({filterRequestsByStatus("approved").length})</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected ({filterRequestsByStatus("rejected").length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-6">
                    <div className="space-y-4">
                      {myRequests.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                          <p className="text-gray-600">Start by creating your first expense request.</p>
                          <Link href="/expense/new">
                            <Button className="mt-4">Create Request</Button>
                          </Link>
                        </div>
                      ) : (
                        myRequests.map((request) => <RequestCard key={request.id} request={request} />)
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="pending" className="mt-6">
                    <div className="space-y-4">
                      {filterRequestsByStatus("pending").map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))}
                      {filterRequestsByStatus("pending").length === 0 && (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                          <p className="text-gray-600">All your requests have been processed.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="approved" className="mt-6">
                    <div className="space-y-4">
                      {filterRequestsByStatus("approved").map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))}
                      {filterRequestsByStatus("approved").length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No approved requests</h3>
                          <p className="text-gray-600">No requests have been approved yet.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="rejected" className="mt-6">
                    <div className="space-y-4">
                      {filterRequestsByStatus("rejected").map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))}
                      {filterRequestsByStatus("rejected").length === 0 && (
                        <div className="text-center py-8">
                          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No rejected requests</h3>
                          <p className="text-gray-600">None of your requests have been rejected.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
