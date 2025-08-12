import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="bg-black pt-32 pb-20">
      <div className="container mx-auto max-w-5xl px-6">
        <h1 className="text-5xl lg:text-6xl font-bold text-white text-center mb-16">A Collective for Conservation</h1>
        
        {/* Story Section */}
        <div className="grid md:grid-cols-2 gap-10 text-left mb-20 items-center">
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-white">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              We believe the greatest force for protecting our planet is shared knowledge. Our mission is to provide an open, collaborative platform where scientists, activists, and nature enthusiasts can unite to share crucial information, inspire dialogue, and drive meaningful conservation action.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Founded on August 1st, 2025, Nature Index was born from the idea that conservation cannot be confined to labs and academic papers. It must be accessible, collaborative, and actionable for everyone who wishes to contribute to a sustainable future.
            </p>
          </div>
          <div className="relative h-80 rounded-2xl overflow-hidden">
             <Image 
                src="https://imgs.search.brave.com/48b69E82cTdLjNEw3wSTzvzF8osjnIsqJ-A9zIKIOMw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTMx/NzAzMjQ2Ny92aWRl/by9tb3RoZXItYW5k/LWRhdWdodGVyLXBs/YW50aW5nLWEtdHJl/ZS1hdC1ldmVuaW5n/LXRpbWUuanBnP3M9/NjQweDY0MCZrPTIw/JmM9MG1Tdk5BZzFv/aGVTR3hLeDBfODU5/blluNjdBU0RYM0dx/enNLNmc4MENncz0" 
                alt="A group of volunteers planting trees"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
             />
          </div>
        </div>

        {/* Manifesto Section */}
        <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-12">Our Manifesto</h2>
            <div className="max-w-3xl mx-auto text-left text-lg">
              <p className="text-gray-300 leading-relaxed mb-6">
                Our first principle is an unwavering commitment to truth. We believe that effective, lasting conservation is built upon a foundation of sound science and verifiable data. In a world of noise and speculation, we provide a space for evidence-based strategies, ensuring every action we advocate for is informed, intentional, and impactful. We champion rigorous research and fact-based dialogue as the essential starting point for protecting our planet.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                Secondly, we operate with radical collaboration. The complex challenges facing our ecosystems are too large for any single organization to tackle alone. We are dedicated to an open-source ethos, demolishing silos and sharing knowledge freely. By building bridges between local communities, scientific institutions, and policymakers, we create a powerful network where diverse perspectives converge to forge holistic and resilient solutions.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Ultimately, our purpose is empowerment from the ground up. Information without action remains inert. We strive to translate global data and collaborative insights into tangible tools for individuals and communities. True, sustainable change begins locally, and we are committed to equipping every person with the knowledge and confidence they need to become effective, passionate guardians of their own natural world.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}