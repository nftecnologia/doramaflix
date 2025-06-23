import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'

class ApiClient {
  private client: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          }
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Try to refresh token
            const refreshToken = this.getRefreshToken()
            if (refreshToken) {
              const response = await this.post('/auth/refresh', {
                refreshToken,
              })

              const { accessToken } = response.data.data.tokens
              this.setAuthToken(accessToken)
              
              // Update storage
              const tokens = JSON.parse(localStorage.getItem('doramaflix_tokens') || '{}')
              tokens.accessToken = accessToken
              localStorage.setItem('doramaflix_tokens', JSON.stringify(tokens))

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearAuthToken()
            localStorage.removeItem('doramaflix_tokens')
            localStorage.removeItem('doramaflix_user')
            window.location.href = '/auth/login'
          }
        }

        // Handle network errors
        if (!error.response) {
          toast.error('Network error. Please check your connection.')
        }
        
        // Handle 5xx server errors
        else if (error.response.status >= 500) {
          toast.error('Server error. Please try again later.')
        }
        
        // Handle 429 Rate Limit
        else if (error.response.status === 429) {
          toast.error('Too many requests. Please wait a moment.')
        }

        return Promise.reject(error)
      }
    )
  }

  // Set auth token for requests
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Clear auth token
  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization']
  }

  // Get refresh token from storage
  private getRefreshToken(): string | null {
    try {
      const tokens = JSON.parse(localStorage.getItem('doramaflix_tokens') || '{}')
      return tokens.refreshToken || null
    } catch {
      return null
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config)
  }

  // File upload
  async uploadFile<T = any>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
  }

  // Multiple file upload
  async uploadFiles<T = any>(
    url: string,
    files: File[],
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file)
    })

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      toast.error('Download failed')
      throw error
    }
  }

  // Get base URL
  getBaseURL(): string {
    return this.baseURL
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health')
      return true
    } catch {
      return false
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Export types
export type { AxiosResponse, AxiosRequestConfig }