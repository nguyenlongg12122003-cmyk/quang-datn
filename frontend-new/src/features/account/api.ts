import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  userApi,
  type AddAddressPayload,
  type UpdateProfilePayload,
} from '@/lib/api/endpoints/users'
import { authApi } from '@/lib/api/endpoints/auth'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

/** Re-fetch /auth/me and push into the auth store (mutations return only acks). */
function useRefreshMe() {
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()
  return async () => {
    const user = await authApi.me()
    setUser(user)
    queryClient.setQueryData(queryKeys.auth.me, user)
  }
}

export function useUpdateProfile() {
  const refreshMe = useRefreshMe()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: refreshMe,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      userApi.changePassword(oldPassword, newPassword),
  })
}

export function useAddAddress() {
  const refreshMe = useRefreshMe()
  return useMutation({
    mutationFn: (payload: AddAddressPayload) => userApi.addAddress(payload),
    onSuccess: refreshMe,
  })
}

export function useDeleteAddress() {
  const refreshMe = useRefreshMe()
  return useMutation({
    mutationFn: (id: string) => userApi.deleteAddress(id),
    onSuccess: refreshMe,
  })
}

export function useSetDefaultAddress() {
  const refreshMe = useRefreshMe()
  return useMutation({
    mutationFn: (id: string) => userApi.setDefaultAddress(id),
    onSuccess: refreshMe,
  })
}
