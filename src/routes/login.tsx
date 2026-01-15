import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import {
	authLoginFinish,
	authLoginStart,
	authRegisterFinish,
	authRegisterStart,
} from '~/server/auth'

export const Route = createFileRoute('/login')({
	component: Login,
})

function Login() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [mode, setMode] = useState<'login' | 'register'>('login')

	const handleRegister = async () => {
		setIsLoading(true)
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
				toast.success('Registration successful!')
				router.navigate({ to: '/' })
				return
			}

			// This shouldn't happen since authRegisterFinish always returns Response
			toast.success('Registration successful!')
			router.navigate({ to: '/' })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Registration failed')
		} finally {
			setIsLoading(false)
		}
	}

	const handleLogin = async () => {
		setIsLoading(true)
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
				toast.success('Login successful!')
				router.navigate({ to: '/' })
				return
			}

			// This shouldn't happen since authLoginFinish always returns Response
			toast.success('Login successful!')
			router.navigate({ to: '/' })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Login failed')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight">
						{mode === 'login' ? 'Welcome back' : 'Create account'}
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{mode === 'login'
							? 'Sign in with your passkey to continue'
							: 'Register with a passkey to get started'}
					</p>
				</div>

				<div className="space-y-4">
					<Button
						onClick={mode === 'login' ? handleLogin : handleRegister}
						disabled={isLoading}
						className="w-full"
						size="lg"
					>
						{isLoading
							? 'Processing...'
							: mode === 'login'
								? 'Sign in with passkey'
								: 'Register with passkey'}
					</Button>

					<div className="text-center text-sm">
						<button
							type="button"
							onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
							className="text-muted-foreground underline hover:text-foreground"
							disabled={isLoading}
						>
							{mode === 'login'
								? "Don't have an account? Register"
								: 'Already have an account? Sign in'}
						</button>
					</div>
				</div>

				<div className="text-center text-xs text-muted-foreground">
					<p>
						Uses your device's built-in security (Face ID, Touch ID, Windows Hello, or Pattern/PIN)
					</p>
				</div>
			</div>
		</div>
	)
}
