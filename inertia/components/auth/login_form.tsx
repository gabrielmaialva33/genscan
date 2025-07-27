import { FormEvent, useState } from 'react'
import { Link, useForm } from '@inertiajs/react'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'

import { Button } from '../ui/core/button'
import { FormInput } from '~/components/ui/core/form_input'
import { Checkbox } from '~/components/ui/core/checkbox'

export function LoginForm() {
  const { data, setData, post, processing, errors } = useForm({
    uid: '',
    password: '',
    remember: false,
  })

  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    post('/login')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormInput
        label="E-mail ou Nome de usuário"
        id="uid"
        type="text"
        name="uid"
        value={data.uid}
        onChange={(e) => setData('uid', e.target.value)}
        errorMessage={errors.uid}
        placeholder="seu@email.com"
        required
        autoComplete="username"
        leftIcon={<Mail className="h-4 w-4" />}
      />

      <div className="space-y-2">
        <FormInput
          label="Senha"
          id="password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
          errorMessage={errors.password}
          placeholder="••••••••"
          required
          autoComplete="current-password"
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
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            name="remember"
            checked={data.remember}
            onCheckedChange={(checked) => setData('remember', !!checked)}
          />
          <span className="text-sm">Lembrar de mim</span>
        </label>

        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Esqueceu a senha?
        </Link>
      </div>

      <div className="space-y-4 pt-2">
        <Button
          type="submit"
          loading={processing}
          disabled={processing}
          className="w-full bg-gradient-dna hover:opacity-90 transition-opacity text-white border-0"
          size="lg"
        >
          {processing ? 'Entrando...' : 'Entrar'}
        </Button>

        {/* Temporarily removed social login buttons as per plan */}
      </div>
    </form>
  )
}

export default LoginForm
