/** Table backgrounds. Each is a CSS `background` value applied to the page, plus a colour for empty-slot outlines. */
export interface Theme {
  id: string;
  label: string;
  background: string;
  /** Browser UI colour (mobile address bar). */
  themeColor: string;
  slot?: string;
}

const svg = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>${body}</svg>`,
  )}")`;

const beachScene = svg(
  `<defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#4fa8e0'/><stop offset='1' stop-color='#c9ecf8'/></linearGradient>
    <linearGradient id='sea' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#13719f'/><stop offset='1' stop-color='#37bcc4'/></linearGradient>
    <linearGradient id='sand' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#e6cf98'/><stop offset='1' stop-color='#f5e5bd'/></linearGradient>
  </defs>
  <rect width='100' height='44' fill='url(#sky)'/>
  <rect y='43.5' width='100' height='30' fill='url(#sea)'/>
  <path d='M0 47 Q6 46.3 12 47 T24 47 T36 47 T48 47 T60 47 T72 47 T84 47 T100 47' stroke='#fff' stroke-opacity='.25' stroke-width='.3' fill='none'/>
  <path d='M0 54 Q8 53 16 54 T32 54 T48 54 T64 54 T80 54 T100 54' stroke='#fff' stroke-opacity='.2' stroke-width='.35' fill='none'/>
  <path d='M0 63 Q10 60.5 20 63 T40 63 T60 63 T80 63 T100 63 V100 H0Z' fill='#fff' fill-opacity='.85'/>
  <path d='M0 64.5 Q10 62 20 64.5 T40 64.5 T60 64.5 T80 64.5 T100 64.5 V100 H0Z' fill='#d8be7e'/>
  <path d='M0 67 Q14 65 28 67 T56 67 T84 67 T100 66.5 V100 H0Z' fill='url(#sand)'/>`,
);

export const THEMES: readonly Theme[] = [
  {
    id: "felt",
    label: "Felt",
    background: "radial-gradient(ellipse at 50% 30%, #1d7a4b, #0d4429 80%)",
    themeColor: "#0f5132",
  },
  {
    id: "beach",
    label: "Beach",
    background: `radial-gradient(circle at 82% 13%, #fffbe0 0 3.2vmin, rgba(255, 236, 170, 0.55) 4.2vmin, transparent 13vmin), ${beachScene} center / 100% 100% no-repeat, #e6cf98`,
    themeColor: "#4fa8e0",
    slot: "rgba(60, 40, 10, 0.3)",
  },
  {
    id: "ocean",
    label: "Ocean",
    background: "radial-gradient(ellipse at 50% 25%, #2386b8, #0a2d4c 80%)",
    themeColor: "#0e3a5e",
  },
  {
    id: "sunset",
    label: "Sunset",
    background: "linear-gradient(180deg, #2a1a4a 0%, #6e2a68 40%, #d4574a 78%, #f3a04c 100%)",
    themeColor: "#2a1a4a",
  },
  {
    id: "wood",
    label: "Wood",
    background:
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 11px, rgba(255,255,255,0.04) 11px 13px, transparent 13px 29px), linear-gradient(180deg, #8d5c34, #5a371c)",
    themeColor: "#5a371c",
  },
  {
    id: "night",
    label: "Night",
    background: "radial-gradient(ellipse at 50% 20%, #2c3654, #10131c 75%)",
    themeColor: "#10131c",
  },
];

export const DEFAULT_THEME = "felt";

export function themeById(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(theme: Theme): void {
  document.body.style.background = theme.background;
  document.documentElement.style.setProperty("--slot", theme.slot ?? "rgba(255, 255, 255, 0.22)");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.themeColor);
}
