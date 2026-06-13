import { useAuthStore } from '@/stores/auth-store'
import { useBusinessProfile } from '@/features/business/api'
import type { CustomerType } from '@/types'

export function useApprovedBusinessPricing() {
  const user = useAuthStore((s) => s.user)
  const { data: business } = useBusinessProfile()
  const isApprovedBusiness = business?.profile?.status === 'approved'
  const customerType = (isApprovedBusiness ? user?.customerType : 'retail') ?? 'retail'
  const hasB2BAccess = isApprovedBusiness && customerType !== 'retail'

  return {
    isApprovedBusiness,
    customerType: customerType as CustomerType,
    hasB2BAccess,
    profile: business?.profile ?? null,
  }
}