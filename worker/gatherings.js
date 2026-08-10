import gatherings from "../server/gatherings.json";
import html001 from "./content-001.html";

export const GATHERINGS = gatherings;

export function gatheringBodyHtml(id) {
  if (id === "001") return html001;
  return null;
}
