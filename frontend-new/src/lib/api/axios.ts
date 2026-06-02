import axios, { AxiosError, type AxiosInstance } from 'axios'
import { getAccessToken, handleUnauthorized } from '@/lib/auth-token'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Backend error envelope: usually `{ message }`, sometimes `{ message, detail }`. */
export interface ApiErrorBody {
  message?: string
  detail?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data ?? {}
    const message =
      body.message ||
      error.message ||
      'Đã có lỗi xảy ra, vui lòng thử lại.'

    // 401 anywhere (except the login attempt itself) means the session is dead.
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      handleUnauthorized()
    }

    return Promise.reject(new ApiError(message, status, body))
  },
)

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
