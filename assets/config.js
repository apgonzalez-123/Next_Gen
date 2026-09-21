/* NextGen Portfolio Builder — deployment config.
 *
 * BACKEND_URL — leave empty ("") to run in DEMO MODE: votes stay on the
 * device and the room is a seeded synthetic audience, so the whole flow
 * and every results screen work with no server at all. That is enough to
 * rehearse and to present from a single laptop.
 *
 * For real live voting across the room, deploy worker/ (see README) and
 * paste its URL here, e.g.:
 *   BACKEND_URL: "https://nextgen-votes.<your-subdomain>.workers.dev"
 */
window.CONFIG = {
  BACKEND_URL: "",

  /* Bumping this starts a clean tally — use it between rehearsal and the
   * live session so practice votes do not pollute the real numbers. */
  SESSION_ID: "nextgen-2026",

  /* Guests per synthetic audience in demo mode. */
  DEMO_ROOM_SIZE: 42,

  /* How often the presenter screen refreshes, in ms. */
  POLL_MS: 3000,

  /* Which steps run this session. "all" uses every step in schema.js;
   * otherwise list the step ids you want, in order. Dropping a step also
   * drops its questions from matching, the breakdown and the export.
   *   Short version (the original five):
   *   STEPS: ["profile", "equities", "fixedincome", "fx", "notes"],  */
  STEPS: "all",

  /* --- who answered what ---------------------------------------------
   * "required"  guests give a name before they can start (responses are
   *             attributable in the admin export)
   * "optional"  the field is shown but can be skipped
   * "off"       fully anonymous
   *
   * A guest arriving on a personal link (?g=TOKEN&n=Name, which is what
   * qr-gen.html prints) is identified already and never sees the field. */
  IDENTIFY: "required",

  /* Ask for a second grouping field alongside the name — a table number,
   * team, or advisor. Set to "" to hide it. */
  GROUP_FIELD: "Table / group",

  /* Shown on the welcome screen so guests know what is recorded. Keep it
   * accurate if you change IDENTIFY. */
  PRIVACY_NOTE: "Your name and your answers are recorded for this session so " +
                "your host can follow up. No contact details are collected here."
};
