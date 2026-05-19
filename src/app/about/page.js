import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PageHero from '../components/PageHero';

export default function AboutPage() {
  return (
    <div className="page-shell">
      <div className="container mx-auto max-w-5xl px-6">
        <PageHero
          eyebrow="Who We Are"
          title="A Collective for Conservation"
          description="We believe the greatest force for protecting our planet is shared knowledge — open, collaborative, and actionable."
        />

        <div className="grid md:grid-cols-2 gap-10 items-center mb-24">
          <div>
            <span className="eyebrow mb-4">Our Mission</span>
            <h2 className="text-3xl font-bold text-white mb-4">Knowledge for Action</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We provide an open, collaborative platform where scientists, activists, and nature enthusiasts unite to share crucial information, inspire dialogue, and drive meaningful conservation action.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Founded in 2025, Nature Index was born from the idea that conservation cannot be confined to labs and academic papers. It must be accessible, collaborative, and actionable for everyone who wishes to contribute to a sustainable future.
            </p>
          </div>
          <div className="relative h-80 rounded-2xl overflow-hidden border border-white/20">
            <Image
              src="https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Forest canopy"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </div>

        <section className="mb-24">
          <div className="text-center mb-12">
            <span className="eyebrow mb-4">Principles</span>
            <h2 className="text-4xl font-bold text-white">Our Manifesto</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Truth & Science',
                text: 'Effective conservation is built on sound science and verifiable data. We champion rigorous research and fact-based dialogue as the essential starting point for protecting our planet.',
              },
              {
                title: 'Radical Collaboration',
                text: 'Ecosystem challenges are too large for any single organization. We share knowledge freely and build bridges between communities, scientists, and policymakers.',
              },
              {
                title: 'Empowerment',
                text: 'Information without action remains inert. We translate global insights into tangible tools so every person can become an effective guardian of their natural world.',
              },
            ].map((item) => (
              <div key={item.title} className="glass-card p-8">
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center glass-card p-10 md:p-14">
          <h2 className="text-3xl font-bold text-white mb-4">Join the conversation</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Read field reports, share your research, and connect with a global community of conservation stewards.
          </p>
          <Link href="/blog" className="btn-primary">
            Explore the Field Journal
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
