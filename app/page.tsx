import { Dashboard } from '@/components/dashboard'
import { AuthWrapper } from '@/components/auth-wrapper'

export default function Home() {
  return (
    <AuthWrapper>
      <Dashboard />
    </AuthWrapper>
  )
}
