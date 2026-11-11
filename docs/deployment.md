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

GitHub was not pushed. The prior automated rejection remains in effect, so the Pages frontend is local only. Do not give participants the Pages routes until they are published and browser-to-bridge communication has been verified. The Sheet remains private, server access still executes as the owner, and the bridge ticket secret is generated into Script Properties without being placed in source or logs.

## API and privacy checks

The bridge dispatches only the 13 participant, host and presentation methods used by the clients. It checks an HMAC ticket, one of three expected Pages paths, a request ID, argument array limits and an own-property method allowlist. The iframe sends ready and response messages only to https://ray-mhlongo.github.io; the client accepts replies only from Apps Script origins and matching ticket/request IDs. Existing player and host session checks, secret hashing, private character projection, vote privacy, server-side deadline enforcement, runoff and elimination logic remain in the existing services.

The HTTP request exercised presentation state only. It did not register a player, log in as host, change game phases or cast votes. Live multiplayer and host integration therefore remain unverified.

## Release sequence

1. Confirm GitHub Pages publishes the root of the main branch. The static files are already arranged for the repository subpath /TitanX_Game/ and use relative asset paths.
2. Synchronize the contents of src/ to the existing Script ID, review the Apps Script editor contents, and publish a new version on the existing web app deployment. Keep owner execution and anonymous access as currently configured.
3. Verify that the deployed /exec?bridge=1 endpoint loads inside a page at https://ray-mhlongo.github.io/TitanX_Game/ and that it rejects other origins and page paths. Then verify participant registration, host login/actions, and presentation polling.
4. Publish the local static files to the repository root only after the Apps Script bridge is live and tested. The GitHub push restriction remains in effect; no push was attempted in this change.
5. After both releases succeed, participants use https://ray-mhlongo.github.io/TitanX_Game/, the host uses https://ray-mhlongo.github.io/TitanX_Game/host.html, and Meet uses https://ray-mhlongo.github.io/TitanX_Game/presentation.html. Until then, use the current Apps Script participant link from the prior section.

The local environment did not have clasp installed, and its attempted HTTPS check could not establish a connection. Therefore the remote Apps Script contents, bridge route, final deployment version, and live UI behavior were not verified or changed in this turn. The project was not deployed to Apps Script or GitHub.
