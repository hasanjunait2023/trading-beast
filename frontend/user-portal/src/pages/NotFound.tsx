import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { useAuth } from '../hooks/useAuth';

/**
 * 404 (study 27). Clear message + Back to Home when signed in, or Back to
 * Login when signed out — never back to the invalid route.
 */
export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <EmptyState
          title="Page not found"
          message="That address does not match any page in TradingBeast. It may have moved, or the link may be incomplete."
          action={
            <Button onClick={() => navigate(user ? '/app' : '/login', { replace: true })}>
              {user ? 'Back to Home' : 'Back to Login'}
            </Button>
          }
        />
      </Card>
    </div>
  );
}
