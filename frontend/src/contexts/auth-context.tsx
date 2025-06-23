'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { storage } from '@/lib/storage'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: 'admin' | 'manager' | 'student'
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification'
  emailVerified: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user && !!tokens

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = storage.getTokens()
        const storedUser = storage.getUser()

        if (storedTokens && storedUser) {
          setTokens(storedTokens)
          setUser(storedUser)
          
          // Set API client token
          apiClient.setAuthToken(storedTokens.accessToken)
          
          // Verify token is still valid
          try {
            const response = await apiClient.get('/auth/verify-token')
            if (response.data.user) {
              setUser(response.data.user)
              storage.setUser(response.data.user)
            }
          } catch (error) {
            // Token is invalid, try to refresh
            await handleRefreshToken()
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        handleLogout()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.post('/auth/login', credentials)
      const { user: userData, tokens: tokenData } = response.data.data

      setUser(userData)
      setTokens(tokenData)
      
      // Store in localStorage
      storage.setTokens(tokenData)
      storage.setUser(userData)
      
      // Set API client token
      apiClient.setAuthToken(tokenData.accessToken)
      
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.post('/auth/register', data)
      const { user: userData, tokens: tokenData } = response.data.data

      setUser(userData)
      setTokens(tokenData)
      
      // Store in localStorage
      storage.setTokens(tokenData)
      storage.setUser(userData)
      
      // Set API client token
      apiClient.setAuthToken(tokenData.accessToken)
      
      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint if user is authenticated
      if (tokens) {
        await apiClient.post('/auth/logout')
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      handleLogout()
    }
  }

  const handleLogout = () => {
    setUser(null)
    setTokens(null)
    
    // Clear storage
    storage.clearAuth()
    
    // Clear API client token
    apiClient.clearAuthToken()
    
    toast.success('Logged out successfully')
    router.push('/')
  }

  const handleRefreshToken = async () => {
    try {
      const storedTokens = storage.getTokens()
      if (!storedTokens?.refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken: storedTokens.refreshToken,
      })
      
      const newTokens = response.data.data.tokens
      setTokens(newTokens)
      storage.setTokens(newTokens)
      apiClient.setAuthToken(newTokens.accessToken)
      
      return newTokens
    } catch (error) {
      console.error('Token refresh failed:', error)
      handleLogout()
      throw error
    }
  }

  const refreshToken = async () => {
    await handleRefreshToken()
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      storage.setUser(updatedUser)
    }
  }

  // Setup automatic token refresh
  useEffect(() => {
    if (!tokens) return

    const setupTokenRefresh = () => {
      const expiresIn = parseInt(tokens.expiresIn.replace(/\D/g, '')) // Extract number from "7d", "24h", etc.
      const refreshTime = expiresIn > 30 ? (expiresIn - 5) * 60 * 1000 : 15 * 60 * 1000 // Refresh 5 minutes before expiry, or every 15 minutes

      const interval = setInterval(async () => {
        try {
          await handleRefreshToken()
        } catch (error) {
          console.error('Automatic token refresh failed:', error)
        }
      }, refreshTime)

      return () => clearInterval(interval)
    }

    const cleanup = setupTokenRefresh()
    return cleanup
  }, [tokens])

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}