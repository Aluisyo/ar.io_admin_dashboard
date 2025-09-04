'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User } from 'lucide-react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AR_IO_LOGO_BASE64 } from '@/lib/constants'

interface LoginFormProps {
  onLogin: () => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false, // Do not redirect automatically
        username,
        password,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        // On successful login, redirect to the dashboard
        router.push('/')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-3">
              <Image 
                src={AR_IO_LOGO_BASE64}
                alt="AR.IO" 
                width={48} 
                height={48} 
                className="rounded-lg"
              />
              <span className="text-2xl font-bold text-white">
                ar.io
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Gateway Admin</CardTitle>
          <CardDescription className="text-gray-300"> {/* Adjusted text color */}
            Sign in to access the AR.IO Gateway Admin Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-300" // Adjusted placeholder color
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-300" // Adjusted placeholder color
                placeholder="Enter password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={isLoading}>
              <User className="h-4 w-4 mr-2" />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-300"> {/* Adjusted text color */}
            Default credentials: admin / admin
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
