import { CheckCircle, Cpu, Share2, Upload } from 'lucide-react'
import { cn } from '~/utils/cn'

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Importe seus Dados',
    description:
      'Conecte-se ao FamilySearch ou adicione informações manualmente para criar a base da sua árvore.',
    features: ['Importação em 1 clique', 'Suporte a múltiplos formatos', 'Validação automática'],
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Deixe nossa IA Trabalhar',
    description:
      'Nossos algoritmos buscam em registros históricos e bases de dados para encontrar novas conexões.',
    features: ['Análise em tempo real', 'Cruzamento de dados', 'Sugestões inteligentes'],
  },
  {
    number: '03',
    icon: Share2,
    title: 'Explore e Compartilhe',
    description:
      'Navegue por sua árvore interativa, descubra histórias e compartilhe seu legado com a família.',
    features: ['Visualização 3D', 'Exportação em PDF', 'Compartilhamento seguro'],
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-dna opacity-10" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sua jornada começa em <span className="text-gradient">3 passos simples</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Projetamos a Genscan para ser poderosa, mas incrivelmente fácil de usar. Comece a
            construir sua história familiar hoje mesmo.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent transform -translate-y-1/2 hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn('relative opacity-0 animate-reveal')}
                style={{
                  animationDelay: `${index * 200}ms`,
                }}
              >
                {/* Step Card */}
                <div className="relative bg-card rounded-2xl p-8 border border-border/50 hover-lift">
                  {/* Step Number */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-dna flex items-center justify-center text-white font-bold text-xl shadow-glow">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <step.icon className="w-10 h-10 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground mb-6">{step.description}</p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {step.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Decorative Element */}
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-full pointer-events-none" />
                </div>

                {/* Connection Dot */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-glow-sm hidden lg:block" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-6">
            Pronto para começar sua jornada genealógica?
          </p>
          <button className="px-8 py-4 bg-gradient-dna text-white rounded-xl font-semibold hover:shadow-glow transition-shadow">
            Criar Minha Árvore Grátis
          </button>
        </div>
      </div>
    </section>
  )
}
