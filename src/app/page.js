'use client';
import { ChevronRight, MapPin, Wind, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Hero Section (Unchanged) */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=2100&auto=format&fit=crop")`, filter: 'grayscale(50%) brightness(0.6)' }}/>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="relative z-10">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight">Guardians of the Wild</h1>
            <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                Dedicated to the preservation of wildlife and their habitats. Your support can make a world of difference.
            </p>
            <Link href="/about" className="group inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                Join Our Mission
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
      </section>

      {/* Features Section (Updated as Requested) */}
      <section 
        className="relative py-20 lg:py-32 bg-cover bg-center" 
        style={{ backgroundImage: `url("https://imgs.search.brave.com/6RGCGDpj_sOj4Ut8H2d4MZZipuL9k_KQHe6fVZJqQnM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJhY2Nlc3Mu/Y29tL2Z1bGwvNTQ4/NzAyLmpwZw")` }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative container mx-auto max-w-6xl text-center px-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Our Key Initiatives</h2>
            <p className="text-lg text-gray-300 mb-16 max-w-2xl mx-auto">Our work focuses on the most critical areas to protect endangered species and vital ecosystems for a sustainable future.</p>
            <div className="grid md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center shadow-lg">
                    <MapPin className="w-12 h-12 text-white mx-auto mb-6"/>
                    <h3 className="text-2xl font-bold text-white mb-3">Habitat Restoration</h3>
                    <p className="text-gray-300">We work on the ground to reforest lands, clean up waterways, and restore natural habitats for wildlife to thrive.</p>
                </div>
                {/* Card 2 */}
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center shadow-lg">
                    <Wind className="w-12 h-12 text-white mx-auto mb-6"/>
                    <h3 className="text-2xl font-bold text-white mb-3">Policy & Advocacy</h3>
                    <p className="text-gray-300">We campaign for stronger environmental laws and work with communities and governments to drive systemic change.</p>
                </div>
                {/* Card 3 */}
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center shadow-lg">
                    <ShieldCheck className="w-12 h-12 text-white mx-auto mb-6"/>
                    <h3 className="text-2xl font-bold text-white mb-3">Wildlife Protection</h3>
                    <p className="text-gray-300">Our anti-poaching patrols and conservation projects directly protect endangered species from illegal trade and other threats.</p>
                </div>
            </div>
        </div>
      </section>
    </>
  );
}