import { useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart2,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getCategoriasVista,
  getCategoriasdemanda,
  getTasaExitoZona,
  getTopVendedoresCategoria,
  getUsuariosActivosZona,
  getZonasActividad,
} from "@/api/analytics";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/LoadingCard";
import { cn } from "@/lib/utils";

type RawRecord = Record<string, unknown>;

interface ChartRow {
  name: string;
  value: number;
}

interface SellerRow {
  seller: string;
  category: string;
  rating: number;
}

interface BuyerRow {
  buyer: string;
  zone: string;
  transactions: number;
}

const VIOLET = "#7c3aed";
const VIOLET_2 = "#8b5cf6";
const VIOLET_4 = "#c4b5fd";

export default function Analytics() {
  const categoriasDemanda = useQuery({
    queryKey: ["analytics", "categorias-demanda"],
    queryFn: getCategoriasdemanda,
  });

  const usuariosActivosZona = useQuery({
    queryKey: ["analytics", "usuarios-activos-zona"],
    queryFn: getUsuariosActivosZona,
  });

  const topVendedoresCategoria = useQuery({
    queryKey: ["analytics", "top-vendedores-categoria"],
    queryFn: getTopVendedoresCategoria,
  });

  const tasaExitoZona = useQuery({
    queryKey: ["analytics", "tasa-exito-zona"],
    queryFn: getTasaExitoZona,
  });

  const zonasActividad = useQuery({
    queryKey: ["analytics", "zonas-actividad"],
    queryFn: getZonasActividad,
  });

  const categoriasVista = useQuery({
    queryKey: ["analytics", "categorias-vista"],
    queryFn: getCategoriasVista,
  });

  const demandaRows = useMemo(
    () => normalizeChartRows(categoriasDemanda.data, CATEGORY_KEYS, REQUEST_KEYS),
    [categoriasDemanda.data]
  );
  const usuariosRows = useMemo(
    () => normalizeBuyerRows(usuariosActivosZona.data),
    [usuariosActivosZona.data]
  );
  const vendedoresRows = useMemo(
    () => normalizeSellerRows(topVendedoresCategoria.data),
    [topVendedoresCategoria.data]
  );
  const tasaRows = useMemo(
    () => normalizeChartRows(tasaExitoZona.data, ZONE_KEYS, RATE_KEYS),
    [tasaExitoZona.data]
  );
  const actividadRows = useMemo(
    () => normalizeChartRows(zonasActividad.data, ZONE_KEYS, ACTIVITY_KEYS),
    [zonasActividad.data]
  );
  const vistaRows = useMemo(
    () => normalizeChartRows(categoriasVista.data, CATEGORY_KEYS, REQUEST_KEYS),
    [categoriasVista.data]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-sm shadow-violet-200/60 flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
              Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Métricas de la plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsCard
          title="Categorías más demandadas"
          description="Solicitudes agrupadas por categoría"
          query={categoriasDemanda}
          isEmpty={demandaRows.length === 0}
        >
          <HorizontalBarChart data={demandaRows} valueLabel="Solicitudes" />
        </AnalyticsCard>

        <AnalyticsCard
          title="Usuarios activos por zona"
          description="Top 20 compradores por transacciones realizadas"
          query={usuariosActivosZona}
          isEmpty={usuariosRows.length === 0}
        >
          <TopBuyersTable rows={usuariosRows} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Top vendedores por categoría"
          description="Vendedores destacados y rating promedio"
          query={topVendedoresCategoria}
          isEmpty={vendedoresRows.length === 0}
        >
          <TopSellersTable rows={vendedoresRows} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Tasa de éxito por zona"
          description="Porcentaje de operaciones exitosas por zona"
          query={tasaExitoZona}
          isEmpty={tasaRows.length === 0}
        >
          <VerticalBarChart
            data={tasaRows}
            valueLabel="Tasa de éxito"
            valueSuffix="%"
            referenceValue={50}
            hideXLabels
          />
        </AnalyticsCard>

        <AnalyticsCard
          title="Actividad por zonas"
          description="Volumen de actividad registrado por zona"
          query={zonasActividad}
          isEmpty={actividadRows.length === 0}
        >
          <VerticalBarChart data={actividadRows} valueLabel="Actividad" hideXLabels />
        </AnalyticsCard>

        <AnalyticsCard
          title="Demanda por categorías (vista Athena)"
          description="Lectura consolidada desde la vista analítica"
          query={categoriasVista}
          isEmpty={vistaRows.length === 0}
        >
          <HorizontalBarChart data={vistaRows} valueLabel="Demanda" />
        </AnalyticsCard>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  description,
  query,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  query: UseQueryResult<unknown, Error>;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 h-[420px] flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <span className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
          <BarChart2 className="w-4 h-4 text-violet-600" />
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {query.isLoading ? (
          <ChartSkeleton />
        ) : query.isError ? (
          <ChartError error={query.error} onRetry={() => query.refetch()} />
        ) : isEmpty ? (
          <EmptyState
            icon={Database}
            title="Sin datos disponibles"
            description="La consulta no devolvió registros para esta métrica."
            className="h-full rounded-2xl border border-dashed border-border bg-muted/20"
          />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function HorizontalBarChart({
  data,
  valueLabel,
}: {
  data: ChartRow[];
  valueLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 18, bottom: 4, left: 16 }}
        barSize={24}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={118}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" fill={VIOLET} radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function VerticalBarChart({
  data,
  valueLabel,
  valueSuffix = "",
  referenceValue,
  hideXLabels = false,
}: {
  data: ChartRow[];
  valueLabel: string;
  valueSuffix?: string;
  referenceValue?: number;
  hideXLabels?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: hideXLabels ? 4 : 16, left: -10 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={hideXLabels ? false : { fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          dy={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}${valueSuffix}`}
          width={42}
        />
        <Tooltip
          content={<ChartTooltip valueLabel={valueLabel} valueSuffix={valueSuffix} />}
          cursor={{ fill: "#f8fafc" }}
        />
        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke={VIOLET_4}
            strokeDasharray="4 4"
            label={{ value: "50%", fill: VIOLET_2, fontSize: 11, position: "right" }}
          />
        )}
        <Bar dataKey="value" fill={VIOLET_2} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PAGE_SIZE = 5;

function TablePagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/20">
      <span className="text-[11px] text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-100 transition-colors"
        >
          ‹
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-100 transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function TopSellersTable({ rows }: { rows: SellerRow[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="h-full rounded-2xl border border-border overflow-hidden flex flex-col">
      <table className="w-full text-sm flex-1">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            {["Vendedor", "Categoría", "Rating"].map((header) => (
              <th
                key={header}
                className="text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-4 py-2"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {visible.map((row, index) => {
            const globalIndex = page * PAGE_SIZE + index;
            return (
              <tr key={`${row.seller}-${row.category}-${globalIndex}`} className="hover:bg-violet-50/30 transition-colors">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0",
                        globalIndex === 0
                          ? "bg-violet-600 text-white"
                          : "bg-violet-50 text-violet-700"
                      )}
                    >
                      {globalIndex + 1}
                    </span>
                    <span className="font-medium text-foreground truncate">{row.seller}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{row.category}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 text-xs font-semibold tabular-nums">
                    {row.rating.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TablePagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}

function TopBuyersTable({ rows }: { rows: BuyerRow[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="h-full rounded-2xl border border-border overflow-hidden flex flex-col">
      <table className="w-full text-sm flex-1">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            {["Comprador", "Zona", "Transacciones"].map((header) => (
              <th
                key={header}
                className="text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-4 py-2"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {visible.map((row, index) => {
            const globalIndex = page * PAGE_SIZE + index;
            return (
              <tr key={`${row.buyer}-${globalIndex}`} className="hover:bg-violet-50/30 transition-colors">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0",
                        globalIndex === 0
                          ? "bg-violet-600 text-white"
                          : "bg-violet-50 text-violet-700"
                      )}
                    >
                      {globalIndex + 1}
                    </span>
                    <span className="font-medium text-foreground truncate">{row.buyer}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{row.zone}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 text-xs font-semibold tabular-nums">
                    {row.transactions}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TablePagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  valueSuffix = "",
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartRow }>;
  label?: string;
  valueLabel: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value ?? 0;
  const name = payload[0].payload?.name ?? label;

  return (
    <div className="rounded-xl border border-border bg-white shadow-lg shadow-black/10 px-4 py-3 min-w-[148px]">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
        {name}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">{valueLabel}</span>
        </div>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {formatMetric(value)}{valueSuffix}
        </span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full flex flex-col justify-end gap-3">
      <Skeleton className="h-4 w-36 mb-auto" />
      {[72, 56, 88, 44, 68, 52].map((width, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <div style={{ width: `${width}%` }}>
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-red-200 bg-red-50/30 px-6 text-center">
      <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center ring-1 ring-red-200">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-foreground">No se pudo cargar esta métrica</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error?.message || "Verifica la conexión con el servicio de analytics."}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 shadow-sm shadow-violet-200 hover:from-violet-700 hover:to-purple-700 transition-all active:scale-95"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reintentar
      </button>
    </div>
  );
}

const CATEGORY_KEYS = ["categoria", "category", "nombre_categoria", "category_name", "name", "nombre"];
const ZONE_KEYS = ["zona", "zone", "nombre_zona", "zone_name", "name", "nombre"];
const REQUEST_KEYS = [
  "cantidad_solicitudes",
  "solicitudes",
  "total_solicitudes",
  "demanda",
  "cantidad",
  "count",
  "total",
  "value",
];
const RATE_KEYS = ["tasa_exito_pct", "tasa_exito", "success_rate", "porcentaje", "percentage", "rate", "value"];
const ACTIVITY_KEYS = ["actividad", "transacciones", "operaciones", "cantidad", "count", "total", "value"];

function normalizeChartRows(raw: unknown, nameKeys: string[], valueKeys: string[]): ChartRow[] {
  return extractRows(raw)
    .map((row) => ({
      name: readString(row, nameKeys),
      value: readNumber(row, valueKeys),
    }))
    .filter((row) => row.name && Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
}

function normalizeBuyerRows(raw: unknown): BuyerRow[] {
  return extractRows(raw)
    .map((row) => ({
      buyer: readString(row, ["usuario", "user", "nombre_usuario", "user_name", "name", "nombre"]),
      zone: readString(row, ZONE_KEYS),
      transactions: readNumber(row, ["total_transacciones", "transacciones", "cantidad", "count", "total", "value"]),
    }))
    .filter((row) => row.buyer && row.zone && Number.isFinite(row.transactions))
    .sort((a, b) => b.transactions - a.transactions);
}

function normalizeSellerRows(raw: unknown): SellerRow[] {
  return extractRows(raw)
    .map((row) => ({
      seller: readString(row, ["vendedor", "seller", "nombre_vendedor", "seller_name", "name", "nombre"]),
      category: readString(row, CATEGORY_KEYS),
      rating: readNumber(row, ["rating_promedio", "avg_rating", "average_rating", "rating", "promedio"]),
    }))
    .filter((row) => row.seller && row.category && Number.isFinite(row.rating))
    .sort((a, b) => b.rating - a.rating);
}

function extractRows(raw: unknown): RawRecord[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  for (const key of ["data", "content", "items", "results", "rows"]) {
    const value = raw[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  return [];
}

function readString(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function readNumber(row: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace("%", "").replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return Number.NaN;
}

function isRecord(value: unknown): value is RawRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
