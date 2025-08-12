import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center text-center px-4"
      style={{ backgroundImage: `url('https://nyxrhpuvmenzsphmrymc.supabase.co/storage/v1/object/public/serverasset/Gemini_Generated_Image_ao7i2vao7i2vao7i.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Content Container */}
      <div className="relative z-10">
        <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tighter">
          404 NOT FOUND
        </h1>
        
        <p className="mt-4 text-xl md:text-2xl text-gray-300 font-medium">
          That is our future if we don&apos;t act.
        </p>
        
        {/* Action Button */}
        <div className="mt-10">
          <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-white text-black font-semibold rounded-lg shadow-md hover:bg-gray-200 transition-all duration-300 transform hover:scale-105">
            <Home className="w-5 h-5 mr-2" />
            Return to the Homepage
          </Link>
        </div>
      </div>

    </div>
  );
}