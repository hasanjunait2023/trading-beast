import { lazy, Suspense } from 'react';
import Navigation from './components/Navigation';
import { Hero } from './components/Hero';
import TrustStrip from './components/TrustStrip';
import Footer from './components/Footer';

// Below-fold sections are code-split so the initial bundle stays small;
// each chunk loads as the page renders (Suspense fallback reserves nothing —
// sections simply appear, matching the reveal-on-scroll design).
const PainPoints = lazy(() => import('./components/PainPoints'));
const Docs = lazy(() => import('./components/Docs'));
const Sessions = lazy(() => import('./components/Sessions'));
const Features = lazy(() => import('./components/Features'));
const AppShowcase = lazy(() => import('./components/AppShowcase'));
const Comparison = lazy(() => import('./components/Comparison'));
const Pricing = lazy(() => import('./components/Pricing'));
const FAQ = lazy(() => import('./components/FAQ'));
const FinalCTA = lazy(() => import('./components/FinalCTA'));

export default function App() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <Navigation />
      <main>
        <Hero />
        <TrustStrip />
        <Suspense fallback={null}>
          <PainPoints />
          <Docs />
          <Sessions />
          <Features />
          <AppShowcase />
          <Comparison />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
