import Navigation from './components/Navigation';
import { Hero } from './components/Hero';
import Sessions from './components/Sessions';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Docs from './components/Docs';
import Footer from './components/Footer';

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