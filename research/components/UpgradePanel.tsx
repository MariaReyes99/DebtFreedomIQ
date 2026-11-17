'use client';

import Link from 'next/link';
import { ANONYMOUS_MONTHLY_QUESTIONS, PLANS } from '../lib/plans';

export type LimitTier = 'anonymous' | 'free' | 'premium' | 'plus';

/** Shown in place of the question box once this month's questions are used. */
export default function UpgradePanel({ tier }: { tier: LimitTier }) {
  if (tier === 'anonymous') {
    return (
      <section className="upgrade-panel" aria-labelledby="upgrade-title">
        <h2 id="upgrade-title">Log in to keep asking</h2>
        <p>
          You&apos;ve used the {ANONYMOUS_MONTHLY_QUESTIONS} questions for visitors this month. A free DebtFreedomIQ account gives you{' '}
          {PLANS.free.monthlyQuestions} questions a month, and Premium Plus gives you {PLANS.plus.monthlyQuestions}.
        </p>
        <div className="upgrade-actions">
          <Link className="plan-button" href="/login?next=/whatif/library">Log in</Link>
          <Link className="plan-button is-secondary" href="/signup">Create a free account</Link>
        </div>
        <small>My retirement picture works without an account. <Link href="/whatif/retirement">Open My retirement picture</Link></small>
      </section>
    );
  }
  return (
    <section className="upgrade-panel" aria-labelledby="upgrade-title">
      <h2 id="upgrade-title">You&apos;ve used this month&apos;s questions</h2>
      <p>
        Your {PLANS[tier].label} plan includes {PLANS[tier].monthlyQuestions} questions a month, and resets 30 days after your allowance started.
        {tier !== 'plus' && ` Premium Plus includes ${PLANS.plus.monthlyQuestions} questions a month.`}
      </p>
      {tier !== 'plus' && <Link className="plan-button" href="/pricing">See Premium Plus</Link>}
    </section>
  );
}
