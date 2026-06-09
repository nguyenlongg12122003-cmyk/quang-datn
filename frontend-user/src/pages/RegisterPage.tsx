import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { Loader2, Mail, Phone, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { InputWithIcon } from '@/components/auth/InputWithIcon'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { useRegister } from '@/features/auth/api'
import { getErrorMessage } from '@/lib/api/axios'

const schema = z.object({
  name: z.string().min(2, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const register = useRegister()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  })

  const onSubmit = (values: FormValues) => {
    register.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Tạo tài khoản thành công. Chào ${data.user.name}!`)
        navigate('/', { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <AuthLayout
      title="Đăng ký"
      footer={
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Họ và tên</FormLabel>
                <FormControl>
                  <InputWithIcon icon={User} autoComplete="name" placeholder="Nguyễn Văn A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <InputWithIcon
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="ban@email.com"
                    {...field}
                  />
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
                  <InputWithIcon
                    icon={Phone}
                    type="tel"
                    autoComplete="tel"
                    placeholder="0912345678"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-2 h-10 w-full" size="lg" disabled={register.isPending}>
            {register.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang tạo…
              </>
            ) : (
              'Đăng ký'
            )}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}