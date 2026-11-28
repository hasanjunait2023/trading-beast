import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useBeforeUnload } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, Select, Textarea, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { Modal } from '@shared/components/Modal';
import { useToast } from '@shared/components/Toast';
import {
  userApi,
  analysisApi,
  ApiError,
  type JournalTradeInput,
} from '../services/api';

/**
 * Trade Editor (study 18): create at /app/journal/new, edit at
 * /app/journal/:id/edit. Decimal inputs stay STRINGS until submit so price /
 * quantity precision is preserved end-to-end (the API stores Decimal(20,8)).
 * A trade is closed only when it has both a close time and an exit price —
 * the "Closed" toggle drives both together.
 *
 * Unsaved-changes guard: the app uses the classic BrowserRouter (not a data
 * router), so react-router's useBlocker is unavailable. The guard therefore
 * combines (1) useBeforeUnload for reload / tab close / leaving the app,
 * (2) a capture-phase click interceptor for in-app <a> navigation, and
 * (3) an explicit confirm on this page's own Back action. Sidebar buttons
 * (non-anchor navigation in the shell) are not interceptable from here —
 * that residual gap is documented, not hidden.
 */

interface FormState {
  symbol: string;
  side: 'LONG' | 'SHORT';
  openedAt: string; // datetime-local value
  isClosed: boolean;
  closedAt: string; // datetime-local value
  quantity: string;
  entryPrice: string;
  exitPrice: string;
  stopPrice: string;
  fees: string;
  initialRiskAmount: string;
  currency: string;
  tags: string; // comma-separated in the form; split on submit
  notes: string;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

const emptyForm = (): FormState => ({
  symbol: '',
  side: 'LONG',
  openedAt: nowLocalInput(),
  isClosed: false,
  closedAt: '',
  quantity: '',
  entryPrice: '',
  exitPrice: '',
  stopPrice: '',
  fees: '0',
  initialRiskAmount: '',
  currency: 'USD',
  tags: '',
  notes: '',
});

/** Map API error details (zod issues or service {field,message}) by field. */
function mapFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const details = err.envelope?.details;
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const d of details as Array<Record<string, unknown>>) {
      const field =
        typeof d.field === 'string'
          ? d.field
          : Array.isArray(d.path) && typeof d.path[0] === 'string'
            ? (d.path[0] as string)
            : null;
      if (field && typeof d.message === 'string' && !out[field]) out[field] = d.message;
    }
  }
  return out;
}

