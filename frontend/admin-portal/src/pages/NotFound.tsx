import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { EmptyState } from '@shared/components/EmptyState';
import { useAuth } from '../hooks/useAuth';

/**
 * 404 (Z5). The admin catch-all previously redirected unknown paths to
 * /dashboard, which silently masked broken links. Mirror of the user
 * portal's NotFound: clear message + Back to Dashboard when signed in,
 * or Back to Login when signed out — never back to the invalid route.
 */
export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <EmptyState
          title="Page not found"
          message="That address does not match any page in the TradingBeast admin portal. It may have moved, or the link may be incomplete."
          action={
            <Button onClick={() => navigate(user ? '/dashboard' : '/login', { replace: true })}>
              {user ? 'Back to Dashboard' : 'Back to Login'}
            </Button>
          }
        />
      </Card>
    </div>
  );
}
