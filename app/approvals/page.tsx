"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Eye, AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"

interface PendingRequest {
  id: string
  title: string
  amount: number
  submittedBy: string
  submittedDate: string
  category: string
  description: string
  businessJustification: string
  attachments: string[]
  urgency: "low" | "medium" | "high"
  submitter_name?: string
  approvalChain?: string[]
  approvedBy?: string[]
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [approvalComment, setApprovalComment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPendingRequests()
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

  const loadPendingRequests = async () => {
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
        const { expenseService, userService, getApprovalChain, approvalService } = await import("@/lib/database")

        let expenses = []
        if (user?.role === "admin") {
          // Admin sees all requests for monitoring only, but can't approve
          expenses = await expenseService.getAll()
          // Don't filter by pending for admins - they see all for monitoring
        } else {
          // Regular users see requests they need to approve
          expenses = await expenseService.getPendingForApprover(userId)
        }

        // Get submitter names and approval chain info
        const allUsers = await userService.getAll()
        const requestsWithDetails = await Promise.all(
          expenses.map(async (expense) => {
            const submitter = allUsers.find((u) => u.id === expense.submitted_by)

            // Get approval chain for this expense
            const approvalChain = await getApprovalChain(expense.submitted_by, expense.amount)
            const approvalChainNames = approvalChain.map((id) => {
              const approver = allUsers.find((u) => u.id === id)
              return approver?.name || "Unknown"
            })

            // Get who has already approved
            const approvalHistory = await approvalService.getByExpenseId(expense.id)
            const approvedBy = approvalHistory
              .filter((approval) => approval.action === "approved")
              .map((approval) => {
                const approver = allUsers.find((u) => u.id === approval.approver_id)
                return approver?.name || "Unknown"
              })

            return {
              id: expense.id,
              title: expense.title,
              amount: expense.amount,
              submittedBy: expense.submitted_by,
              submittedDate: new Date(expense.created_at).toISOString().split("T")[0],
              category: expense.category,
              description: expense.description,
              businessJustification: expense.business_justification,
              attachments: [], // TODO: Load actual attachments
              urgency: expense.urgency,
              submitter_name: submitter?.name || "Unknown",
              approvalChain: approvalChainNames,
              approvedBy: approvedBy,
            }
          }),
        )

        setPendingRequests(requestsWithDetails)
      } catch (dbError) {
        console.log("Database error, using mock data:", dbError)
        setDatabaseError(true)
        loadMockRequests()
      }
    } catch (error) {
      console.error("Error loading pending requests:", error)
      setDatabaseError(true)
      loadMockRequests()
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockRequests = () => {
    const mockRequests: PendingRequest[] = [
      {
        id: "1",
        title: "Office Supplies for Q1",
        amount: 450,
        submittedBy: "john@company.com",
        submittedDate: "2024-01-15",
        category: "Office Supplies",
        description: "Stationery, printer paper, and office equipment for the first quarter",
        businessJustification: "Essential supplies needed to maintain office operations and productivity",
        attachments: ["receipt_1.pdf", "quote_comparison.xlsx"],
        urgency: "medium",
        submitter_name: "John Doe",
        approvalChain: ["Samuel Manager"],
        approvedBy: [],
      },
      {
        id: "2",
        title: "Software License Renewal",
        amount: 5000,
        submittedBy: "jane@company.com",
        submittedDate: "2024-01-14",
        category: "Software & Licenses",
        description: "Annual renewal for project management software used by the development team",
        businessJustification:
          "Critical software for project tracking and team collaboration. Renewal required to avoid service interruption",
        attachments: ["license_quote.pdf", "usage_report.pdf"],
        urgency: "high",
        submitter_name: "Jane Smith",
        approvalChain: ["Samuel Manager", "Ahmed Director", "System Admin"],
        approvedBy: [],
      },
    ]
    setPendingRequests(mockRequests)
  }

  const handleApprove = async (requestId: string) => {
    setIsProcessing(true)

    try {
      if (!databaseError && currentUserId) {
        // Try to process approval in database
        try {
          const { processApproval } = await import("@/lib/database")

          const result = await processApproval(requestId, currentUserId, "approved", approvalComment || undefined)

          if (result.success) {
            if (result.fullyApproved) {
              // Request is fully approved, remove from pending list
              setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
            } else if (result.nextApprover) {
              // Request moved to next approver, remove from current user's pending list
              setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
            }
            // Reload to get updated data
            await loadPendingRequests()
          }
        } catch (dbError) {
          console.error("Database error during approval:", dbError)
          // Fall back to removing from local state
          setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
        }
      } else {
        // Mock approval - just remove from list
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
      }
    } catch (error) {
      console.error("Error approving request:", error)
    } finally {
      setSelectedRequest(null)
      setApprovalComment("")
      setIsProcessing(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setIsProcessing(true)

    try {
      if (!databaseError && currentUserId) {
        // Try to process rejection in database
        try {
          const { processApproval } = await import("@/lib/database")

          const result = await processApproval(requestId, currentUserId, "rejected", approvalComment || undefined)

          if (result.success) {
            // Request is rejected, remove from pending list
            setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
            // Reload to get updated data
            await loadPendingRequests()
          }
        } catch (dbError) {
          console.error("Database error during rejection:", dbError)
          // Fall back to removing from local state
          setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
        }
      } else {
        // Mock rejection - just remove from list
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
      }
    } catch (error) {
      console.error("Error rejecting request:", error)
    } finally {
      setSelectedRequest(null)
      setApprovalComment("")
      setIsProcessing(false)
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

  const getAmountColor = (amount: number) => {
    if (amount >= 5000) return "text-red-600 font-semibold"
    if (amount >= 1000) return "text-yellow-600 font-semibold"
    return "text-green-600 font-semibold"
  }

  const renderApprovalFlow = (request: PendingRequest) => {
    if (!request.approvalChain || request.approvalChain.length === 0) {
      return <span className="text-gray-500">No approval chain data</span>
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {request.approvalChain.map((approver, index) => {
          const isApproved = request.approvedBy?.includes(approver)
          const isCurrent = !isApproved && request.approvedBy?.length === index

          return (
            <div key={index} className="flex items-center">
              <Badge
                variant={isApproved ? "default" : isCurrent ? "secondary" : "outline"}
                className={isApproved ? "bg-green-100 text-green-800" : isCurrent ? "bg-blue-100 text-blue-800" : ""}
              >
                {isApproved && "✓ "}
                {approver}
              </Badge>
              {index < request.approvalChain.length - 1 && <ArrowRight className="h-4 w-4 mx-1 text-gray-400" />}
            </div>
          )
        })}
      </div>
    )
  }

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
                  <p className="text-gray-600">Loading pending approvals...</p>
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

            {user?.role === "admin" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  As a system administrator, you can view all transactions for monitoring purposes but cannot approve
                  expenses. Only managers and directors in the organizational hierarchy can approve expenses.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
                <p className="text-gray-600 mt-1">Review and approve expense requests</p>
              </div>
              <Button
                variant="outline"
                onClick={loadPendingRequests}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{pendingRequests.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${pendingRequests.reduce((sum, req) => sum + req.amount, 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">High Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {pendingRequests.filter((req) => req.urgency === "high").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Requests List */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Requests Awaiting Your Approval</CardTitle>
                <CardDescription>Click on a request to view details and take action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                      <p className="text-gray-600">No pending approvals at the moment.</p>
                    </div>
                  ) : (
                    pendingRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{request.title}</h3>
                            <Badge className={getUrgencyColor(request.urgency)}>{request.urgency} priority</Badge>
                            {request.amount >= 1000 && <Badge variant="outline">Multi-level approval</Badge>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold ${getAmountColor(request.amount)}`}>
                              ${request.amount.toLocaleString()}
                            </span>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{request.title}</DialogTitle>
                                  <DialogDescription>
                                    Submitted by {request.submitter_name} on {request.submittedDate}
                                  </DialogDescription>
                                </DialogHeader>

                                <Tabs defaultValue="details" className="w-full">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="approval">Approval Flow</TabsTrigger>
                                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="details" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-600">Amount</label>
                                        <div className="text-2xl font-bold">${request.amount.toLocaleString()}</div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-600">Category</label>
                                        <div className="text-lg">{request.category}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Description</label>
                                      <p className="mt-1 text-gray-900">{request.description}</p>
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-gray-600">
                                        Business Justification
                                      </label>
                                      <p className="mt-1 text-gray-900">{request.businessJustification}</p>
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Comments (Optional)</label>
                                      <Textarea
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                        placeholder="Add comments for the requester..."
                                        className="mt-1"
                                      />
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="approval" className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Approval Flow</label>
                                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                        {renderApprovalFlow(request)}
                                      </div>
                                    </div>

                                    {request.approvedBy && request.approvedBy.length > 0 && (
                                      <div>
                                        <label className="text-sm font-medium text-gray-600">Already Approved By</label>
                                        <div className="mt-2 space-y-1">
                                          {request.approvedBy.map((approver, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                              <CheckCircle className="h-4 w-4 text-green-500" />
                                              <span className="text-sm">{approver}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <Alert>
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertDescription>
                                        {request.amount >= 1000
                                          ? "This expense requires multiple approvals. After you approve, it will move to the next approver."
                                          : "This expense only requires your approval to be fully approved."}
                                      </AlertDescription>
                                    </Alert>
                                  </TabsContent>

                                  <TabsContent value="attachments">
                                    <div className="space-y-2">
                                      {request.attachments.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No attachments</p>
                                      ) : (
                                        request.attachments.map((attachment, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center justify-between p-3 border rounded"
                                          >
                                            <span>{attachment}</span>
                                            <Button variant="outline" size="sm">
                                              Download
                                            </Button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>

                                <DialogFooter className="gap-2">
                                  {user?.role !== "admin" ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleReject(request.id)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2"
                                      >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                      </Button>
                                      <Button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        {isProcessing ? "Processing..." : "Approve"}
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 text-center w-full">
                                      Administrators can view transactions but cannot approve expenses
                                    </div>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Submitted by:</span> {request.submitter_name}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {request.category}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {request.submittedDate}
                          </div>
                        </div>

                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-medium">Description:</span> {request.description}
                        </div>

                        {/* Approval Flow Preview */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-blue-900 mb-2">Approval Progress:</div>
                          {renderApprovalFlow(request)}
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
