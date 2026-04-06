/**
 * Shared client-side utilities for admin pages.
 * Imported in <script> tags (Astro bundles these via Vite).
 */

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Populate the team filter <select> based on the currently selected season.
 *
 * @param seasons       Full seasons array (from seasons-list API)
 * @param seasonFilter  The season <select> element
 * @param teamFilter    The team <select> element
 * @param fallbackSeasonId  Optional season ID to use when seasonFilter.value is empty
 * @param onTeamReset   Optional callback invoked when the previously selected team
 *                      is no longer present in the new season's team list
 */
export function populateTeamFilter(
  seasons: Array<{ id: string; teams?: Array<{ teamName: string }> }>,
  seasonFilter: HTMLSelectElement,
  teamFilter: HTMLSelectElement,
  fallbackSeasonId = '',
  onTeamReset?: () => void
): void {
  const seasonId = seasonFilter.value || fallbackSeasonId;
  const season = seasons.find((s) => s.id === seasonId);
  const teams = season?.teams ?? [];
  const currentValue = teamFilter.value;

  teamFilter.innerHTML =
    '<option value="">All Teams</option>' +
    teams
      .map((t) => `<option value="${escapeHtml(t.teamName)}">${escapeHtml(t.teamName)}</option>`)
      .join('');

  if (teams.some((t) => t.teamName === currentValue)) {
    teamFilter.value = currentValue;
  } else if (onTeamReset) {
    onTeamReset();
  }
}
