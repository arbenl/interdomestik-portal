export function monthlyReportCsv(
  data: {
    total?: number;
    revenue?: number;
    byRegion?: Record<string, number>;
    byMethod?: Record<string, number>;
  },
  month: string
): string {
  const rows: string[] = [];
  rows.push('metric,value');
  rows.push(`total,${data.total || 0}`);
  rows.push(`revenue,${data.revenue || 0}`);
  rows.push('');
  rows.push('region,count');
  const byRegion = data.byRegion || {};
  for (const k of Object.keys(byRegion)) rows.push(`${k},${byRegion[k]}`);
  rows.push('');
  rows.push('method,count');
  const byMethod = data.byMethod || {};
  for (const k of Object.keys(byMethod)) rows.push(`${k},${byMethod[k]}`);
  return rows.join('\n');
}
