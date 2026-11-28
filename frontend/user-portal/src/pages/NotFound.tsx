import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/components/Button';
import { RadarArt } from '@shared/components/RadarArt';
import { ArrowRightIcon } from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';

/**
 * 404 (study 27). Gradient "Page not found" hero, radar illustration card
 * and a gradient Back action — Back to Home when signed in, or Back to
 * Login when signed out — never back to the invalid route.
 */
export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-8">
      <section
        aria-label="Page not found"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <h1 className="relative text-[34px] leading-tight font-extrabold tracking-tight">
          Page not found
        </h1>
      </section>
      <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-surface)] px-6 py-8 text-center shadow-[var(--shadow-card-soft)]">
        <RadarArt size={230} className="mx-auto" />
        <p className="mx-auto mt-6 max-w-xs text-[19px] leading-snug font-semibold">
          The page you're looking for couldn't be found.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--color-text-muted)]">
          That address does not match any page in TradingBeast. It may have moved, or the link
          may be incomplete.
        </p>
        <Button
          size="lg"
          className="mt-6 w-full rounded-full text-white"
          style={{ background: 'var(--gradient-primary-action)' }}
          onClick={() => navigate(user ? '/app' : '/login', { replace: true })}
        >
          {user ? 'Back to Home' : 'Back to Login'} <ArrowRightIcon size={19} />
        </Button>
      </div>
    </div>
  );
}
