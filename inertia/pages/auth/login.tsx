import { Head, Link } from '@inertiajs/react'
import { Dna, Sparkles } from 'lucide-react'

import { LoginForm } from '~/components/auth'
import { Card } from '~/components/ui/core/card'
import { DNAParticles } from '~/components/effects/dna_particles'
import { RevealText } from '~/components/effects/reveal_text'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-base">
      <Head title="Entrar - Genscan" />

      {/* Left side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-6 lg:p-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-dna flex items-center justify-center shadow-glow-sm">
              <Dna className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Genscan</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                <RevealText>Bem-vindo de volta</RevealText>
              </h1>
              <p className="text-muted-foreground">
                Entre com suas credenciais para acessar sua árvore genealógica
              </p>
            </div>

            <Card className="p-6 glass border-border/50 shadow-xl">
              <LoginForm />
            </Card>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Ainda não tem uma conta? </span>
              <Link
                href="/register"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 lg:p-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>&copy; 2025 Genscan. Todos os direitos reservados.</span>
          </div>
        </footer>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-[50%] xl:w-[60%] relative bg-gradient-dna">
        {/* DNA Particles Background */}
        <DNAParticles className="absolute inset-0 opacity-20" />

        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center p-12 z-10">
          <div className="max-w-md text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Powered by AI & Brazilian Data</span>
            </div>

            <h2 className="text-4xl font-bold mb-4">
              Sua história familiar <span className="text-yellow">ao seu alcance</span>
            </h2>

            <p className="text-lg text-white/90 mb-8">
              Descubra conexões, explore suas raízes e preserve o legado da sua família com a
              tecnologia mais avançada em genealogia do Brasil.
            </p>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow">50K+</div>
                <div className="text-sm text-white/70">Famílias</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow">2M+</div>
                <div className="text-sm text-white/70">Conexões</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow">99.9%</div>
                <div className="text-sm text-white/70">Precisão</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
      </div>
    </div>
  )
}
