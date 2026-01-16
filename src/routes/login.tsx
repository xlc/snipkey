import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { setMeta, syncToServer } from '~/lib/snippet-api'
import { authLoginFinish, authLoginStart, authRegisterFinish, authRegisterStart } from '~/server/auth'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'login' | 'register' | null>(null)

  const handleRegister = async () => {
    setIsLoading(true)
    setAction('register')
    try {
      // Start registration
      const startResult = await authRegisterStart()
      if (startResult.error) {
        toast.error(startResult.error.message)
        return
      }

      const { options, challengeId } = startResult.data

      // Trigger browser authenticator
      const attestation = await startRegistration({ optionsJSON: options })

      // Finish registration
      const finishResult = await authRegisterFinish({
        data: {
          attestation,
          challengeId,
        },
      })

      // Handle Response object (authRegisterFinish returns Response)
      if (finishResult instanceof Response) {
        if (!finishResult.ok) {
          toast.error('Registration failed')
          return
        }

        // Parse response to get userId
        const responseData = (await finishResult.json()) as { userId: string; sessionId: string }
        const { userId } = responseData

        // Update metadata with userId
        setMeta({ userId, mode: 'cloud' })

        // Sync local snippets to server
        const syncResult = await syncToServer()

        if (syncResult.synced > 0) {
          toast.success(`Account created! Synced ${syncResult.synced} snippets to the cloud.`)
        } else {
          toast.success('Account created successfully!')
        }

        router.navigate({ to: '/' })
        return
      }

      // This shouldn't happen since authRegisterFinish always returns Response
      toast.success('Account created successfully!')
      router.navigate({ to: '/' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsLoading(false)
      setAction(null)
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)
    setAction('login')
    try {
      // Start login
      const startResult = await authLoginStart()
      if (startResult.error) {
        toast.error(startResult.error.message)
        return
      }

      const { options, challengeId } = startResult.data

      // Trigger browser authenticator
      const assertion = await startAuthentication({ optionsJSON: options })

      // Finish login
      const finishResult = await authLoginFinish({
        data: {
          assertion,
          challengeId,
        },
      })

      // Handle Response object (authLoginFinish returns Response)
      if (finishResult instanceof Response) {
        if (!finishResult.ok) {
          toast.error('Login failed')
          return
        }

        // Parse response to get userId
        const responseData = (await finishResult.json()) as { userId: string; sessionId: string }
        const { userId } = responseData

        // Update metadata with userId
        setMeta({ userId, mode: 'cloud' })

        toast.success('Welcome back!')
        router.navigate({ to: '/' })
        return
      }

      // This shouldn't happen since authLoginFinish always returns Response
      toast.success('Welcome back!')
      router.navigate({ to: '/' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
      setAction(null)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Snipkey</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose an option to continue</p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleLogin} disabled={isLoading} className="w-full" size="lg" variant="default">
            {isLoading && action === 'login' ? 'Signing in...' : 'Sign in with passkey'}
          </Button>

          <Button onClick={handleRegister} disabled={isLoading} className="w-full" size="lg" variant="outline">
            {isLoading && action === 'register' ? 'Creating account...' : 'Create account with passkey'}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>Uses your device's built-in security (Face ID, Touch ID, Windows Hello, or Pattern/PIN)</p>
        </div>
      </div>
    </div>
  )
}
