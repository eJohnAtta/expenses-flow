"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, DollarSign, AlertCircle, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"

interface BudgetLevel {
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

export default function BudgetLevels() {
  const [budgetLevels, setBudgetLevels] = useState<BudgetLevel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [databaseError, setDatabaseError] = useState(false)
  const [newBudgetLevel, setNewBudgetLevel] = useState({
    name: "",
    minAmount: "",
    maxAmount: "",
    requiredApprovers: "1",
    description: "",
    approverLevels: [2], // Default to manager level
  })
  const [editingLevel, setEditingLevel] = useState<BudgetLevel | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    loadBudgetLevels()
  }, [])

  const loadBudgetLevels = async () => {
    try {
      setIsLoading(true)
      setDatabaseError(false)

      // Try to load from database
      try {
        const { budgetService } = await import("@/lib/database")
        const data = await budgetService.getAll()
        console.log("Loaded budget levels from database:", data)
        setBudgetLevels(data)
      } catch (dbError) {
        console.log("Database not available, using mock data:", dbError)
        setDatabaseError(true)
        loadMockBudgetLevels()
      }
    } catch (error) {
      console.error("Error loading budget levels:", error)
      setDatabaseError(true)
      loadMockBudgetLevels()
    } finally {
      setIsLoading(false)
    }
  }

  const loadMockBudgetLevels = () => {
    // Mock budget levels data
    const mockBudgetLevels: BudgetLevel[] = [
      {
        id: "1",
        name: "Small Expenses",
        min_amount: 0,
        max_amount: 999,
        required_approvers: 1,
        approver_levels: [2],
        description: "Small day-to-day expenses requiring single manager approval",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Medium Expenses",
        min_amount: 1000,
        max_amount: 4999,
        required_approvers: 2,
        approver_levels: [2, 1],
        description: "Medium expenses requiring manager and director approval",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Large Expenses",
        min_amount: 5000,
        max_amount: 19999,
        required_approvers: 3,
        approver_levels: [2, 1],
        description: "Large expenses requiring multiple levels of approval",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "4",
        name: "Major Expenses",
        min_amount: 20000,
        max_amount: 999999,
        required_approvers: 3,
        approver_levels: [2, 1],
        description: "Major expenses requiring executive approval",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    console.log("Loading mock budget levels:", mockBudgetLevels)
    setBudgetLevels(mockBudgetLevels)
  }

  const handleDeleteBudgetLevel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget level?")) {
      return
    }

    try {
      if (!databaseError) {
        // Try to delete from database
        try {
          const { budgetService } = await import("@/lib/database")
          await budgetService.delete(id)
          await loadBudgetLevels() // Reload from database
        } catch (dbError) {
          console.error("Database error, removing from mock data:", dbError)
          // Remove from mock data as fallback
          setBudgetLevels(budgetLevels.filter((level) => level.id !== id))
        }
      } else {
        // Remove from mock data
        setBudgetLevels(budgetLevels.filter((level) => level.id !== id))
      }
    } catch (error) {
      console.error("Error deleting budget level:", error)
      alert("Error deleting budget level. Please try again.")
    }
  }

  const getApprovalFlow = (level: BudgetLevel) => {
    const flows = []
    if (level.approver_levels.includes(3)) flows.push("Employee Manager")
    if (level.approver_levels.includes(2)) flows.push("Department Manager")
    if (level.approver_levels.includes(1)) flows.push("Director/Executive")
    return flows.join(" → ")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleSaveBudgetLevel = async () => {
    try {
      // Validate required fields
      if (!newBudgetLevel.name || !newBudgetLevel.minAmount || !newBudgetLevel.maxAmount) {
        alert("Please fill in all required fields")
        return
      }

      const minAmount = Number.parseFloat(newBudgetLevel.minAmount)
      const maxAmount = Number.parseFloat(newBudgetLevel.maxAmount)
      const requiredApprovers = Number.parseInt(newBudgetLevel.requiredApprovers)

      if (minAmount >= maxAmount) {
        alert("Maximum amount must be greater than minimum amount")
        return
      }

      if (newBudgetLevel.approverLevels.length === 0) {
        alert("Please select at least one approver level")
        return
      }

      const budgetLevelData = {
        name: newBudgetLevel.name,
        min_amount: minAmount,
        max_amount: maxAmount,
        required_approvers: requiredApprovers,
        approver_levels: newBudgetLevel.approverLevels,
        description: newBudgetLevel.description,
        is_active: true,
      }

      if (!databaseError) {
        try {
          const { budgetService } = await import("@/lib/database")

          if (editingLevel) {
            // Update existing budget level
            await budgetService.update(editingLevel.id, budgetLevelData)
          } else {
            // Create new budget level
            await budgetService.create(budgetLevelData)
          }

          await loadBudgetLevels() // Reload from database
        } catch (dbError) {
          console.error("Database error:", dbError)
          // Handle mock data update
          if (editingLevel) {
            setBudgetLevels(
              budgetLevels.map((level) =>
                level.id === editingLevel.id
                  ? { ...level, ...budgetLevelData, updated_at: new Date().toISOString() }
                  : level,
              ),
            )
          } else {
            const newMockBudgetLevel: BudgetLevel = {
              id: `mock-${Date.now()}`,
              ...budgetLevelData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setBudgetLevels([...budgetLevels, newMockBudgetLevel])
          }
        }
      } else {
        // Handle mock data
        if (editingLevel) {
          setBudgetLevels(
            budgetLevels.map((level) =>
              level.id === editingLevel.id
                ? { ...level, ...budgetLevelData, updated_at: new Date().toISOString() }
                : level,
            ),
          )
        } else {
          const newMockBudgetLevel: BudgetLevel = {
            id: `mock-${Date.now()}`,
            ...budgetLevelData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setBudgetLevels([...budgetLevels, newMockBudgetLevel])
        }
      }

      // Reset form
      setNewBudgetLevel({
        name: "",
        minAmount: "",
        maxAmount: "",
        requiredApprovers: "1",
        description: "",
        approverLevels: [2],
      })
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      setEditingLevel(null)
    } catch (error) {
      console.error("Error saving budget level:", error)
      alert("Error saving budget level. Please try again.")
    }
  }

  const handleApproverLevelChange = (level: number, checked: boolean) => {
    if (checked) {
      setNewBudgetLevel({
        ...newBudgetLevel,
        approverLevels: [...newBudgetLevel.approverLevels, level].sort((a, b) => b - a),
      })
    } else {
      setNewBudgetLevel({
        ...newBudgetLevel,
        approverLevels: newBudgetLevel.approverLevels.filter((l) => l !== level),
      })
    }
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading budget levels...</p>
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
          <div className="max-w-6xl mx-auto space-y-6">
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
                <h1 className="text-3xl font-bold text-gray-900">Budget Levels & Approval Rules</h1>
                <p className="text-gray-600 mt-1">Configure approval thresholds and budget limits</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={loadBudgetLevels} className="flex items-center gap-2 bg-transparent">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>

                <Dialog
                  open={isAddDialogOpen || isEditDialogOpen}
                  onOpenChange={(open) => {
                    if (!open) {
                      setIsAddDialogOpen(false)
                      setIsEditDialogOpen(false)
                      setEditingLevel(null)
                      setNewBudgetLevel({
                        name: "",
                        minAmount: "",
                        maxAmount: "",
                        requiredApprovers: "1",
                        description: "",
                        approverLevels: [2],
                      })
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Budget Level
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingLevel ? "Edit Budget Level" : "Add New Budget Level"}</DialogTitle>
                      <DialogDescription>
                        {editingLevel
                          ? "Update the budget level configuration"
                          : "Create a new budget level with approval requirements"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Level Name *</Label>
                        <Input
                          id="name"
                          value={newBudgetLevel.name}
                          onChange={(e) => setNewBudgetLevel({ ...newBudgetLevel, name: e.target.value })}
                          placeholder="e.g., Small Expenses"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="minAmount">Minimum Amount ($) *</Label>
                          <Input
                            id="minAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newBudgetLevel.minAmount}
                            onChange={(e) => setNewBudgetLevel({ ...newBudgetLevel, minAmount: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxAmount">Maximum Amount ($) *</Label>
                          <Input
                            id="maxAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newBudgetLevel.maxAmount}
                            onChange={(e) => setNewBudgetLevel({ ...newBudgetLevel, maxAmount: e.target.value })}
                            placeholder="999.99"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="requiredApprovers">Required Approvers</Label>
                        <Input
                          id="requiredApprovers"
                          type="number"
                          min="1"
                          max="5"
                          value={newBudgetLevel.requiredApprovers}
                          onChange={(e) => setNewBudgetLevel({ ...newBudgetLevel, requiredApprovers: e.target.value })}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label>Approval Flow Levels *</Label>
                        <p className="text-sm text-gray-600 mb-3">
                          Select which organizational levels are required to approve expenses in this range
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="level-3"
                              checked={newBudgetLevel.approverLevels.includes(3)}
                              onCheckedChange={(checked) => handleApproverLevelChange(3, checked as boolean)}
                            />
                            <Label htmlFor="level-3" className="text-sm">
                              Level 3 - Employee Manager (Direct supervisor)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="level-2"
                              checked={newBudgetLevel.approverLevels.includes(2)}
                              onCheckedChange={(checked) => handleApproverLevelChange(2, checked as boolean)}
                            />
                            <Label htmlFor="level-2" className="text-sm">
                              Level 2 - Department Manager
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="level-1"
                              checked={newBudgetLevel.approverLevels.includes(1)}
                              onCheckedChange={(checked) => handleApproverLevelChange(1, checked as boolean)}
                            />
                            <Label htmlFor="level-1" className="text-sm">
                              Level 1 - Director/Executive
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newBudgetLevel.description}
                          onChange={(e) => setNewBudgetLevel({ ...newBudgetLevel, description: e.target.value })}
                          placeholder="Describe when this budget level applies..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false)
                          setIsEditDialogOpen(false)
                          setEditingLevel(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveBudgetLevel}>
                        {editingLevel ? "Update Budget Level" : "Add Budget Level"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Budget Levels List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgetLevels.length === 0 ? (
                <div className="col-span-2">
                  <Card>
                    <CardContent className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No budget levels found</h3>
                      <p className="text-gray-600">
                        {databaseError
                          ? "Database connection failed. Please check your connection and run the SQL scripts."
                          : "Start by adding your first budget level or run the seed data script."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                budgetLevels.map((level) => (
                  <Card key={level.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{level.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLevel(level)
                              setNewBudgetLevel({
                                name: level.name,
                                minAmount: level.min_amount.toString(),
                                maxAmount: level.max_amount.toString(),
                                requiredApprovers: level.required_approvers.toString(),
                                description: level.description || "",
                                approverLevels: level.approver_levels,
                              })
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBudgetLevel(level.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{level.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Amount Range</Label>
                          <div className="text-lg font-semibold">
                            {formatCurrency(level.min_amount)} - {formatCurrency(level.max_amount)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Required Approvers</Label>
                          <div className="text-lg font-semibold">{level.required_approvers}</div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-600">Approval Flow</Label>
                        <div className="text-sm text-gray-700 mt-1">{getApprovalFlow(level) || "Manager Approval"}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={level.is_active ? "default" : "secondary"}>
                          {level.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">Level {level.approver_levels.join(", ")}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Budget Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{budgetLevels.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {budgetLevels.filter((level) => level.is_active).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Max Budget Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {budgetLevels.length > 0
                      ? formatCurrency(Math.max(...budgetLevels.map((level) => level.max_amount)))
                      : "$0"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
