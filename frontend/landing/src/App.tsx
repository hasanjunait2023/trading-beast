import Navigation from './Navigation';
import Hero from './Hero';
import Sessions from './Sessions';
import Features from './Features';
import Pricing from './Pricing';
import Docs from './Docs';
import Footer from './Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#060918] text-white">
      <Navigation />
      <main>
        <Hero />
        <Sessions />
        <Features />
        <Pricing />
        <Docs />
      </main>
      <Footer />
    </div>
  );
}