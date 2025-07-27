import { FormEvent, useState } from 'react'
import { useForm, Link } from '@inertiajs/react'
import { User, Mail, Lock, Eye, EyeOff, UserCircle } from 'lucide-react'

import { Alert, AlertDescription, Button, FormInput, Checkbox } from '~/components/ui/core'

interface RegisterFormProps {
  errors?: Record<string, string>
}

export function RegisterForm({ errors: propErrors }: RegisterFormProps) {
  const {
    data,
    setData,
    post,
    processing,
    errors: formErrors,
  } = useForm({
    full_name: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
    terms: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)

  const errors = { ...formErrors, ...propErrors }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    post('/register')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors?.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <FormInput
        label="Nome Completo"
        type="text"
        name="full_name"
        value={data.full_name}
        onChange={(e) => setData('full_name', e.target.value)}
        errorMessage={errors.full_name}
        placeholder="João Silva"
        required
        autoComplete="name"
        leftIcon={<User className="h-4 w-4" />}
      />

      <FormInput
        label="E-mail"
        type="email"
        name="email"
        value={data.email}
        onChange={(e) => setData('email', e.target.value)}
        errorMessage={errors.email}
        placeholder="seu@email.com"
        required
        autoComplete="email"
        leftIcon={<Mail className="h-4 w-4" />}
      />

      <FormInput
        label="Nome de usuário (opcional)"
        type="text"
        name="username"
        value={data.username}
        onChange={(e) => setData('username', e.target.value)}
        errorMessage={errors.username}
        placeholder="joaosilva"
        autoComplete="username"
        leftIcon={<UserCircle className="h-4 w-4" />}
      />

      <FormInput
        label="Senha"
        type={showPassword ? 'text' : 'password'}
        name="password"
        value={data.password}
        onChange={(e) => setData('password', e.target.value)}
        errorMessage={errors.password}
        placeholder="••••••••"
        hint="Mínimo 8 caracteres"
        required
        autoComplete="new-password"
        leftIcon={<Lock className="h-4 w-4" />}
        rightAdornment={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <FormInput
        label="Confirmar Senha"
        type={showPasswordConfirmation ? 'text' : 'password'}
        name="password_confirmation"
        value={data.password_confirmation}
        onChange={(e) => setData('password_confirmation', e.target.value)}
        errorMessage={errors.password_confirmation}
        placeholder="••••••••"
        required
        autoComplete="new-password"
        leftIcon={<Lock className="h-4 w-4" />}
        rightAdornment={
          <button
            type="button"
            onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPasswordConfirmation ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      <div className="space-y-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            name="terms"
            checked={data.terms}
            onCheckedChange={(checked) => setData('terms', !!checked)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed">
            Eu concordo com os{' '}
            <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
              Política de Privacidade
            </Link>
          </span>
        </label>
        {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
      </div>

      <Button
        type="submit"
        loading={processing}
        disabled={processing || !data.terms}
        className="w-full bg-gradient-dna hover:opacity-90 transition-opacity text-white border-0"
        size="lg"
      >
        {processing ? 'Criando conta...' : 'Criar conta'}
      </Button>
    </form>
  )
}

export default RegisterForm
