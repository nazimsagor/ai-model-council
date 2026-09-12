import Link from "next/link";
import { getCurrentUser } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { isAdminConfigured, isServiceRoleConfigured } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  is_subscribed: boolean;
  subscription_expires_at: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  user_id: string;
  tran_id: string;
  amount: number | string;
  currency: string;
  status: string;
  val_id: string | null;
  card_type: string | null;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

interface CouponRow {
  code: string;
  percent_off: number;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
  created_at: string;
}

interface RunRow {
  id: string;
  user_id: string | null;
  prompt: string;
  workflow: string;
  status: string;
  selected_model_ids: string[];
  total_cost: number;
  created_at: string;
}

function money(value: number, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function dateTime(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "valid" || status === "complete") return "bg-success-soft text-success";
  if (status === "failed" || status === "cancelled") return "bg-danger-soft text-danger";
  return "bg-warning-soft text-warning";
}

function AccessMessage({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-[720px] flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-lg border border-border bg-surface px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-text">Admin</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted">{message}</p>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent-hover"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</p>
      <p className="mt-2 text-[24px] font-semibold tracking-tight">{value}</p>
      <p className="mt-1 truncate text-[12px] text-muted">{note}</p>
    </section>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${className}`}>{children}</span>;
}

async function loadAdminData() {
  const [profilesResult, paymentsResult, couponsResult, runsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, name, is_subscribed, subscription_expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<ProfileRow[]>(),
    supabase
      .from("payments")
      .select("id, user_id, tran_id, amount, currency, status, val_id, card_type, coupon_code, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<PaymentRow[]>(),
    supabase
      .from("coupons")
      .select("code, percent_off, max_redemptions, redemption_count, active, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<CouponRow[]>(),
    supabase
      .from("runs")
      .select("id, user_id, prompt, workflow, status, selected_model_ids, total_cost, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<RunRow[]>(),
  ]);

  return {
    profiles: profilesResult.data ?? [],
    payments: paymentsResult.data ?? [],
    coupons: couponsResult.data ?? [],
    runs: runsResult.data ?? [],
    errors: [profilesResult.error, paymentsResult.error, couponsResult.error, runsResult.error]
      .filter(Boolean)
      .map((error) => error!.message),
  };
}

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AccessMessage
        title="Sign in required"
        message="Owner dashboard dekhte prothome owner account diye sign in korte hobe."
        actionHref="/login?next=%2Fadmin"
        actionLabel="Sign in"
      />
    );
  }

  if (!isAdminConfigured()) {
    return (
      <AccessMessage
        title="Admin access not configured"
        message="Vercel environment variables-e ADMIN_EMAILS set koro. Example: ADMIN_EMAILS=owner@example.com. Tarpor redeploy hole ei page owner dashboard dekhabe."
      />
    );
  }

  if (!user.isAdmin) {
    return (
      <AccessMessage
        title="Not allowed"
        message="Ei page sudhu ADMIN_EMAILS-e listed owner account-er jonno. Onno user-ra buyer, payment, promo data dekhte parbe na."
      />
    );
  }

  const { profiles, payments, coupons, runs, errors } = await loadAdminData();
  const usersById = new Map(profiles.map((profile) => [profile.id, profile]));
  const validPayments = payments.filter((payment) => payment.status === "valid");
  const paidPurchases = validPayments.filter((payment) => Number(payment.amount) > 0);
  const couponPayments = validPayments.filter((payment) => payment.coupon_code);
  const revenue = paidPurchases.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const subscribedUsers = profiles.filter((profile) => profile.is_subscribed).length;
  const totalModelSpend = runs.reduce((sum, run) => sum + Number(run.total_cost ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-text">Owner Dashboard</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 max-w-[720px] text-[13px] leading-6 text-muted">
            Buyers, promo usage, users, payments, and recent model runs from Supabase.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-muted">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </div>
      </div>

      {!isServiceRoleConfigured() && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] leading-6 text-warning">
          SUPABASE_SERVICE_ROLE_KEY is not configured. Dashboard may work while public grants are open, but it must be set
          before enabling RLS and locking the database.
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] leading-6 text-danger">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(revenue)} note={`${paidPurchases.length} paid purchases`} />
        <StatCard label="Subscribers" value={String(subscribedUsers)} note={`${profiles.length} total users`} />
        <StatCard label="Promo Uses" value={String(couponPayments.length)} note={`${coupons.length} promo codes`} />
        <StatCard label="Model Spend" value={`$${totalModelSpend.toFixed(4)}`} note={`${runs.length} recent runs`} />
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Sales & Buyers</h2>
          <span className="text-[11px] text-muted-2">Latest 200 payments</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-[860px] w-full text-left text-[12px]">
            <thead className="border-b border-border bg-background text-[10px] uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Promo</th>
                <th className="px-3 py-2 font-semibold">Method</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => {
                const profile = usersById.get(payment.user_id);
                return (
                  <tr key={payment.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{profile?.email ?? "Unknown user"}</div>
                      <div className="text-[11px] text-muted-2">{profile?.name ?? payment.user_id}</div>
                    </td>
                    <td className="px-3 py-2">{money(Number(payment.amount), payment.currency)}</td>
                    <td className="px-3 py-2">
                      <Pill className={statusTone(payment.status)}>{payment.status}</Pill>
                    </td>
                    <td className="px-3 py-2 text-muted">{payment.coupon_code ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{payment.card_type ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{dateTime(payment.created_at)}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 font-mono text-[11px] text-muted" title={payment.tran_id}>
                      {payment.tran_id}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight">Promo Codes</h2>
            <span className="text-[11px] text-muted-2">Coupons table</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="min-w-[560px] w-full text-left text-[12px]">
              <thead className="border-b border-border bg-background text-[10px] uppercase tracking-wide text-muted-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Discount</th>
                  <th className="px-3 py-2 font-semibold">Redeemed</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((coupon) => (
                  <tr key={coupon.code}>
                    <td className="px-3 py-2 font-mono text-[11px]">{coupon.code}</td>
                    <td className="px-3 py-2">{coupon.percent_off}%</td>
                    <td className="px-3 py-2 text-muted">
                      {coupon.redemption_count}
                      {coupon.max_redemptions === null ? " / unlimited" : ` / ${coupon.max_redemptions}`}
                    </td>
                    <td className="px-3 py-2">
                      <Pill className={coupon.active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                        {coupon.active ? "active" : "inactive"}
                      </Pill>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted">
                      No promo codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight">Users</h2>
            <span className="text-[11px] text-muted-2">Latest 500 profiles</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="min-w-[620px] w-full text-left text-[12px]">
              <thead className="border-b border-border bg-background text-[10px] uppercase tracking-wide text-muted-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Access</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-3 py-2 font-medium">{profile.email ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{profile.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      <Pill className={profile.is_subscribed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}>
                        {profile.is_subscribed ? "subscribed" : "free"}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-muted">{dateTime(profile.created_at)}</td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Recent Runs</h2>
          <span className="text-[11px] text-muted-2">Latest 100 model jobs</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-[860px] w-full text-left text-[12px]">
            <thead className="border-b border-border bg-background text-[10px] uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Prompt</th>
                <th className="px-3 py-2 font-semibold">Workflow</th>
                <th className="px-3 py-2 font-semibold">Models</th>
                <th className="px-3 py-2 font-semibold">Cost</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => {
                const profile = run.user_id ? usersById.get(run.user_id) : null;
                return (
                  <tr key={run.id}>
                    <td className="max-w-[190px] truncate px-3 py-2 text-muted" title={profile?.email ?? run.user_id ?? ""}>
                      {profile?.email ?? run.user_id ?? "-"}
                    </td>
                    <td className="max-w-[300px] truncate px-3 py-2 font-medium" title={run.prompt}>
                      {run.prompt}
                    </td>
                    <td className="px-3 py-2 text-muted">{run.workflow}</td>
                    <td className="px-3 py-2 text-muted">{run.selected_model_ids?.length ?? 0}</td>
                    <td className="px-3 py-2 text-muted">${Number(run.total_cost ?? 0).toFixed(4)}</td>
                    <td className="px-3 py-2">
                      <Pill className={statusTone(run.status)}>{run.status}</Pill>
                    </td>
                    <td className="px-3 py-2 text-muted">{dateTime(run.created_at)}</td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    No runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
