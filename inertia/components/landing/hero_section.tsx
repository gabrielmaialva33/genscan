import { Link } from '@inertiajs/react'
import { ArrowRight, Dna, Sparkles } from 'lucide-react'
import { MagneticButton } from '~/components/effects/magnetic_button'
import { RevealText } from '~/components/effects/reveal_text'
import { DNAParticles } from '~/components/effects/dna_particles'
import { Button } from '~/components/ui/core/button'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-dna opacity-30" />
      <DNAParticles className="absolute inset-0" />

      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-gradient-cool rounded-full blur-3xl opacity-20 animate-float" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-gradient-warm rounded-full blur-3xl opacity-20 animate-float-slow" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-reveal">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">
              Powered by AI & Brazilian Data
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <RevealText className="block mb-2" delay={0.2}>
              Descubra sua história,
            </RevealText>
            <RevealText className="text-gradient" delay={0.4}>
              visualize seu legado
            </RevealText>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 opacity-0 animate-reveal [animation-delay:800ms]">
            A Genscan usa Inteligência Artificial para conectar você ao seu passado. Importe dados
            do FamilySearch e fontes brasileiras para criar uma árvore genealógica interativa e
            desvendar as histórias da sua família.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-reveal [animation-delay:1s]">
            <MagneticButton>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-dna text-base border-0 shadow-glow hover:shadow-glow-sm px-8 py-6 text-lg group"
                >
                  <Dna className="w-5 h-5 mr-2 animate-dna" />
                  Comece Agora, é Grátis
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </MagneticButton>

            <MagneticButton>
              <Button size="lg" variant="outline" className="border-gradient px-8 py-6 text-lg">
                Ver Demo
              </Button>
            </MagneticButton>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto opacity-0 animate-reveal [animation-delay:1.2s]">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gradient">500K+</h3>
              <p className="text-sm text-muted-foreground mt-1">Conexões Descobertas</p>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gradient">50M+</h3>
              <p className="text-sm text-muted-foreground mt-1">Registros Brasileiros</p>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gradient">99.9%</h3>
              <p className="text-sm text-muted-foreground mt-1">Precisão de Dados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 animate-reveal [animation-delay:1.5s]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-sm">Scroll para descobrir</span>
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full p-1">
            <div className="w-1 h-3 bg-muted-foreground/50 rounded-full mx-auto animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  )
}
