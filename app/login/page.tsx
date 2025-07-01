"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Demo users for testing
  const demoUsers = [
    { email: "admin@company.com", password: "admin123", role: "admin", name: "System Admin" },
    { email: "ahmed@company.com", password: "ahmed123", role: "user", name: "Ahmed Director" },
    { email: "samuel@company.com", password: "samuel123", role: "user", name: "Samuel Manager" },
    { email: "john@company.com", password: "john123", role: "user", name: "John Doe" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("Attempting login with:", email) // Debug log

    // Simple demo authentication
    const user = demoUsers.find((u) => u.email === email && u.password === password)

    if (user) {
      console.log("Login successful for user:", user) // Debug log
      // Store user info in localStorage for demo purposes
      localStorage.setItem("expense-app-user", JSON.stringify(user))
      router.push("/")
    } else {
      console.log("Login failed - invalid credentials") // Debug log
      setError("Invalid email or password")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add this after the manual login form, before the demo credentials card */}
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmail("admin@company.com")
              setPassword("admin123")
            }}
            className="text-sm"
          >
            Quick Fill Admin Credentials
          </Button>
        </div>

        {/* Demo Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo Credentials</CardTitle>
            <CardDescription>Use these credentials to test different roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-semibold text-blue-900">Admin Account</div>
                <div className="text-blue-700">admin@company.com / admin123</div>
                <div className="text-xs text-blue-600">Full system access</div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-semibold text-green-900">Manager Accounts</div>
                <div className="text-green-700">ahmed@company.com / ahmed123 (Director)</div>
                <div className="text-green-700">samuel@company.com / samuel123 (Manager)</div>
                <div className="text-xs text-green-600">Can approve expenses</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900">Employee Account</div>
                <div className="text-gray-700">john@company.com / john123</div>
                <div className="text-xs text-gray-600">Can submit expense requests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
