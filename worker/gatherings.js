import gatherings from "../server/gatherings.json";
import html001 from "./content-001.html";
import html002 from "./content-002.html";
import en001 from "../server/content/gatherings/001.en.html";
import en002 from "../server/content/gatherings/002.en.html";
import gatheringsEN from "../server/gatherings.en.json";
export const localizedGathering = (g, lang) => lang === "en" ? (gatheringsEN.find(x => x.id === g.id) || g) : g;

export const GATHERINGS = gatherings;

const BODIES = {
  "001": html001,
  "002": html002
};

export function gatheringBodyHtml(id, lang) {
  return (lang === "en" ? { "001": en001, "002": en002 } : BODIES)[id] || null;
}
