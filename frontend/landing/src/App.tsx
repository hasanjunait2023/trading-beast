import Navigation from './components/Navigation';
import { Hero } from './components/Hero';
import PainPoints from './components/PainPoints';
import Sessions from './components/Sessions';
import Features from './components/Features';
import AppShowcase from './components/AppShowcase';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Docs from './components/Docs';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#060918] text-white">
      <Navigation />
      <main>
        <Hero />
        <PainPoints />
        <Sessions />
        <Features />
        <AppShowcase />
        <Comparison />
        <Pricing />
        <FAQ />
        <Docs />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
