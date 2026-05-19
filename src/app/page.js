import { ChevronRight, Leaf, Globe, Users, ArrowDown } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
            filter: 'grayscale(40%) brightness(0.55)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="eyebrow mb-6">Nature Index — Est. 2025</span>
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Guardians of the Wild
          </h1>
          <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Dedicated to the preservation of wildlife and their habitats. Share knowledge, inspire action, and protect our planet together.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/blog" className="btn-primary group">
              Read the Field Journal
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/about" className="btn-secondary">
              Our Mission
            </Link>
          </div>
        </div>

        <a
          href="#initiatives"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors animate-bounce"
          aria-label="Scroll to initiatives"
        >
          <ArrowDown className="w-5 h-5" />
        </a>
      </section>

      <section className="bg-black border-y border-white/10">
        <div className="container mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '12M+', label: 'Trees Planted' },
            { value: '48', label: 'Countries Active' },
            { value: '320K', label: 'Contributors' },
            { value: '98%', label: 'Data Verified' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="initiatives"
        className="relative py-24 lg:py-36 bg-cover bg-center"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
        }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative container mx-auto max-w-6xl text-center px-6">
          <span className="eyebrow mb-4">What We Do</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Our Core Initiatives</h2>
          <p className="text-lg text-gray-300 mb-16 max-w-2xl mx-auto leading-relaxed">
            Every action we take is guided by science, powered by communities, and aimed at lasting ecological impact.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: Leaf,
                title: 'Habitat Restoration',
                desc: 'We document and support reforestation and ecosystem recovery projects that rebuild habitats for wildlife and communities.',
              },
              {
                Icon: Globe,
                title: 'Climate Science',
                desc: 'Our contributors publish evidence-based research and field reports that inform policy and public understanding of the climate crisis.',
              },
              {
                Icon: Users,
                title: 'Community Programs',
                desc: 'We connect local stewards with global audiences — giving communities ownership of conservation outcomes.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="glass-card p-8 text-center hover:bg-white/15 transition-colors">
                <Icon className="w-12 h-12 text-white mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="about"
        className="relative py-24 lg:py-36 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)' }}
        />
        <div className="relative container mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <span className="eyebrow mb-4">Our Story</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Science-led.<br />Community-driven.
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Nature Index is a collective of ecologists, conservationists, and storytellers developing open knowledge for environmental action.
            </p>
            <p className="text-gray-400 leading-relaxed mb-10">
              Every project is monitored using satellite imagery and on-ground data. We publish results openly — because accountability is the foundation of trust.
            </p>
            <Link href="/about" className="btn-primary group">
              Learn About Us
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="relative py-28 bg-cover bg-center text-center px-6"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            The forest cannot wait.
          </h2>
          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            Join our community of researchers, activists, and nature enthusiasts. Share your story and help protect what remains.
          </p>
          <Link href="/login" className="btn-primary text-lg px-10 py-4 group">
            Join Nature Index
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}
