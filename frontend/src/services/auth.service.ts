/**
 * Auth Service
 * Service for authentication and user management
 */

import { apiClient } from '@/lib/api-client'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'student'
  avatarUrl?: string
}

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  acceptTerms: boolean
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class AuthService {
  // Login user
  async login(credentials: LoginData): Promise<AuthResponse | null> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
      
      if (response.data.success) {
        const authData = response.data.data
        
        // Store tokens
        localStorage.setItem('doramaflix_tokens', JSON.stringify({
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken
        }))
        
        // Store user data
        localStorage.setItem('doramaflix_user', JSON.stringify(authData.user))
        
        // Set auth token for future requests
        apiClient.setAuthToken(authData.accessToken)
        
        return authData
      }
      
      return null
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  // Register user
  async register(userData: RegisterData): Promise<User | null> {
    try {
      const response = await apiClient.post<ApiResponse<{ user: User }>>('/auth/register', userData)
      
      if (response.data.success) {
        return response.data.data.user
      }
      
      return null
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and auth token
      localStorage.removeItem('doramaflix_tokens')
      localStorage.removeItem('doramaflix_user')
      apiClient.clearAuthToken()
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem('doramaflix_user')
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const tokens = this.getTokens()
    return !!(tokens?.accessToken)
  }

  // Get stored tokens
  getTokens(): { accessToken: string; refreshToken: string } | null {
    try {
      const tokens = localStorage.getItem('doramaflix_tokens')
      return tokens ? JSON.parse(tokens) : null
    } catch {
      return null
    }
  }

  // Initialize auth from storage
  initializeAuth(): void {
    const tokens = this.getTokens()
    if (tokens?.accessToken) {
      apiClient.setAuthToken(tokens.accessToken)
    }
  }

  // Check if user has admin role
  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'admin'
  }

  // Check if user has manager role
  isManager(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'manager' || user?.role === 'admin'
  }
}

// Create and export singleton instance
export const authService = new AuthService()
export default authService