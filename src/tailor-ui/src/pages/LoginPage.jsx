import Card from '../components/Card'
import Button from '../components/Button'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  return (
    <div className="mx-auto max-w-md p-6">
      <Card>
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-gray-600 mb-4">Google OAuth only.</p>
        <Button onClick={() => login('/')}>Sign in with Google</Button>
      </Card>
    </div>
  )
}
