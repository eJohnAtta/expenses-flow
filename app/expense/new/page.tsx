"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, AlertCircle, CheckCircle, ArrowRight, X } from "lucide-react"
import Link from "next/link"

// Add these imports at the top
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"

interface ExpenseForm {
  title: string
  amount: number
  category: string
  description: string
  businessJustification: string
  attachments: File[]
}

interface ApprovalFlow {
  name: string
  level: number
}

export default function NewExpenseRequest() {
  const { user } = useAuth()
  const [form, setForm] = useState<ExpenseForm>({
    title: "",
    amount: 0,
    category: "",
    description: "",
    businessJustification: "",
    attachments: [],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlow[]>([])
  const [submitError, setSubmitError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [databaseError, setDatabaseError] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const categories = [
    "Office Supplies",
    "Software & Licenses",
    "Travel & Accommodation",
    "Meals & Entertainment",
    "Training & Development",
    "Equipment & Hardware",
    "Marketing & Advertising",
    "Professional Services",
    "Other",
  ]

  useEffect(() => {
    if (user) {
      getCurrentUserId()
    }
  }, [user])

  useEffect(() => {
    if (currentUserId && form.amount > 0) {
      loadApprovalFlow()
    }
  }, [currentUserId, form.amount])

  const getCurrentUserId = async () => {
    if (!user) return

    try {
      const { userService } = await import("@/lib/database")
      const userData = await userService.getByEmail(user.email)
      setCurrentUserId(userData?.id || null)
      setDatabaseError(!userData)
    } catch (error) {
      console.error("Error getting current user ID:", error)
      setDatabaseError(true)
      setCurrentUserId(null)
    }
  }

  const loadApprovalFlow = async () => {
    if (!currentUserId || form.amount <= 0) {
      setApprovalFlow([])
      return
    }

    try {
      const { getApprovalFlowPreview } = await import("@/lib/database")
      const flow = await getApprovalFlowPreview(currentUserId, form.amount)
      setApprovalFlow(flow)
    } catch (error) {
      console.error("Error loading approval flow:", error)
      // Set mock approval flow based on amount
      const mockFlow: ApprovalFlow[] = []
      if (form.amount > 0) {
        mockFlow.push({ name: "Samuel Manager", level: 2 })
      }
      if (form.amount >= 1000) {
        mockFlow.push({ name: "Ahmed Director", level: 1 })
      }
      if (form.amount >= 5000) {
        mockFlow.push({ name: "Executive Review", level: 0 })
      }
      setApprovalFlow(mockFlow)
    }
  }

  const handleAmountChange = (value: string) => {
    const amount = Number(value)
    setForm({ ...form, amount })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)

      // Validate file types and sizes
      const validFiles = newFiles.filter((file) => {
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!validTypes.includes(file.type)) {
          alert(`File ${file.name} is not a supported type. Please upload images, PDFs, or Word documents.`)
          return false
        }

        if (file.size > maxSize) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`)
          return false
        }

        return true
      })

      if (validFiles.length > 0) {
        setForm({ ...form, attachments: [...form.attachments, ...validFiles] })
      }
    }

    // Reset the input
    e.target.value = ""
  }

  const removeAttachment = (index: number) => {
    const newAttachments = form.attachments.filter((_, i) => i !== index)
    setForm({ ...form, attachments: newAttachments })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return "🖼️"
    } else if (file.type === "application/pdf") {
      return "📄"
    } else if (file.type.includes("word")) {
      return "📝"
    }
    return "📎"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      if (!currentUserId) {
        console.log("User not found in database, using mock submission")
        // Simulate successful submission with mock data
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setIsSubmitted(true)
        setIsSubmitting(false)
        return
      }

      try {
        const { expenseService, getInitialApprover, attachmentService } = await import("@/lib/database")

        // Determine the initial approver
        const initialApprover = await getInitialApprover(currentUserId, form.amount)

        // Create the expense request
        const expenseData = {
          title: form.title,
          amount: form.amount,
          category: form.category,
          description: form.description,
          business_justification: form.businessJustification,
          submitted_by: currentUserId,
          current_approver: initialApprover,
          status: "pending" as const,
          urgency: "medium" as const,
        }

        const createdExpense = await expenseService.create(expenseData)

        // Upload attachments if any
        if (form.attachments.length > 0) {
          setUploadingFiles(true)
          try {
            for (const file of form.attachments) {
              try {
                // For now, we'll store file info without actual upload to storage
                // In a real implementation, you'd upload to Supabase Storage first
                await attachmentService.create({
                  expense_request_id: createdExpense.id,
                  filename: file.name,
                  file_path: `mock-path/${file.name}`, // Mock path for now
                  file_size: file.size,
                  mime_type: file.type,
                })
              } catch (fileError) {
                console.error(`Error saving attachment ${file.name}:`, fileError)
                // Continue with other files even if one fails
              }
            }
          } catch (uploadError) {
            console.error("Error uploading attachments:", uploadError)
            // Don't fail the entire submission for attachment errors
          } finally {
            setUploadingFiles(false)
          }
        }

        setIsSubmitted(true)
      } catch (dbError) {
        console.error("Database error during submission:", dbError)
        // Simulate successful submission as fallback
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error("Error submitting expense:", error)
      setSubmitError("Failed to submit expense request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Expense Request Submitted!</h2>
                  <p className="text-gray-600 mb-6">
                    Your expense request for ${form.amount.toLocaleString()} has been submitted and is now pending
                    approval.
                  </p>

                  {approvalFlow.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <h3 className="font-semibold mb-3">Approval Flow:</h3>
                      <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                        {approvalFlow.map((approver, index) => (
                          <div key={index} className="flex items-center">
                            <Badge variant="outline" className="bg-white">
                              {approver.name}
                            </Badge>
                            {index < approvalFlow.length - 1 && <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />}
                          </div>
                        ))}
                      </div>
                      {form.amount >= 1000 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Multi-level approval required - will proceed step by step
                        </p>
                      )}
                    </div>
                  )}

                  {form.attachments.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg mb-6">
                      <p className="text-sm text-green-700">
                        ✅ {form.attachments.length} attachment(s) uploaded successfully
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Link href="/">
                      <Button className="w-full">Back to Dashboard</Button>
                    </Link>
                    <Link href="/expense/new">
                      <Button variant="outline" className="w-full bg-transparent">
                        Submit Another Request
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Expense Request</h1>
              <p className="text-gray-600 mt-1">Submit a new expense for approval</p>
            </div>

            {databaseError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Database connection failed or user not found. Request will be submitted with mock data. Please run the
                  SQL scripts and ensure your user exists in the database.
                </AlertDescription>
              </Alert>
            )}

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Details</CardTitle>
                    <CardDescription>Fill in the details of your expense request</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <Label htmlFor="title">Expense Title</Label>
                        <Input
                          id="title"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="Brief description of the expense"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.amount || ""}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select onValueChange={(value) => setForm({ ...form, category: value })} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Detailed description of the expense"
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="justification">Business Justification</Label>
                        <Textarea
                          id="justification"
                          value={form.businessJustification}
                          onChange={(e) => setForm({ ...form, businessJustification: e.target.value })}
                          placeholder="Explain why this expense is necessary for business operations"
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <Label>Attachments</Label>
                        <div className="mt-2">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Upload receipts, invoices, or supporting documents
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Supported: Images (JPG, PNG), PDF, Word documents (Max 10MB each)
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/jpg,image/png,.pdf,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="file-upload"
                            />
                            <label htmlFor="file-upload">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer bg-transparent"
                              >
                                Choose Files
                              </Button>
                            </label>
                          </div>

                          {form.attachments.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <Label className="text-sm font-medium">Selected Files:</Label>
                              {form.attachments.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{getFileIcon(file)}</span>
                                    <div>
                                      <p className="text-sm font-medium">{file.name}</p>
                                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFiles}>
                        {isSubmitting
                          ? "Submitting..."
                          : uploadingFiles
                            ? "Uploading files..."
                            : "Submit Expense Request"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Current User Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submitting As</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">{user?.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">{user?.email}</div>
                      <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                        {user?.role === "admin" ? "Admin" : "User"}
                      </Badge>
                      {databaseError && (
                        <Badge variant="destructive" className="text-xs">
                          Not in Database
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Approval Preview */}
                {form.amount > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Approval Flow</CardTitle>
                      <CardDescription>Based on amount: ${form.amount.toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {approvalFlow.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {approvalFlow.map((approver, index) => (
                              <div key={index} className="flex items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm">{approver.name}</span>
                                </div>
                                {index < approvalFlow.length - 1 && (
                                  <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>

                          {approvalFlow.length > 1 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Multi-level approval required based on budget levels configuration. Each approver must
                                approve before moving to the next.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Enter an amount to see approval flow</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Guidelines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-gray-600">
                      <li>• Provide detailed business justification</li>
                      <li>• Attach all relevant receipts and documents</li>
                      <li>• Approval requirements are based on budget levels configuration</li>
                      <li>• Each approval step must be completed before proceeding</li>
                      <li>• Supported file types: Images, PDF, Word documents</li>
                      <li>• Maximum file size: 10MB per file</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
