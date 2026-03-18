/**
 * Centroides aproximados [lng, lat] por estado/região.
 * GA4 dimensão "region" no Brasil costuma vir em português (ex.: Rio Grande do Norte).
 * Chaves em minúsculas para match flexível.
 */
const BRAZIL_STATES: Record<string, [number, number]> = {
  acre: [-70.812, -9.023],
  alagoas: [-36.782, -9.665],
  amapá: [-51.069, 0.902],
  amapa: [-51.069, 0.902],
  amazonas: [-60.025, -3.417],
  bahia: [-41.701, -12.579],
  ceará: [-39.321, -5.498],
  ceara: [-39.321, -5.498],
  "distrito federal": [-47.882, -15.794],
  "espírito santo": [-40.308, -19.183],
  "espirito santo": [-40.308, -19.183],
  goiás: [-49.253, -16.328],
  goias: [-49.253, -16.328],
  maranhão: [-45.274, -4.96],
  maranhao: [-45.274, -4.96],
  "mato grosso": [-56.097, -15.598],
  "mato grosso do sul": [-54.812, -20.772],
  "minas gerais": [-44.555, -18.512],
  pará: [-48.504, -1.456],
  para: [-48.504, -1.456],
  paraíba: [-35.881, -7.24],
  paraiba: [-35.881, -7.24],
  paraná: [-51.423, -24.893],
  parana: [-51.423, -24.893],
  pernambuco: [-37.074, -8.814],
  piauí: [-42.804, -7.718],
  piaui: [-42.804, -7.718],
  "rio de janeiro": [-43.173, -22.907],
  "rio grande do norte": [-35.209, -5.402],
  "rio grande do sul": [-51.23, -30.035],
  rondônia: [-63.901, -10.83],
  rondonia: [-63.901, -10.83],
  roraima: [-60.675, 2.737],
  "santa catarina": [-48.549, -27.243],
  "são paulo": [-46.633, -23.551],
  "sao paulo": [-46.633, -23.551],
  sergipe: [-37.386, -10.574],
  tocantins: [-48.356, -10.175],
};

export interface RegionRow {
  region: string;
  country: string;
  sessions: number;
}

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Retorna [lng, lat] se soubermos o estado (Brasil) ou null.
 */
export function regionToCoord(row: RegionRow): [number, number] | null {
  const country = norm(row.country);
  if (country !== "brazil" && country !== "brasil") return null;
  const region = norm(row.region);
  if (!region || region === "(not set)") return null;
  if (BRAZIL_STATES[region]) return BRAZIL_STATES[region];
  for (const [k, v] of Object.entries(BRAZIL_STATES)) {
    if (region.includes(k) || k.includes(region)) return v;
  }
  return null;
}
