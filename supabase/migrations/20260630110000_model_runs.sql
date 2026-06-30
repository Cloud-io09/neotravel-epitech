create table if not exists model_runs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  purpose text not null,
  provider text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  estimated_cost_eur numeric,
  latency_ms integer,
  input_hash text not null,
  output_hash text,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now(),
  constraint model_runs_purpose_check check (
    purpose in ('extract_demand', 'clarify', 'summarize', 'partner_suggestion', 'tool_call')
  ),
  constraint model_runs_status_check check (status in ('success', 'error', 'blocked', 'mock')),
  constraint model_runs_tokens_check check (
    (prompt_tokens is null or prompt_tokens >= 0)
    and (completion_tokens is null or completion_tokens >= 0)
  ),
  constraint model_runs_cost_check check (estimated_cost_eur is null or estimated_cost_eur >= 0),
  constraint model_runs_latency_check check (latency_ms is null or latency_ms >= 0)
);

create index if not exists model_runs_created_at_idx on model_runs(created_at desc);
create index if not exists model_runs_lead_id_idx on model_runs(lead_id);
create index if not exists model_runs_purpose_idx on model_runs(purpose);

alter table model_runs enable row level security;
revoke all on table model_runs from anon, authenticated;
grant all on table model_runs to service_role;