export default function TradeEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [pairs, setPairs] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => initial !== '' && JSON.stringify(form) !== initial,
    [form, initial],
  );
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // (1) Reload / tab close / leaving the app entirely.
  useBeforeUnload(
    useCallback((e) => {
      if (dirtyRef.current) e.preventDefault();
    }, []),
  );

  // (2) In-app anchor navigation (Link components) while dirty.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a');
      const href = anchor?.getAttribute('href');
      if (anchor && href && href.startsWith('/')) {
        if (!window.confirm('You have unsaved changes. Leave without saving?')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const confirmLeave = (): boolean =>
    !dirty || window.confirm('You have unsaved changes. Leave without saving?');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pairsRes = await analysisApi.getPairs();
      const catalog = pairsRes.data.data ?? [];
      setPairs(catalog);
      if (isEdit && id) {
        const res = await userApi.getJournalTrade(id);
        const t = res.data.data;
        if (!t) throw new Error('missing');
        const loaded: FormState = {
          symbol: t.symbol,
          side: t.side,
          openedAt: toLocalInput(t.openedAt),
          isClosed: t.isClosed,
          closedAt: t.closedAt ? toLocalInput(t.closedAt) : '',
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice ?? '',
          stopPrice: t.stopPrice ?? '',
          fees: t.fees,
          initialRiskAmount: t.initialRiskAmount ?? '',
          currency: t.currency,
          tags: t.tags.join(', '),
          notes: t.notes ?? '',
        };
        setForm(loaded);
        setInitial(JSON.stringify(loaded));
      } else {
        const fresh = { ...emptyForm(), symbol: catalog[0] ?? '' };
        setForm(fresh);
        setInitial(JSON.stringify(fresh));
      }
      setLoadError('');
    } catch {
      setLoadError(
        isEdit
          ? 'Could not load this trade. It may have been deleted, or it belongs to another account.'
          : 'Could not load the symbol catalog. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const buildPayload = (): JournalTradeInput | null => {
    const local: Record<string, string> = {};
    if (!form.symbol) local.symbol = 'Choose a symbol.';
    if (!form.quantity.trim()) local.quantity = 'Enter the quantity.';
    if (!form.entryPrice.trim()) local.entryPrice = 'Enter the entry price.';
    if (!form.openedAt) local.openedAt = 'Enter when the trade opened.';
    if (form.isClosed) {
      if (!form.closedAt) local.closedAt = 'Enter when the trade closed.';
      if (!form.exitPrice.trim()) local.exitPrice = 'Enter the exit price.';
    }
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return null;
    }
    const opt = (v: string) => (v.trim() ? v.trim() : null);
    return {
      symbol: form.symbol,
      side: form.side,
      openedAt: new Date(form.openedAt).toISOString(),
      closedAt: form.isClosed ? new Date(form.closedAt).toISOString() : null,
      quantity: form.quantity.trim(),
      entryPrice: form.entryPrice.trim(),
      exitPrice: form.isClosed ? form.exitPrice.trim() : null,
      stopPrice: opt(form.stopPrice),
      fees: form.fees.trim() || '0',
      initialRiskAmount: opt(form.initialRiskAmount),
      currency: form.currency.trim().toUpperCase() || 'USD',
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: form.notes.trim() ? form.notes : null,
    };
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        await userApi.updateJournalTrade(id, payload);
        toast.success('Trade updated.');
      } else {
        await userApi.createJournalTrade(payload);
        toast.success('Trade added to your journal.');
      }
      // Mark clean BEFORE navigating so the guard does not fire on success.
      setInitial(JSON.stringify(form));
      navigate('/app/journal');
    } catch (err) {
      const fieldErrors = mapFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        toast.error('Some fields need attention — see the highlighted fields.');
      } else if (err instanceof ApiError && err.status === 404) {
        toast.error('This trade no longer exists.');
      } else {
        toast.error(
          err instanceof ApiError && err.message
            ? err.message
            : 'Could not save the trade. Your entries are still here — try again.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await userApi.deleteJournalTrade(id);
      toast.success('Trade deleted.');
      setInitial(JSON.stringify(form));
      setConfirmDelete(false);
      navigate('/app/journal');
    } catch {
      toast.error('Could not delete the trade. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-label="Loading trade editor">
        <Skeleton height={40} />
        <Skeleton height={220} />
        <Skeleton height={180} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState message={loadError} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={isEdit ? 'Edit Trade' : 'Add Trade'}
        subtitle="Prices and amounts are kept as exact decimals. R is computed only when you record an initial risk amount."
      />

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Symbol" error={errors.symbol}>
            <Select value={form.symbol} onChange={(e) => set('symbol', e.target.value)}>
              {pairs.length === 0 && <option value="">No catalog available</option>}
              {pairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Side</span>
            <div className="flex gap-2" role="group" aria-label="Side">
              {(['LONG', 'SHORT'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.side === s}
                  onClick={() => set('side', s)}
                  className={`min-h-[44px] flex-1 rounded-[var(--radius-md)] border px-3 text-sm font-bold ${
                    form.side === s
                      ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Opened at" error={errors.openedAt}>
            <Input
              type="datetime-local"
              value={form.openedAt}
              onChange={(e) => set('openedAt', e.target.value)}
            />
          </FormField>
          <FormField label="Quantity (units)" error={errors.quantity} hint="Amount traded, in the instrument's units.">
            <Input
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="e.g. 0.50"
            />
          </FormField>
        </div>

        <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.isClosed}
            onChange={(e) => {
              const checked = e.target.checked;
              set('isClosed', checked);
              if (checked && !form.closedAt) set('closedAt', nowLocalInput());
            }}
          />
          This trade is closed
        </label>

        {form.isClosed && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Closed at" error={errors.closedAt}>
              <Input
                type="datetime-local"
                value={form.closedAt}
                onChange={(e) => set('closedAt', e.target.value)}
              />
            </FormField>
            <FormField label="Exit price" error={errors.exitPrice}>
              <Input
                inputMode="decimal"
                value={form.exitPrice}
                onChange={(e) => set('exitPrice', e.target.value)}
                placeholder="e.g. 1.10425"
              />
            </FormField>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Entry price" error={errors.entryPrice}>
            <Input
              inputMode="decimal"
              value={form.entryPrice}
              onChange={(e) => set('entryPrice', e.target.value)}
              placeholder="e.g. 1.10000"
            />
          </FormField>
          <FormField label="Stop price (optional)" error={errors.stopPrice} hint="Where your stop was placed — kept for review, R uses initial risk below.">
            <Input
              inputMode="decimal"
              value={form.stopPrice}
              onChange={(e) => set('stopPrice', e.target.value)}
              placeholder="e.g. 1.09500"
            />
          </FormField>
          <FormField label="Fees" error={errors.fees}>
            <Input
              inputMode="decimal"
              value={form.fees}
              onChange={(e) => set('fees', e.target.value)}
              placeholder="0"
            />
          </FormField>
          <FormField
            label="Initial risk amount (optional)"
            error={errors.initialRiskAmount}
            hint="Money risked on this trade, in the trade currency. Without it, R is unavailable."
          >
            <Input
              inputMode="decimal"
              value={form.initialRiskAmount}
              onChange={(e) => set('initialRiskAmount', e.target.value)}
              placeholder="e.g. 100"
            />
          </FormField>
          <FormField label="Currency" error={errors.currency}>
            <Input
              value={form.currency}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="USD"
            />
          </FormField>
          <FormField label="Tags (comma-separated)" error={errors.tags}>
            <Input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. london, breakout"
            />
          </FormField>
        </div>
        <FormField label="Notes (optional)" error={errors.notes}>
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Setup, execution, what you would do differently…"
          />
        </FormField>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" loading={saving} disabled={saving} onClick={() => void save()}>
          {isEdit ? 'Save trade' : 'Add trade'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            if (confirmLeave()) navigate('/app/journal');
          }}
        >
          Back to Journal
        </Button>
        {isEdit && (
          <Button variant="danger" size="lg" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>
      {dirty && (
        <p className="text-xs text-[var(--color-text-muted)]">
          You have unsaved changes — leaving this page will ask for confirmation.
        </p>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this trade?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep trade
            </Button>
            <Button variant="danger" loading={deleting} disabled={deleting} onClick={() => void remove()}>
              Delete trade
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          This permanently removes the trade from your journal. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
