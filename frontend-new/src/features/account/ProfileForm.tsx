import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/common/ImageUploader'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useUpdateProfile } from '@/features/account/api'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorMessage } from '@/lib/api/axios'

const schema = z.object({
  name: z.string().min(2, 'Nhập họ tên'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  avatar: z.string().url('URL không hợp lệ').or(z.literal('')).optional(),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useUpdateProfile()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      avatar: user?.avatar ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    updateProfile.mutate(
      { name: values.name, phone: values.phone, avatar: values.avatar || undefined },
      {
        onSuccess: () => toast.success('Cập nhật hồ sơ thành công'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input value={user?.email ?? ''} disabled />
        </FormItem>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Số điện thoại</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ảnh đại diện</FormLabel>
              <FormControl>
                <ImageUploader
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  previewClassName="size-24 rounded-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  )
}
