import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/common/Logo'
import { useLogin } from '@/features/auth/api'
import { getErrorMessage } from '@/lib/api/axios'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: FormValues) => {
    login.mutate(values, {
      onSuccess: (data) => {
        if (data.user.role !== 'admin') {
          toast.error('Tài khoản không có quyền quản trị.')
          return
        }
        toast.success(`Chào mừng ${data.user.name}!`)
        navigate('/', { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <div className="grid min-h-svh place-items-center bg-secondary/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Đăng nhập quản trị</CardTitle>
            <CardDescription>Chỉ dành cho tài khoản quản trị viên.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@email.com" {...field} />
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
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}