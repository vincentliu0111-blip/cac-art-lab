// Keep original order within each group while making the opening browse pages
// roughly seven Western-department works for every three other works.
export function orderForBrowse(artworks, westernArtworkIds) {
  const western = [], other = [];
  for (const art of artworks) (westernArtworkIds.has(String(art.id)) ? western : other).push(art);
  const pattern = [true, true, false, true, true, false, true, true, false, true];
  const ordered = [];
  let westIndex = 0, otherIndex = 0, slot = 0;
  while (westIndex < western.length && otherIndex < other.length) {
    ordered.push(pattern[slot % pattern.length] ? western[westIndex++] : other[otherIndex++]);
    slot++;
  }
  return ordered.concat(western.slice(westIndex), other.slice(otherIndex));
}
