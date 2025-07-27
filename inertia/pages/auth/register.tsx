import { Head, Link } from '@inertiajs/react'
import { Dna, TreePine, Users, Search } from 'lucide-react'
import { RegisterForm } from '~/components/auth'
import { Card } from '~/components/ui/core/card'
import { DNAParticles } from '~/components/effects/dna_particles'
import { RevealText } from '~/components/effects/reveal_text'

interface RegisterPageProps {
  errors?: Record<string, string>
}

export default function RegisterPage({ errors }: RegisterPageProps) {
  return (
    <div className="min-h-screen flex bg-base">
      <Head title="Criar Conta - Genscan" />

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
                <RevealText>Comece sua jornada</RevealText>
              </h1>
              <p className="text-muted-foreground">
                Crie sua conta e descubra a história da sua família
              </p>
            </div>

            <Card className="p-6 glass border-border/50 shadow-xl">
              <RegisterForm errors={errors} />
            </Card>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Entrar
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
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-8 text-white text-center">
              O que você vai <span className="text-yellow">descobrir</span>
            </h2>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Árvore Genealógica Interativa</h3>
                  <p className="text-sm text-white/80">
                    Visualize até 10 gerações da sua família em uma interface moderna e intuitiva
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Conexões Familiares</h3>
                  <p className="text-sm text-white/80">
                    Nossa IA encontra parentes distantes e conexões inesperadas automaticamente
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Busca por CPF</h3>
                  <p className="text-sm text-white/80">
                    Encontre familiares usando CPF e acesse registros brasileiros exclusivos
                  </p>
                </div>
              </div>
            </div>

            {/* Social Proof */}
            <div className="mt-8 p-4 rounded-xl bg-white/10 backdrop-blur text-center">
              <p className="text-sm text-white/90">
                <span className="font-semibold text-yellow">+5.000</span> famílias brasileiras já
                descobriram suas origens com a Genscan
              </p>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
      </div>
    </div>
  )
}
