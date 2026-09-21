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
  BACKEND_URL: "https://nextgen-votes.apgonzalez.workers.dev",

  /* Bumping this starts a clean tally — use it between rehearsal and the
   * live session so practice votes do not pollute the real numbers. */
  SESSION_ID: "nextgen-2026",

  /* Guests in the synthetic demo audience.
   *
   * 0 = OFF: only real responses are ever shown or counted. That is the
   * right setting for a live session and for testing that real answers
   * are being recognised.
   *
   * Set it to ~40 only if you need populated screens to rehearse against
   * before anyone has scanned. Synthetic guests are always labelled on
   * screen and are never included in the admin table or any export. */
  DEMO_ROOM_SIZE: 0,

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

  /* What the registration step asks for. `name` and `group` get their own
   * columns in the export; any other field you add gets its own column
   * automatically, in both the admin table and the CSV.
   *
   * To collect contact details, uncomment the email row — but update
   * PRIVACY_NOTE to say so, and check it against your own client-data
   * rules first. An event sign-up sheet is still personal data. */
  REGISTER_FIELDS: [
    { id: "name",  label: "Your name",     placeholder: "First and last name",
      required: true,  autocomplete: "name" },
    { id: "group", label: "Table / group", placeholder: "e.g. Table 4",
      required: false }
    // { id: "email", label: "Email", placeholder: "you@bank.com",
    //   required: false, type: "email", autocomplete: "email" }
  ],

  /* Shown on the registration step so guests know what is recorded. Keep it
   * accurate if you change IDENTIFY or REGISTER_FIELDS. */
  PRIVACY_NOTE: "Your name and your answers are recorded for this session so " +
                "your host can follow up. No contact details are collected here."
};
