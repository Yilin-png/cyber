import gatherings from "../server/gatherings.json";
import html001 from "./content-001.html";
import html002 from "./content-002.html";

export const GATHERINGS = gatherings;

const BODIES = {
  "001": html001,
  "002": html002
};

export function gatheringBodyHtml(id) {
  return BODIES[id] || null;
}
