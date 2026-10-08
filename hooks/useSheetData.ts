import { useEffect, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface Project {
  project_id: string;
  project_name: string;
  location: string;
  client: string;
  status: string;
  start_date: string;
  end_date: string;
  total_budget_usd: number;
  spent_to_date_usd: number;
  progress_pct: number;
  workers_count: number;
  equipment_count: number;
  cpi: number;
  spi: number;
  notes: string;
  // Optional site-camera feed URL (WebRTC viewer page or .m3u8)
  camera_url?: string;
  // Optional deviation fields (new, may not exist in all sheets)
  cost_variance_usd?: number;
  schedule_variance_days?: number;
  deviation_status?: string;
  // Optional plan/fact/deviation % fields, computed by formula in the sheet itself.
  // Not all project sheets have these yet, so they stay undefined (not defaulted)
  // and the dashboard falls back to computing them client-side when missing.
  plan_pct?: number;
  fact_pct?: number;
  deviation_pct?: number;
}

export interface Worker {
  worker_id: string;
  project_id: string;
  full_name: string;
  role: string;
  department: string;
  company: string;
  daily_rate_usd: number;
  start_date: string;
  status: string;
}

export interface Equipment {
  equipment_id: string;
  project_id: string;
  name: string;
  type: string;
  serial_id: string;
  owner: string;
  daily_cost_usd: number;
  assigned_date: string;
  status: string;
  last_service: string;
}

export interface BudgetRow {
  record_id: string;
  project_id: string;
  month: string;
  category: string;
  planned_usd: number;
  actual_usd: number;
  variance_usd: number;
}

export interface Milestone {
  milestone_id: string;
  project_id: string;
  phase: string;
  milestone_name: string;
  planned_start: string;
  planned_end: string;
  actual_end: string;
  progress_pct: number;
  status: string;
  responsible: string;
  // Optional quantity-based tracking (new columns, may not exist yet)
  total_qty?: number;
  actual_completed?: number;
}

export interface EvmRow {
  record_id: string;
  project_id: string;
  month: string;
  bac_usd: number;
  pv_usd: number;
  ev_usd: number;
  ac_usd: number;
  cpi: number;
  spi: number;
  cv_usd: number;
  sv_usd: number;
  eac_usd: number;
}

export interface Issue {
  issue_id: string;
  project_id: string;
  date_raised: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string;
  due_date: string;
  resolved_date: string;
  notes: string;
}

export interface DailyReport {
  report_id: string;
  project_id: string;
  date: string;
  workers_present: number;
  equipment_active: number;
  work_summary: string;
  weather: string;
  incidents: number;
  submitted_by: string;
  notes: string;
}

export interface SheetData {
  projects: Project[];
  workers: Worker[];
  equipment: Equipment[];
  budget: BudgetRow[];
  schedule: Milestone[];
  evm: EvmRow[];
  issues: Issue[];
  dailyReports: DailyReport[];
}

// ─── Fetch helpers ───────────────────────────────────────────────
function sheetUrl(sheetName: string, sheetId: string): string {
  const encoded = encodeURIComponent(sheetName);
  // Cache-bust with a timestamp: Google's gviz endpoint and/or the browser's
  // own HTTP cache can otherwise serve a stale snapshot of a tab for a
  // while, even after the sheet has been edited and the page reloaded.
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encoded}&_ts=${Date.now()}`;
}

async function fetchSheet<T>(sheetName: string, sheetId: string): Promise<T[]> {
  const url = sheetUrl(sheetName, sheetId);
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  const json = JSON.parse(text.substring(47, text.length - 2));
  const cols: string[] = json.table.cols.map((c: any) => c.label as string);
  const rows: T[] = json.table.rows
    .filter((r: any) => r && r.c && r.c[0] && r.c[0].v)
    .map((row: any) => {
      const obj: Record<string, any> = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        let val: any = cell ? (cell.v ?? '') : '';
        // Percent-formatted cells (e.g. "0,29%") arrive from Google as the raw
        // fraction (0.0029). The dashboard works in percent points (0.29), so
        // if the cell's displayed text is a percentage and matches v*100 more
        // closely than v itself, convert it. Plain numbers are left untouched.
        if (cell && typeof cell.v === 'number' && typeof cell.f === 'string' && cell.f.includes('%')) {
          const shown = parseFloat(cell.f.replace('%', '').replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(shown) && Math.abs(cell.v * 100 - shown) < Math.abs(cell.v - shown)) {
            val = cell.v * 100;
          }
        }
        obj[col] = val;
      });
      return obj as T;
    });
  return rows;
}

// ─── Main hook ───────────────────────────────────────────────────
export function useSheetData(sheetId?: string) {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sheetId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [projects, workers, equipment, budget, schedule, evm, issues, dailyReports] =
        await Promise.all([
          fetchSheet<Project>('Projects', sheetId),
          fetchSheet<Worker>('Workers', sheetId),
          fetchSheet<Equipment>('Equipment', sheetId),
          fetchSheet<BudgetRow>('Budget', sheetId),
          fetchSheet<Milestone>('Schedule', sheetId),
          fetchSheet<EvmRow>('EVM', sheetId),
          fetchSheet<Issue>('Issues', sheetId),
          fetchSheet<DailyReport>('Daily Reports', sheetId),
        ]);
      
      // Optional: ensure deviation fields have defaults if they exist
      const projectsWithDefaults = projects.map(p => ({
        ...p,
        cost_variance_usd: p.cost_variance_usd ?? 0,
        schedule_variance_days: p.schedule_variance_days ?? 0,
        deviation_status: p.deviation_status ?? 'Unknown',
        // plan_pct / fact_pct / deviation_pct are left as-is (undefined if the
        // sheet doesn't have the columns yet) so the dashboard can tell the
        // difference between "0%" and "not provided" and fall back accordingly.
        plan_pct: p.plan_pct,
        fact_pct: p.fact_pct,
        // Sheet header is sometimes just "deviation" instead of "deviation_pct"
        deviation_pct: p.deviation_pct ?? (p as any).deviation,
      }));

      setData({ 
        projects: projectsWithDefaults, 
        workers, 
        equipment, 
        budget, 
        schedule, 
        evm, 
        issues, 
        dailyReports 
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
