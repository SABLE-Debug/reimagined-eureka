import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fundamental Bias Radar",
    short_name: "Bias Radar",
    description: "Mobile-first trading dashboard with daily fundamental bias across 10 assets.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#05070b",
  };
}
