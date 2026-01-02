import React from 'react';
import { ArrowRight, Sparkles, Layout, Hammer } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">

      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-black tracking-tighter">VURA<span className="text-blue-500">.</span></div>
        <button onClick={onStart} className="font-bold text-sm text-gray-400 hover:text-blue-500 transition">
          Skip to Designing
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 mt-10 mb-20">
        <div className="bg-blue-900/30 text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold mb-8 flex items-center gap-2 animate-fade-in-up">
          <Sparkles size={16} />
          <span>New: AI Background Removal included</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 max-w-4xl text-pretty">
          Put the first nail <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-purple-500">
            in the right spot.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-10 leading-relaxed text-pretty">
          Professional gallery walls, zero math. <br />
          Design with AI. Hang with confidence.
        </p>

        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 transition-all hover:-translate-y-1 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
          Start Designing
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full text-left">
          <FeatureCard
            icon={<Sparkles className="text-purple-500" />}
            title="AI Calibration"
            desc="Just upload a photo. We calculate the math so you don't have to."
          />
          <FeatureCard
            icon={<Layout className="text-blue-500" />}
            title="Auto-Layout"
            desc="Perfect grids or organic mosaics in one click."
          />
          <FeatureCard
            icon={<Hammer className="text-gray-300" />}
            title="Hanging Map"
            desc="Get a PDF with exact nail measurements for your wall."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm border-t border-border">
        &copy; {new Date().getFullYear()} Vura AI. All rights reserved.
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-6 rounded-2xl bg-card border border-border hover:border-blue-900/50 hover:bg-blue-900/10 transition duration-300">
    <div className="mb-4 bg-gray-800 w-12 h-12 rounded-xl flex items-center justify-center text-xl">
      {icon}
    </div>
    <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default LandingPage;
