import { useEffect, useState } from 'react';
import {
  Landmark,
  Volume2,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Loader2,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { SimulationBanner } from '../components/common/SimulationBanner';
import { useSpeech } from '../context/SpeechContext';
import { getSimulatedBankingSummary } from '../services/apiClient';
import { formatNaira } from '../utils/formatters';
import type { BankingSummaryResponse } from '../types/banking';

export function BankingDemoScreen() {
  const { speak } = useSpeech();
  const [data, setData] = useState<BankingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSimulatedBankingSummary()
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Could not load simulated banking data from backend.'
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="Banking Demo" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
        <SimulationBanner
          title="Simulated Nigerian Banking Demo"
          message="This screen uses fake account data for hackathon demonstration only. ANYA never asks for bank PINs, passwords, or OTPs and cannot make real transfers."
        />

        {loading ? (
          <div className="anya-card flex items-center justify-center gap-2.5 rounded-3xl border border-anya-border bg-white p-8 text-sm font-bold text-anya-primary shadow-card">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Loading simulated account…</span>
          </div>
        ) : errorMsg ? (
          <div
            role="alert"
            className="rounded-2xl border border-anya-danger/30 bg-red-50 p-4 text-xs font-semibold text-anya-danger"
          >
            {errorMsg}
          </div>
        ) : data ? (
          <>
            {/* Balance Card */}
            <section
              aria-labelledby="demo-balance-heading"
              className="anya-card rounded-3xl border-2 border-anya-primary bg-white p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-anya-ink">
                      {data.account.bank_name}
                    </p>
                    <p className="text-[11px] text-anya-muted">
                      {data.account.account_name} · {data.account.masked_account_number}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-anya-soft/75 p-4 text-center">
                <h2
                  id="demo-balance-heading"
                  className="text-xs font-bold uppercase tracking-wide text-anya-muted"
                >
                  Available Balance (Demo)
                </h2>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-anya-ink">
                  {formatNaira(data.account.available_balance)}
                </p>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => speak(data.account.spoken_balance, { force: true })}
                  className="anya-cta-gradient flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white shadow-cta"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Read Balance</span>
                </button>
                <button
                  type="button"
                  onClick={() => speak(data.spoken_transactions_summary, { force: true })}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-anya-soft px-3 py-2 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Read History</span>
                </button>
              </div>
            </section>

            {/* Recent Transactions */}
            <section aria-labelledby="demo-tx-heading">
              <h2
                id="demo-tx-heading"
                className="mb-2.5 text-xs font-bold uppercase tracking-wide text-anya-muted"
              >
                Recent Transactions (Simulated)
              </h2>

              <ul className="space-y-2.5">
                {data.transactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <li
                      key={tx.id}
                      className="anya-card flex items-center justify-between gap-3 rounded-2xl border border-anya-border bg-white p-3.5 shadow-card"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isCredit
                              ? 'bg-emerald-100 text-anya-success'
                              : 'bg-anya-soft text-anya-primary'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-anya-ink">{tx.description}</p>
                          <p className="text-[11px] text-anya-muted">
                            {tx.date} · {tx.category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-sm font-extrabold ${
                            isCredit ? 'text-anya-success' : 'text-anya-ink'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatNaira(tx.amount)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-anya-muted">
                          {isCredit ? 'Credit' : 'Debit'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Security safeguard note */}
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-xs font-semibold text-anya-muted shadow-card">
              <Lock className="h-4 w-4 shrink-0 text-anya-primary" aria-hidden="true" />
              <span>Transfers, PIN entry, and OTPs are disabled in this demo for your safety.</span>
            </div>
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
