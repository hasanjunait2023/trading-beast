/**
 * Approved membership catalog — the SAME source the previous Plans page used
 * (docs/CREDIT-FREEMIUM.md): Free is live (10 credits/day, never expire; one
 * Radar run = 10 credits). Pro/Elite credit grants are "proposed, not yet
 * activated", so they are labelled Planned and NO prices are shown (prices
 * are still being validated). Do not add prices here without an approved
 * catalog update.
 */
export interface PlanOffering {
  id: 'FREE' | 'PRO' | 'ELITE';
  name: string;
  creditLine: string;
  creditNote: string;
  planned: boolean;
  features: string[];
}

export const PLAN_OFFERINGS: PlanOffering[] = [
  {
    id: 'FREE',
    name: 'Free',
    creditLine: '10 credits every day',
    creditNote: 'Granted automatically, every day',
    planned: false,
    features: [
      '10 credits granted daily (UTC)',
      'Credits never expire',
      'Focus Radar: focus, watch & avoid lists',
      'Asian, London & New York sessions',
      'Custom watchlist',
      'Same wallet in Telegram, Mini App & browser',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    creditLine: '+300 credits per month',
    creditNote: 'Planned credit grant — not yet active',
    planned: true,
    features: [
      'Everything in Free',
      'Advanced alerts',
      'Correlation tools',
      'Trading journal',
      'Strategy features',
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    creditLine: '+900 credits per month',
    creditNote: 'Planned credit grant — not yet active',
    planned: true,
    features: [
      'Everything in Pro',
      'AI-assisted analysis features',
      'Full strategy suite',
      'Priority access to new features as they ship',
    ],
  },
];

export const CREDIT_MODEL_NOTES: { title: string; text: string }[] = [
  {
    title: 'Daily grant',
    text: 'You receive 10 free credits every UTC day. Away for a few days? Grants catch up automatically when you return.',
  },
  {
    title: 'Radar cost',
    text: 'One Focus Radar run costs 10 credits. You only spend credits when you trigger a run — there is no automatic paid scan.',
  },
  {
    title: 'Never expire',
    text: 'Credits do not expire. Your balance keeps building until you choose to spend it.',
  },
  {
    title: 'Referral bonus',
    text: 'Invite friends with your referral code — you both earn 7 days of free Pro for every credited referral.',
  },
  {
    title: 'One wallet everywhere',
    text: 'A single credit balance is shared across the Telegram bot, the Mini App and this web portal.',
  },
  {
    title: 'Failed runs refunded',
    text: 'If an analysis run fails on our side, the 10 credits are refunded to your wallet automatically.',
  },
];
