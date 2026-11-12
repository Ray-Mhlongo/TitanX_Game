# Owner setup and deployment

## Current release status

The local Apps Script source was synchronized to the existing Script ID and pulled back for comparison; all 18 remote files matched the intended source. Clasp created Version 10 and updated the existing deployment ID, which now points to @10. No separate production deployment was created.

The deployed bridge GET returned HTTP 200 without sign-in and returned its bridge HTML. A live URL-encoded POST using a signed ticket invoked getPresentationState and returned the public presentation projection; it did not contain the killer ID or host notes. Automated local tests passed (65 checks). The browser postMessage delivery from the Pages origin has not been verified because the updated static Pages files are not published, and the available headless browser could not start. Therefore the bridge endpoint is live, but end-to-end GitHub Pages communication is not confirmed.

The current existing Apps Script URL remains:

https://script.google.com/macros/s/AKfycbwYFo3N5_gXIkZpSUeio5UrMUaH5W5DTQZAAkYmz6PBy3_K4cMYSlOhb7tQhS_lu7F8/exec

The intended Pages routes, after an authorized publish and browser test, are:

- Participant: https://ray-mhlongo.github.io/TitanX_Game/
- Host: https://ray-mhlongo.github.io/TitanX_Game/host.html
- Presentation: https://ray-mhlongo.github.io/TitanX_Game/presentation.html

GitHub Pages is published from `main`. The Sheet remains private, server access still executes as the owner, and the bridge ticket secret is generated into Script Properties without being placed in source or logs.

## API and privacy checks

The bridge dispatches only the 13 participant, host and presentation methods used by the clients. It checks an HMAC ticket, one of three expected Pages paths, a request ID, argument array limits and an own-property method allowlist. The iframe sends ready and response messages only to https://ray-mhlongo.github.io; the client accepts replies only from Apps Script origins and matching ticket/request IDs. Existing player and host session checks, secret hashing, private character projection, vote privacy, server-side deadline enforcement, runoff and elimination logic remain in the existing services.

The HTTP request exercised presentation state only. It did not register a player, log in as host, change game phases or cast votes. Live multiplayer and host integration therefore remain unverified.

## Release sequence

1. GitHub Pages publishes the root of `main`; all static paths are relative to `/TitanX_Game/`.
2. Apps Script deployment version 17 is live on the existing deployment ID and keeps owner execution and anonymous bridge access.
3. The bridge route was verified over HTTPS from the published origin.
4. Participants use https://ray-mhlongo.github.io/TitanX_Game/, the host uses https://ray-mhlongo.github.io/TitanX_Game/host.html, and Meet uses https://ray-mhlongo.github.io/TitanX_Game/presentation.html.

Automated tests pass. HTTP checks verified the published participant and host pages, character assets, and bridge ticket route. A real authenticated host session and multi-browser registration/voting run still require a browser session and are not claimed here.
