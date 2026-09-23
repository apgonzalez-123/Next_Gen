# Brand mark

The current mark is:

    assets/brand/safra-logo.png

Sourced from a logo directory, trimmed of its transparent margin and
resized to 552x168 (about 6x its largest on-screen size, so it stays crisp
on a projector). Replace it with the approved asset from Safra's own brand
library when you have it. SVG is preferred if available: update the `src`
in index.html, present.html and admin.html.

It then appears in the header of the guest flow, the presenter screen and
the admin board. Nothing else needs changing.

SVG is strongly preferred: it stays sharp on a projector at any size. A PNG
works if that is all you have, but export it at least 3x the display height
(the mark renders at 28px on the presenter, so 90px tall or more) and update
the `src` in the three HTML files.

## Colour

By default the mark is forced to a single flat white so it sits with the
rest of the monochrome interface:

    .brand-mark { filter: brightness(0) invert(1); }

If the approved logo must keep its own colours, delete that line in
`assets/app.css`. Check it against the near-black background first, since
a dark-on-transparent logo will disappear.

## If the file is missing

The `<img>` removes itself, the separator hides, and the header falls back
to the "NextGen Portfolio Lab" wordmark alone. Nothing shows a broken-image
icon, which matters on a projector.

## Approval

Use the logo your brand team approves, from Safra's own asset library
rather than a third-party logo directory. Third-party copies are often
outdated, the wrong lockup, or redrawn.
