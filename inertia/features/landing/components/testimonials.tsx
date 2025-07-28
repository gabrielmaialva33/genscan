import { Quote, Star } from 'lucide-react'
import { cn } from '~/shared/utils/cn'

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Historiadora Familiar',
    avatar: 'https://avatar.iran.liara.run/public/girl?username=Maria',
    content:
      'A Genscan transformou a maneira como vejo minha família. Encontrei parentes que não sabia que existiam e entendi de onde vim. É mágico!',
    rating: 5,
  },
  {
    name: 'João Santos',
    role: 'Pesquisador Genealógico',
    avatar: 'https://avatar.iran.liara.run/public/boy?username=João',
    content:
      'A integração com dados brasileiros é incrível. Consegui rastrear minha família até o século XVIII com documentos de cartórios digitalizados.',
    rating: 5,
  },
  {
    name: 'Ana Costa',
    role: 'Professora de História',
    avatar: 'https://avatar.iran.liara.run/public/girl?username=Ana',
    content:
      'Uso a Genscan com meus alunos para ensinar sobre história familiar. A interface é intuitiva e as visualizações são fantásticas.',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface0/10 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Histórias de quem já <span className="text-gradient">descobriu suas raízes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Milhares de pessoas já transformaram sua compreensão familiar com a Genscan.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={cn(
                'relative p-8 rounded-2xl bg-card border border-border/50',
                'hover-lift opacity-0 animate-reveal'
              )}
              style={{
                animationDelay: `${index * 150}ms`,
              }}
            >
              {/* Quote Icon */}
              <Quote className="absolute top-4 right-4 w-12 h-12 text-primary/10" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow text-yellow" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 relative z-10">"{testimonial.content}"</p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full border-2 border-primary/20"
                />
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>

              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-subtle border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <h3 className="text-4xl font-bold text-gradient mb-2">50K+</h3>
              <p className="text-muted-foreground">Usuários Ativos</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold text-gradient mb-2">2M+</h3>
              <p className="text-muted-foreground">Pessoas Catalogadas</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold text-gradient mb-2">500K+</h3>
              <p className="text-muted-foreground">Conexões Descobertas</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold text-gradient mb-2">4.9</h3>
              <p className="text-muted-foreground">Avaliação Média</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
