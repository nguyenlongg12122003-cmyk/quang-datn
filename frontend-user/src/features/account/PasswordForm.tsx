import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useChangePassword } from '@/features/account/api'
import { getErrorMessage } from '@/lib/api/axios'

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function PasswordForm() {
  const changePassword = useChangePassword()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = (values: FormValues) => {
    changePassword.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Đổi mật khẩu thành công')
          form.reset()
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        {(['oldPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {name === 'oldPassword'
                    ? 'Mật khẩu hiện tại'
                    : name === 'newPassword'
                      ? 'Mật khẩu mới'
                      : 'Xác nhận mật khẩu mới'}
                </FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </Button>
      </form>
    </Form>
  )
}
