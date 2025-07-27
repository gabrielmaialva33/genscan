import { BrainCircuit, Database, Link2, Search, Shield, Sparkles, TreePine } from 'lucide-react'
import { cn } from '~/utils/cn'

const features = [
  {
    icon: BrainCircuit,
    title: 'IA para Descobertas',
    description:
      'Nossa IA analisa e cruza dados de múltiplas fontes, sugerindo conexões e revelando parentes que você não conhecia.',
    color: 'lavender',
    gradient: 'from-lavender/20 to-mauve/20',
  },
  {
    icon: Link2,
    title: 'Integração FamilySearch',
    description:
      'Importe sua árvore genealógica do FamilySearch com um clique e comece a expandir sua pesquisa imediatamente.',
    color: 'sky',
    gradient: 'from-sky/20 to-sapphire/20',
  },
  {
    icon: Database,
    title: 'Dados Brasileiros',
    description:
      'Acesso exclusivo a registros nacionais, cartórios e bases de dados brasileiras para descobertas únicas.',
    color: 'green',
    gradient: 'from-green/20 to-teal/20',
  },
  {
    icon: TreePine,
    title: 'Visualização Interativa',
    description:
      'Navegue por sua história familiar em árvores genealógicas lindas e fáceis de explorar, otimizadas para qualquer dispositivo.',
    color: 'peach',
    gradient: 'from-peach/20 to-pink/20',
  },
  {
    icon: Search,
    title: 'Busca Inteligente',
    description:
      'Encontre familiares por nome, CPF, ou deixe nossa IA descobrir conexões através de análise de padrões.',
    color: 'mauve',
    gradient: 'from-mauve/20 to-lavender/20',
  },
  {
    icon: Shield,
    title: 'Privacidade Garantida',
    description:
      'Seus dados são criptografados e você controla completamente quem pode ver sua árvore genealógica.',
    color: 'flamingo',
    gradient: 'from-flamingo/20 to-red/20',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dots-pattern opacity-5" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Uma nova forma de <span className="text-gradient">explorar suas raízes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Nossa plataforma combina tecnologia de ponta com um design intuitivo para tornar a
            genealogia uma experiência fascinante.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                'group relative p-8 rounded-2xl border border-border/50',
                'bg-gradient-to-br',
                feature.gradient,
                'hover-lift glass backdrop-blur-sm',
                'opacity-0 animate-reveal'
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center mb-6',
                  'bg-gradient-to-br',
                  feature.gradient,
                  'group-hover:scale-110 transition-transform duration-300'
                )}
              >
                <feature.icon className={cn('w-8 h-8', `text-${feature.color}`)} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Additional Feature */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-dna text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <Sparkles className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold mb-4">Descubra Conexões Surpreendentes</h3>
            <p className="text-white/90 mb-6">
              Nossa IA já encontrou mais de 500.000 conexões familiares inesperadas, incluindo
              parentes distantes, ancestrais ilustres e histórias fascinantes.
            </p>
            <div className="flex items-center justify-center gap-8">
              <div>
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm text-white/70">Taxa de Precisão</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold">24h</div>
                <div className="text-sm text-white/70">Suporte Disponível</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold">∞</div>
                <div className="text-sm text-white/70">Pessoas na Árvore</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
