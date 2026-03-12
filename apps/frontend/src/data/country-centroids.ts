/**
 * Centroides aproximados [lng, lat] por nome de país (inglês, como GA4 costuma retornar).
 * Usado quando o mapa coroplético não encontra o nome na malha.
 */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  brazil: [-51.9253, -14.235],
  "united states": [-95.7129, 37.0902],
  "united kingdom": [-3.436, 55.3781],
  portugal: [-8.2245, 39.3999],
  spain: [-3.7492, 40.4637],
  france: [2.2137, 46.2276],
  germany: [10.4515, 51.1657],
  italy: [12.5674, 41.8719],
  canada: [-106.3468, 56.1304],
  mexico: [-102.5528, 23.6345],
  argentina: [-63.6167, -38.4161],
  chile: [-71.543, -35.6751],
  colombia: [-74.2973, 4.5709],
  peru: [-75.0152, -9.19],
  india: [78.9629, 20.5937],
  china: [104.1954, 35.8617],
  japan: [138.2529, 36.2048],
  "south korea": [127.7669, 35.9078],
  australia: [133.7751, -25.2744],
  "new zealand": [174.886, -40.9006],
  russia: [105.3188, 61.524],
  poland: [19.1451, 51.9194],
  netherlands: [5.2913, 52.1326],
  belgium: [4.4699, 50.5039],
  switzerland: [8.2275, 46.8182],
  austria: [14.5501, 47.5162],
  sweden: [18.6435, 60.1282],
  norway: [8.4689, 60.472],
  denmark: [9.5018, 56.2639],
  finland: [25.7482, 61.9241],
  ireland: [-8.2439, 53.4129],
  "south africa": [22.9375, -30.5595],
  nigeria: [8.6753, 9.082],
  egypt: [30.8025, 26.8206],
  "saudi arabia": [45.0792, 23.8859],
  "united arab emirates": [53.8478, 23.4241],
  turkey: [35.2433, 38.9637],
  indonesia: [113.9213, -0.7893],
  thailand: [100.9925, 15.87],
  vietnam: [108.2772, 14.0583],
  philippines: [121.774, 12.8797],
  malaysia: [101.9758, 4.2105],
  singapore: [103.8198, 1.3521],
  taiwan: [120.9605, 23.6978],
  israel: [34.8516, 31.0461],
  ukraine: [31.1656, 48.3794],
  greece: [21.8243, 39.0742],
  "czech republic": [15.473, 49.8175],
  romania: [24.9668, 45.9432],
  hungary: [19.5033, 47.1625],
  angola: [17.8739, -11.2027],
  mozambique: [35.5296, -18.6657],
  kenya: [37.9062, -0.0236],
  morocco: [-7.0926, 31.7917],
  algeria: [1.6596, 28.0339],
  pakistan: [69.3451, 30.3753],
  bangladesh: [90.3563, 23.685],
  "(not set)": [0, 0],
};

export function countryToCoord(country: string): [number, number] | null {
  const key = country.trim().toLowerCase();
  if (!key || key === "(not set)") return null;
  const c = COUNTRY_COORDS[key];
  if (c) return c;
  for (const [k, v] of Object.entries(COUNTRY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
