import { Link } from '@inertiajs/react'
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '~/shared/components/ui/core/button'
import { MagneticButton } from '~/shared/components/effects/magnetic_button'

const benefits = [
  'Sem cartão de crédito',
  'Cancele a qualquer momento',
  'Suporte 24/7 incluído',
  'Dados 100% seguros',
]

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-dna relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-grid-dna opacity-10" />

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float-slow" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur mb-8">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              Oferta Limitada - 50% de desconto no primeiro ano
            </span>
          </div>

          {/* Title */}
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Pronto para desvendar <span className="text-antique-gold">sua história?</span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Junte-se a milhares de pessoas que estão redescobrindo suas raízes. Crie sua árvore
            genealógica gratuitamente hoje mesmo.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-antique-gold" />
                <span className="text-white/80">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <MagneticButton>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold group shadow-2xl"
                >
                  Começar minha jornada
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </MagneticButton>

            <MagneticButton>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg backdrop-blur"
              >
                Falar com Especialista
              </Button>
            </MagneticButton>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-white/60">
            Mais de 50.000 famílias já confiam na Genscan
          </p>
        </div>
      </div>
    </section>
  )
}
