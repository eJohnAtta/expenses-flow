"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
import { Users, Plus, Edit, Trash2, AlertCircle, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"

interface User {
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

export default function OrganizationStructure() {
  const [employees, setEmployees] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [databaseError, setDatabaseError] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading employees...")
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    managerId: "",
    role: "user" as "admin" | "user",
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setIsLoading(true)
      setLoadingMessage("Connecting to database...")
      setDatabaseError(false)

      // Try to load from database
      try {
        const { userService } = await import("@/lib/database")
        setLoadingMessage("Loading employees from database...")
        const data = await userService.getAll()
        console.log("Loaded employees from database:", data)
        setEmployees(data)
        setLoadingMessage("")
      } catch (dbError) {
        console.log("Database not available, using mock data:", dbError)
        setDatabaseError(true)
        setLoadingMessage("Loading mock data...")
        loadMockEmployees()
      }
    } catch (error) {
      console.error("Error loading employees:", error)
      setDatabaseError(true)
      setLoadingMessage("Loading mock data...")
      loadMockEmployees()
    } finally {
      setIsLoading(false)
      setLoadingMessage("")
    }
  }

  const loadMockEmployees = () => {
    // Mock employees data that matches the seed data
    const mockEmployees: User[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        email: "admin@company.com",
        name: "System Admin",
        role: "admin",
        position: "System Administrator",
        department: "IT",
        level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        email: "ahmed@company.com",
        name: "Ahmed Director",
        role: "user",
        position: "Director",
        department: "Executive",
        level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440003",
        email: "samuel@company.com",
        name: "Samuel Manager",
        role: "user",
        position: "Manager",
        department: "Operations",
        manager_id: "550e8400-e29b-41d4-a716-446655440002",
        level: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440004",
        email: "john@company.com",
        name: "John Doe",
        role: "user",
        position: "Employee",
        department: "Operations",
        manager_id: "550e8400-e29b-41d4-a716-446655440003",
        level: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440005",
        email: "jane@company.com",
        name: "Jane Smith",
        role: "user",
        position: "Senior Employee",
        department: "Operations",
        manager_id: "550e8400-e29b-41d4-a716-446655440003",
        level: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440006",
        email: "mike@company.com",
        name: "Mike Johnson",
        role: "user",
        position: "Employee",
        department: "Operations",
        manager_id: "550e8400-e29b-41d4-a716-446655440003",
        level: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    console.log("Loading mock employees:", mockEmployees)
    setEmployees(mockEmployees)
  }

  const getManagerName = (managerId?: string) => {
    if (!managerId) return "No Manager"
    const manager = employees.find((emp) => emp.id === managerId)
    return manager ? manager.name : "Unknown"
  }

  const getDirectReports = (employeeId: string) => {
    return employees.filter((emp) => emp.manager_id === employeeId)
  }

  const handleAddEmployee = async () => {
    try {
      // Validate required fields
      if (!newEmployee.name || !newEmployee.email || !newEmployee.position || !newEmployee.department) {
        alert("Please fill in all required fields")
        return
      }

      // Check if email already exists
      if (employees.some((emp) => emp.email === newEmployee.email)) {
        alert("An employee with this email already exists")
        return
      }

      const managerLevel =
        newEmployee.managerId && newEmployee.managerId !== ""
          ? employees.find((emp) => emp.id === newEmployee.managerId)?.level || 0
          : 0

      const employeeData = {
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
        position: newEmployee.position,
        department: newEmployee.department,
        manager_id: newEmployee.managerId && newEmployee.managerId !== "" ? newEmployee.managerId : undefined,
        level: managerLevel + 1,
      }

      if (!databaseError) {
        // Try to save to database
        try {
          const { userService } = await import("@/lib/database")
          await userService.create(employeeData)
          await loadEmployees() // Reload from database
        } catch (dbError) {
          console.error("Database error, adding to mock data:", dbError)
          // Add to mock data as fallback
          const newMockEmployee: User = {
            id: `mock-${Date.now()}`,
            ...employeeData,
            manager_id: employeeData.manager_id || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setEmployees([...employees, newMockEmployee])
        }
      } else {
        // Add to mock data
        const newMockEmployee: User = {
          id: `mock-${Date.now()}`,
          ...employeeData,
          manager_id: employeeData.manager_id || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setEmployees([...employees, newMockEmployee])
      }

      // Reset form
      setNewEmployee({ name: "", email: "", position: "", department: "", managerId: "", role: "user" })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding employee:", error)
      alert("Error adding employee. Please try again.")
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) {
      return
    }

    try {
      if (!databaseError) {
        // Try to delete from database
        try {
          const { userService } = await import("@/lib/database")
          await userService.delete(id)
          await loadEmployees() // Reload from database
        } catch (dbError) {
          console.error("Database error, removing from mock data:", dbError)
          // Remove from mock data as fallback
          setEmployees(employees.filter((emp) => emp.id !== id))
        }
      } else {
        // Remove from mock data
        setEmployees(employees.filter((emp) => emp.id !== id))
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      alert("Error deleting employee. Please try again.")
    }
  }

  const renderEmployeeTree = (parentId?: string, level = 0) => {
    // Handle top-level employees (those with no manager)
    const childEmployees = employees.filter((emp) => {
      if (parentId === undefined) {
        // For top level, find employees with no manager_id or null manager_id
        return !emp.manager_id || emp.manager_id === null
      }
      // For other levels, match the exact parent ID
      return emp.manager_id === parentId
    })

    console.log(
      `Rendering level ${level}, parentId: ${parentId || "TOP_LEVEL"}, found ${childEmployees.length} employees:`,
      childEmployees.map((e) => e.name),
    )

    if (childEmployees.length === 0) {
      return null
    }

    return childEmployees.map((employee) => (
      <div key={employee.id} style={{ marginLeft: `${level * 24}px` }}>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-gray-600">
                    {employee.position} - {employee.department}
                  </p>
                  <p className="text-xs text-gray-500">{employee.email}</p>
                  {employee.manager_id && (
                    <p className="text-xs text-blue-600">Reports to: {getManagerName(employee.manager_id)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Level {employee.level}</Badge>
                <Badge variant={employee.role === "admin" ? "default" : "secondary"}>{employee.role}</Badge>
                <Badge variant="secondary">{getDirectReports(employee.id).length} Reports</Badge>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteEmployee(employee.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {renderEmployeeTree(employee.id, level + 1)}
      </div>
    ))
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
                  <p className="text-gray-600">{loadingMessage}</p>
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

            {/* Debug Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debug: Found {employees.length} employees. Top-level employees:{" "}
                {employees.filter((emp) => !emp.manager_id).length}
                {databaseError ? " (Using mock data)" : " (From database)"}
              </AlertDescription>
            </Alert>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Organization Structure</h1>
                <p className="text-gray-600 mt-1">Define company hierarchy and reporting relationships</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={loadEmployees} className="flex items-center gap-2 bg-transparent">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>Add a new employee to the organization structure</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={newEmployee.position}
                          onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                          placeholder="Enter position title"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Department *</Label>
                        <Select onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Executive">Executive</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="IT">Information Technology</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                          onValueChange={(value: "admin" | "user") => setNewEmployee({ ...newEmployee, role: value })}
                          defaultValue="user"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="manager">Manager (Optional)</Label>
                        <Select
                          onValueChange={(value) =>
                            setNewEmployee({ ...newEmployee, managerId: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Manager</SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} - {emp.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddEmployee}>Add Employee</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Organization Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Hierarchy</CardTitle>
                <CardDescription>
                  Visual representation of company structure and reporting relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                      <p className="text-gray-600">
                        {databaseError
                          ? "Database connection failed. Please check your connection and run the SQL scripts."
                          : "Start by adding your first employee or run the seed data script."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                        <p>
                          <strong>Debug Info:</strong>
                        </p>
                        <p>Total employees: {employees.length}</p>
                        <p>Top-level employees (no manager): {employees.filter((emp) => !emp.manager_id).length}</p>
                        <p>
                          Top-level names:{" "}
                          {employees
                            .filter((emp) => !emp.manager_id)
                            .map((e) => e.name)
                            .join(", ")}
                        </p>
                      </div>
                      <h4 className="font-medium mb-4">Organization Tree:</h4>
                      <div className="border-l-2 border-gray-200 pl-4">{renderEmployeeTree()}</div>
                      {employees.filter((emp) => !emp.manager_id).length === 0 && (
                        <div className="text-center py-4 text-yellow-600">
                          <p>All employees have managers assigned. No top-level employees found.</p>
                          <p>
                            This might indicate a data issue - there should be at least one employee without a manager.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee List (Flat view for debugging) */}
            <Card>
              <CardHeader>
                <CardTitle>All Employees (Debug View)</CardTitle>
                <CardDescription>Flat list of all employees for debugging</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{employee.name}</span>
                        <span className="text-sm text-gray-600 ml-2">({employee.email})</span>
                        <span className="text-sm text-gray-500 ml-2">
                          Manager: {employee.manager_id ? getManagerName(employee.manager_id) : "None"}
                        </span>
                      </div>
                      <Badge variant="outline">Level {employee.level}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{employees.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Management Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {employees.length > 0 ? Math.max(...employees.map((emp) => emp.level)) : 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {new Set(employees.map((emp) => emp.department).filter(Boolean)).size}
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
