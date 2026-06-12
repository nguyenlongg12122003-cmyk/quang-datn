import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { BUSINESS_STATUS_LABELS, BUSINESS_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { useBusinessProfile, useRegisterBusiness, useResubmitBusiness } from '@/features/business/api'
import type { BusinessDocument, BusinessProfile, BusinessType } from '@/types'
import { isCloudinaryConfigured, uploadImageToCloudinary } from '@/lib/cloudinary'
import { Upload, Trash2, FileText } from 'lucide-react'

type FormState = {
  companyName: string
  taxCode: string
  businessType: BusinessType
  contactPerson: string
  contactPhone: string
  contactEmail: string
  invoiceAddress: string
  documents: BusinessDocument[]
}

const emptyForm = (): FormState => ({
  companyName: '',
  taxCode: '',
  businessType: 'company',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  invoiceAddress: '',
  documents: [],
})

function profileToForm(profile: BusinessProfile): FormState {
  return {
    companyName: profile.companyName,
    taxCode: profile.taxCode ?? '',
    businessType: profile.businessType,
    contactPerson: profile.contactPerson,
    contactPhone: profile.contactPhone ?? '',
    contactEmail: profile.contactEmail ?? '',
    invoiceAddress: profile.invoiceAddress ?? '',
    documents: Array.isArray(profile.documents) ? profile.documents : [],
  }
}

function BusinessRegistrationFields({
  form,
  onChange,
}: {
  form: FormState
  onChange: (next: FormState) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Tên công ty / tổ chức</Label>
        <Input
          value={form.companyName}
          onChange={(e) => onChange({ ...form, companyName: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Mã số thuế</Label>
        <Input value={form.taxCode} onChange={(e) => onChange({ ...form, taxCode: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Loại hình</Label>
        <Select
          value={form.businessType}
          onValueChange={(v) => onChange({ ...form, businessType: v as BusinessType })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Người liên hệ</Label>
        <Input
          value={form.contactPerson}
          onChange={(e) => onChange({ ...form, contactPerson: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>SĐT liên hệ</Label>
        <Input
          value={form.contactPhone}
          onChange={(e) => onChange({ ...form, contactPhone: e.target.value })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Email liên hệ</Label>
        <Input
          type="email"
          value={form.contactEmail}
          onChange={(e) => onChange({ ...form, contactEmail: e.target.value })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Địa chỉ xuất hóa đơn VAT</Label>
        <Textarea
          value={form.invoiceAddress}
          onChange={(e) => onChange({ ...form, invoiceAddress: e.target.value })}
        />
      </div>
    </div>
  )
}

function RejectedBusinessForm({
  profile,
  onSubmit,
  isPending,
}: {
  profile: BusinessProfile
  onSubmit: (payload: FormState) => void
  isPending: boolean
}) {
  const [form, setForm] = useState(() => profileToForm(profile))

  const submit = () => {
    if (!form.companyName || !form.contactPerson) {
      toast.error('Vui lòng điền tên công ty và người liên hệ')
      return
    }
    onSubmit(form)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Hồ sơ bị từ chối</h3>
        <Badge variant="secondary">{BUSINESS_STATUS_LABELS.rejected}</Badge>
      </div>
      {profile.note ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">Lý do từ chối:</span> {profile.note}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Vui lòng cập nhật thông tin và gửi lại hồ sơ để admin xem xét.
      </p>
      <BusinessRegistrationFields form={form} onChange={setForm} />

      {/* Documents (resubmit also carries forward previous docs; user can add more via main flow if needed) */}
      {form.documents && form.documents.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Giấy tờ hiện có: {form.documents.length} file (sẽ được gửi lại cùng hồ sơ)
        </div>
      )}

      <Button onClick={submit} disabled={isPending}>
        Gửi lại đăng ký doanh nghiệp
      </Button>
    </div>
  )
}

export function BusinessProfileForm() {
  const { data, isLoading } = useBusinessProfile()
  const register = useRegisterBusiness()
  const resubmit = useResubmitBusiness()
  const [form, setForm] = useState<FormState>(emptyForm)

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>

  const profile = data?.profile

  const validateAndSubmit = (mutate: typeof register.mutate) => {
    if (!form.companyName || !form.contactPerson) {
      toast.error('Vui lòng điền tên công ty và người liên hệ')
      return
    }
    mutate(form, {
      onSuccess: (res) => toast.success(res.message),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  if (profile?.status === 'rejected') {
    return (
      <RejectedBusinessForm
        profile={profile}
        onSubmit={(payload) => {
          resubmit.mutate(payload, {
            onSuccess: (res) => toast.success(res.message),
            onError: (err) => toast.error(getErrorMessage(err)),
          })
        }}
        isPending={resubmit.isPending}
      />
    )
  }

  if (profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{profile.companyName}</h3>
          <Badge variant={profile.status === 'approved' ? 'default' : 'secondary'}>
            {BUSINESS_STATUS_LABELS[profile.status]}
          </Badge>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">MST:</span> {profile.taxCode || '—'}</p>
          <p><span className="text-muted-foreground">Loại hình:</span> {BUSINESS_TYPE_LABELS[profile.businessType]}</p>
          <p><span className="text-muted-foreground">Người liên hệ:</span> {profile.contactPerson}</p>
          <p><span className="text-muted-foreground">SĐT:</span> {profile.contactPhone || '—'}</p>
          <p><span className="text-muted-foreground">Email:</span> {profile.contactEmail || '—'}</p>
          <p><span className="text-muted-foreground">Hạn thanh toán:</span> {profile.paymentTermDays} ngày</p>
          <p><span className="text-muted-foreground">Hạn mức công nợ:</span> {formatCurrency(profile.creditLimit)}</p>
          {data?.outstandingCredit != null && data.outstandingCredit > 0 && (
            <p><span className="text-muted-foreground">Dư nợ hiện tại:</span> {formatCurrency(data.outstandingCredit)}</p>
          )}
          {data?.availableCredit != null && (
            <p><span className="text-muted-foreground">Còn lại:</span> {formatCurrency(data.availableCredit)}</p>
          )}
        </div>
        {profile.invoiceAddress ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Địa chỉ xuất HĐ VAT:</span> {profile.invoiceAddress}
          </p>
        ) : null}
        {profile.note ? (
          <p className="text-sm text-muted-foreground">Ghi chú admin: {profile.note}</p>
        ) : null}
      </div>
    )
  }

  // Documents manager (reuses Cloudinary for files - business licenses, authorization letters, etc.)
  const addDocument = async () => {
    if (!isCloudinaryConfigured()) {
      toast.error('Cloudinary chưa cấu hình. Bạn vẫn có thể dán URL file đã upload thủ công.')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf,.doc,.docx'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 8 * 1024 * 1024) {
        toast.error('File quá lớn (tối đa ~8MB)')
        return
      }
      try {
        const url = await uploadImageToCloudinary(file) // works for images; for PDF use Cloudinary raw if preset allows
        const newDoc: BusinessDocument = {
          type: 'other',
          url,
          name: file.name,
          uploadedAt: new Date().toISOString(),
        }
        setForm({ ...form, documents: [...form.documents, newDoc] })
        toast.success('Đã tải giấy tờ lên')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Tải file thất bại')
      }
    }
    input.click()
  }

  const updateDocType = (index: number, type: BusinessDocument['type']) => {
    const next = [...form.documents]
    next[index] = { ...next[index], type }
    setForm({ ...form, documents: next })
  }

  const removeDoc = (index: number) => {
    const next = form.documents.filter((_, i) => i !== index)
    setForm({ ...form, documents: next })
  }

  const manualAddUrl = () => {
    const url = prompt('Dán URL file (Cloudinary hoặc host khác):')
    if (!url) return
    const newDoc: BusinessDocument = {
      type: 'other',
      url: url.trim(),
      name: url.split('/').pop() || 'document',
      uploadedAt: new Date().toISOString(),
    }
    setForm({ ...form, documents: [...form.documents, newDoc] })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Đăng ký tài khoản doanh nghiệp để được báo giá, mua theo lốc/thùng và thanh toán công nợ.
      </p>
      <BusinessRegistrationFields form={form} onChange={setForm} />

      {/* Documents upload section for better admin verification */}
      <div className="space-y-2">
        <Label>Giấy tờ đính kèm (khuyến nghị — giúp admin duyệt nhanh và chính xác hơn)</Label>
        <div className="space-y-2">
          {form.documents.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có giấy tờ. Nên đính kèm Giấy phép KD + Giấy ủy quyền (nếu có).</p>
          )}
          {form.documents.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded border p-2 text-sm">
              <FileText className="size-4 shrink-0" />
              <a href={doc.url} target="_blank" rel="noreferrer" className="truncate font-medium text-primary hover:underline">
                {doc.name || doc.url}
              </a>
              <select
                value={doc.type}
                onChange={(e) => updateDocType(idx, e.target.value as BusinessDocument['type'])}
                className="ml-auto rounded border px-2 py-1 text-xs"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, lab]) => (
                  <option key={val} value={val}>{lab}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={() => removeDoc(idx)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addDocument} disabled={!isCloudinaryConfigured()}>
            <Upload className="mr-1 size-4" /> Tải file lên (Cloudinary)
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={manualAddUrl}>
            Dán URL thủ công
          </Button>
          {!isCloudinaryConfigured() && (
            <span className="text-[10px] text-destructive self-center">Cloudinary chưa cấu hình — chỉ hỗ trợ dán URL</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">File được lưu an toàn qua Cloudinary. Admin sẽ xem được khi duyệt.</p>
      </div>

      <Button onClick={() => validateAndSubmit(register.mutate)} disabled={register.isPending}>
        Gửi đăng ký doanh nghiệp
      </Button>
    </div>
  )
}