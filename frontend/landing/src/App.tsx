import { Navigation, Hero, Sessions, Features, Pricing, Docs, Footer } from './components';

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