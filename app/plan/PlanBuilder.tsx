"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import { simulate, hardshipLetter, type Debt, type Strategy } from "@/lib/plan";
import { saveDebts } from "./actions";

const blank = (): Debt => ({ id: crypto.randomUUID(), name: "", balance: 0, rate: 0, minimum: 0 });
const fmtMonths = (m: number) => (m >= 600 ? "50+ years" : m < 12 ? `${m} months` : `${Math.floor(m / 12)} yr ${m % 12} mo`);

export default function PlanBuilder({ countryCode, name, level, initialDebts, suggestedBudget }:
  { countryCode: CountryCode; name: string; level: "green" | "amber" | "red" | null; initialDebts: Debt[]; suggestedBudget: number }) {
  const c = COUNTRIES[countryCode];
  const [debts, setDebts] = useState<Debt[]>(initialDebts.length ? initialDebts : [blank()]);
  const minTotal = debts.reduce((s, d) => s + (+d.minimum || 0), 0);
  const [budget, setBudget] = useState<number>(Math.max(suggestedBudget, 0));
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [saved, setSaved] = useState<string>("");
  const [pending, start] = useTransition();
  const [letterFor, setLetterFor] = useState<string>("");
  const [account, setAccount] = useState("");
  const [signName, setSignName] = useState(name);

  const valid = useMemo(() => debts.filter(d => d.balance > 0), [debts]);
  const effBudget = Math.max(budget, minTotal);
  const av = useMemo(() => simulate(valid, effBudget, "avalanche"), [valid, effBudget]);
  const sb = useMemo(() => simulate(valid, effBudget, "snowball"), [valid, effBudget]);
  const chosen = strategy === "avalanche" ? av : sb;
  const totalOwed = valid.reduce((s, d) => s + d.balance, 0);

  const upd = (id: string, k: keyof Debt, v: string) =>
    setDebts(ds => ds.map(d => (d.id === id ? { ...d, [k]: k === "name" ? v : Number(v.replace(/[^\d.]/g, "")) || 0 } : d)));

  const save = () => start(async () => { await saveDebts(debts.filter(d => d.name || d.balance)); setSaved("Saved ✓"); setTimeout(() => setSaved(""), 2500); });
  const letterDebt = debts.find(d => d.id === letterFor);
  const offer = letterDebt && chosen.feasible ? money(c, Math.max(letterDebt.minimum, 0)) : "";

  return (
    <div className="wrap section">
      <div className="row noprint" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>My Debt Recovery Plan</h1>
        <div className="row"><button className="btn ghost sm" onClick={() => window.print()}>🖨️ Print / save PDF</button><Link className="btn ghost sm" href="/#check">Back to check</Link></div>
      </div>
      {level === "red" && <p className="error" style={{ marginTop: 12 }}>Your last check was <strong>RED</strong>. Before paying extra on any debt, make sure food, housing and power are covered and contact {c.firstCall.name} ({c.firstCall.phone ?? c.firstCall.url}). Debt repayments come second.</p>}

      {/* 1. Debt register */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>1. Debt register</h2>
        <p className="muted small">Ask each lender for a current statement so these numbers are exact. Interest = yearly rate (APR %). Minimum = required monthly payment.</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Who you owe</th><th>Balance ({c.symbol})</th><th>Interest %/yr</th><th>Min. per month</th><th className="noprint"></th></tr></thead>
            <tbody>
              {debts.map(d => (
                <tr key={d.id}>
                  <td><input value={d.name} placeholder="e.g. Credit card" onChange={e => upd(d.id, "name", e.target.value)} /></td>
                  <td><input inputMode="decimal" value={d.balance || ""} onChange={e => upd(d.id, "balance", e.target.value)} /></td>
                  <td><input inputMode="decimal" value={d.rate || ""} onChange={e => upd(d.id, "rate", e.target.value)} /></td>
                  <td><input inputMode="decimal" value={d.minimum || ""} onChange={e => upd(d.id, "minimum", e.target.value)} /></td>
                  <td className="noprint"><button className="btn ghost sm" aria-label="Remove" onClick={() => setDebts(ds => ds.filter(x => x.id !== d.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row noprint" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" onClick={() => setDebts(ds => [...ds, blank()])}>+ Add debt</button>
          <button className="btn sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button><span className="small">{saved}</span>
        </div>
        <p style={{ marginTop: 10 }}><strong>Total owed:</strong> {money(c, totalOwed)} · <strong>Minimums:</strong> {money(c, minTotal)}/month</p>
      </div>

      {/* 2. Payoff */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>2. Your payoff timeline</h2>
        <div className="grid g2">
          <div className="field">
            <label htmlFor="budget">How much can you put towards ALL debts each month? ({c.symbol})</label>
            <input id="budget" inputMode="decimal" value={budget || ""} onChange={e => setBudget(Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} />
            <div className="hint">From your health check, about {money(c, suggestedBudget)} is left after essentials. Only commit what you can keep paying. {budget < minTotal && minTotal > 0 && `This is below your minimums (${money(c, minTotal)}), so we've used the minimums. Ask creditors for lower payments (see letters below).`}</div>
          </div>
          <div className="field">
            <label>Method</label>
            <div className="row">
              <button className={`btn sm ${strategy === "avalanche" ? "" : "ghost"}`} onClick={() => setStrategy("avalanche")}>Highest interest first</button>
              <button className={`btn sm ${strategy === "snowball" ? "" : "ghost"}`} onClick={() => setStrategy("snowball")}>Smallest debt first</button>
            </div>
            <div className="hint">Highest-interest first usually saves the most money. Smallest-first gives quicker wins that keep you motivated.</div>
          </div>
        </div>
        {valid.length === 0 ? <p className="muted">Add your debts above to see your timeline.</p> : !chosen.feasible ? (
          <p className="error">At this amount the interest grows faster than you can pay. That&apos;s not your fault: it&apos;s a sign you need a hardship arrangement. Send the letters below and talk to {c.firstCall.name} about formal options.</p>
        ) : (
          <>
            <div className="grid g3" style={{ marginTop: 8 }}>
              <div className="card soft"><div className="hint">Debt-free in</div><strong style={{ fontSize: "1.4rem" }}>{fmtMonths(chosen.months)}</strong></div>
              <div className="card soft"><div className="hint">Total interest</div><strong style={{ fontSize: "1.4rem" }}>{money(c, chosen.totalInterest)}</strong></div>
              <div className="card soft"><div className="hint">{strategy === "avalanche" ? "Saves vs smallest-first" : "Costs vs highest-interest-first"}</div><strong style={{ fontSize: "1.4rem" }}>{money(c, Math.abs(sb.totalInterest - av.totalInterest))}</strong></div>
            </div>
            <h3 style={{ marginTop: 16 }}>Pay off in this order</h3>
            <ol>{chosen.order.map(n => <li key={n}><strong>{n || "Unnamed debt"}</strong>: cleared in month {chosen.payoffMonth[n] ?? "—"}</li>)}</ol>
            <p className="small muted">Pay the minimum on everything, put every extra {c.symbol} on the first debt in the list, and when it&apos;s cleared roll its payment onto the next. Illustrative only: real interest, fees and agreed terms will change the numbers.</p>
          </>
        )}
      </div>

      {/* 3. Letters */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>3. Hardship letters</h2>
        <div className="grid g3 noprint">
          <div className="field"><label htmlFor="lf">Creditor</label>
            <select id="lf" value={letterFor} onChange={e => setLetterFor(e.target.value)}>
              <option value="">Choose a debt…</option>
              {debts.filter(d => d.name).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div className="field"><label htmlFor="acc">Account / reference</label><input id="acc" value={account} onChange={e => setAccount(e.target.value)} placeholder="optional" /></div>
          <div className="field"><label htmlFor="sn">Your name</label><input id="sn" value={signName} onChange={e => setSignName(e.target.value)} /></div>
        </div>
        <div className="letter">{hardshipLetter({ name: signName, creditor: letterDebt?.name ?? "", account, rightsNote: c.rightsNote, offer })}</div>
        <button className="btn ghost sm noprint" style={{ marginTop: 10 }} onClick={() => navigator.clipboard.writeText(hardshipLetter({ name: signName, creditor: letterDebt?.name ?? "", account, rightsNote: c.rightsNote, offer }))}>Copy letter</button>
        <p className="hint">Send by email so you have a record. Ask for every agreement in writing.</p>
      </div>

      {/* 4. Checklist */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>4. Your 30-day action checklist</h2>
        <h3>This week: stop things getting worse</h3>
        <ul>
          <li>☐ Make sure food, rent/mortgage, power and medicines are covered first</li>
          <li>☐ Contact <strong>{c.firstCall.name}</strong>{c.firstCall.phone ? ` on ${c.firstCall.phone}` : ""} (free)</li>
          <li>☐ Don&apos;t take a new loan to pay an old one</li>
          <li>☐ Cancel subscriptions you can live without</li>
          <li>☐ Check government support: {c.groups.find(g => /government/i.test(g.title))?.items[0]?.name ?? c.groups[0].items[0].name}</li>
        </ul>
        <h3>Week 2: know exactly what you owe</h3>
        <ul><li>☐ Get a current statement from every lender and update the register above</li><li>☐ Note which accounts are with debt collectors</li></ul>
        <h3>Weeks 3–4: negotiate</h3>
        <ul><li>☐ Send a hardship letter to each creditor</li><li>☐ Get every agreement in writing</li><li>☐ Start the payoff order above with the amount you can truly afford</li></ul>
        <h3>Every fortnight after</h3>
        <ul><li>☐ Review spending for 10 minutes</li><li>☐ Build a small emergency fund, even {money(c, c.code === "PH" ? 200 : 10)} at a time</li><li>☐ Celebrate every debt you clear 🎉</li></ul>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>This plan is general information, not financial advice. A free financial mentor/counsellor can check it with you.</p>
    </div>
  );
}
