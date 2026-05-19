import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex flex-col items-center justify-center text-center px-4"
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 max-w-lg">
        <span className="eyebrow mb-6">404</span>
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
          Page not found
        </h1>
        <p className="text-xl text-gray-300 font-medium mb-10">
          The path you followed has gone quiet — but there is still work to do.
        </p>
        <Link href="/" className="btn-primary">
          <Home className="w-5 h-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
