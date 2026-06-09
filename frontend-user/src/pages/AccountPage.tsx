import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProfileForm } from '@/features/account/ProfileForm'
import { PasswordForm } from '@/features/account/PasswordForm'
import { AddressList } from '@/features/account/AddressList'

export function AccountPage() {
  return (
    <PageContainer className="space-y-6">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
          <TabsTrigger value="addresses">Địa chỉ</TabsTrigger>
          <TabsTrigger value="password">Mật khẩu</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6">
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="addresses">
          <AddressList />
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardContent className="p-6">
              <PasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
