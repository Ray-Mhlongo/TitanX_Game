> **Pages migration status (6 November 2026):** Apps Script source is synchronized and Version 10 of the bridge is live on the existing deployment. Anonymous bridge GET and a signed POST request to the public presentation function returned the expected safe projection. The new Pages frontend is still local and has not been published; full browser postMessage delivery from the updated Pages UI remains unverified. Do not share the Pages link as playable until GitHub Pages is updated and that browser integration is confirmed.

# Who Killed the Pumpkin?

> **Current release:** Version 10 of the Apps Script backend is live at the [existing participant URL](https://script.google.com/macros/s/AKfycbwYFo3N5_gXIkZpSUeio5UrMUaH5W5DTQZAAkYmz6PBy3_K4cMYSlOhb7tQhS_lu7F8/exec). The GitHub Pages frontend and bridge client files are local only; GitHub has not been pushed. See [the deployment guide](docs/deployment.md).

**A TitanX Halloween Mystery** â€” a browser based multiplayer murder mystery for a 15â€“20 minute Google Meet session. Players join through one shared URL, receive private server assigned characters, investigate released clues and cast private votes. A host runs the game from the same app's protected dashboard.

The â€œmurderâ€ is the destruction of a fictional pumpkin. All characters and motives are fictional.

## Architecture

- GitHub Pages serves the static frontend from the repository root. A narrowly allowlisted Apps Script HTML Service bridge forwards form-encoded API requests to existing server functions and returns results through postMessage; authorization, validation, locking and deadlines remain server-side.
- A private Google Sheet stores settings, players, characters, evidence, votes, game events and completed results.
- Vanilla HTML, CSS and JavaScript provide the responsive player, host and presentation views under index.html, host.html, presentation.html and assets/. No build step is required.
- GitHub stores source. `clasp` can synchronise `src/` to an Apps Script project.
- The server assigns unique characters while holding `LockService`, keeps session token hashes in Sheets, and stores host sessions in a six hour script cache.
- The selected killer is one of the registered players and is selected once when the mystery starts. The role is returned only in that player's authenticated character response. Killer specific final evidence is generated on the server.
- Players poll the server about every seven seconds while visible, with jitter, slower polling in a hidden tab and exponential backoff after failures. Apps Script does not provide WebSockets. The timer is a display aid; phase changes and vote acceptance are enforced by server state.

## Project files

```text
index.html              GitHub Pages participant frontend
host.html               GitHub Pages host frontend
presentation.html       GitHub Pages presentation frontend
assets/css/game.css     Shared static styles
assets/js/client.js     Player and host frontend logic
assets/js/presentation.js Public presentation logic
assets/js/api.js        Apps Script iframe bridge client
src/                    Apps Script source (clasp root)
  Code.gs               HTML Service routes and backend bridge
  Bridge.html           Origin-checked, allowlisted API message bridge
  Config.gs             Sheet schemas and game settings
  Database.gs           Spreadsheet setup and data helpers
  Authentication.gs     Host secret and host sessions
  GameLogic.gs          Pure, locally testable game rules
  GameService.gs        Phases, clues, results and host state
  PlayerService.gs      Registration and private character cards
  ClueService.gs        Player safe state and released evidence
  VotingService.gs      Private ballot validation and storage
  GameData.gs           Fictional cast, story and clue blueprint
  Index.html            Apps Script player page (legacy/fallback)
  Host.html             Apps Script host page (legacy/fallback)
  Presentation.html     Apps Script presentation page (legacy/fallback)
```

## Setup and deployment

The root [GitHub Pages site](https://ray-mhlongo.github.io/TitanX_Game/) is intended to serve the static frontend. The pages communicate with the existing Apps Script backend through an origin-checked HTML Service iframe bridge; they do not execute Apps Script code themselves. This migration is still local-only and must be synchronized/deployed and published before Pages can be used to play.

See [deployment.md](docs/deployment.md) for the full owner checklist. In brief:

1. Create a dedicated Google Sheet and keep it private. This project is a standalone Apps Script project, separate from the Sheet.
2. Add/synchronise the files in `src/` to the existing Apps Script project. With clasp, install and authenticate clasp on your own computer, copy `.clasp.json.example` to `.clasp.json`, fill in the script ID, then run `clasp push` from the repository root. `.clasp.json` is ignored by Git.
3. The supplied standalone Sheet was initialized already, and the owner has rotated the previously exposed host secret. The editor-only wrapper functions are removed from the deployed source. Store the new secret privately; never place it in source, documentation, or chat.
4. Deploy as a web app that executes as the sheet owner. For anonymous meeting participants, choose the broadest access option your Google account and Workspace administrator allow. Google may require sign-in or restrict â€œAnyoneâ€ deployment; test with a signed-out browser and the actual participant devices.
5. After the secured release is published, use the base `/exec` URL for players, `/exec?host=1` for the private host portal, and `/exec?presentation=1` for the screen shared in Meet. Keep the host view on your private monitor.

The spreadsheet ID is stored in Apps Script Script Properties, not in the browser or repository. Keep the spreadsheet private; players should never be shared on it. Never commit `.clasp.json`, `.clasprc.json`, deployment URLs containing private parameters, host secrets or tokens.

## Running a game

The host creates a lobby, sets a 4â€“31 player cap, waits for at least four players, and advances each phase in order. Evidence is released manually. Players discuss in Meet and vote privately in the app. The host closes voting and reveals the solution. The presentation view is available from the dashboard for screen sharing; it contains no private player cards or pre-reveal solution.

See [game_master_guide.md](docs/game_master_guide.md) for the 20 minute run sheet and checklist.

## Local development and tests

The deployed app needs no Node.js, package manager, or build. Run the local checks with Node:

```sh
node tests/game_logic_tests.js
node tests/database_setup_tests.js
node tests/authentication_tests.js
node tests/presentation_privacy_tests.js
node tests/route_tests.js
node tests/bridge_api_tests.js
```

The local suite covers game rules, database setup, host authentication and presentation privacy. Apps Script services (live Sheets, locks, cache, deployment permissions and concurrent requests) still require verification against the deployed release; see the deployment guide. No local test proves anonymous access or a live multiplayer session.

## Security and privacy

- Server functions validate host or player credentials independently of UI visibility.
- Player session tokens are high entropy, returned only to their browser once, and stored as SHA-256 hashes in the Players sheet. A player who loses browser storage cannot recover an account by name; the host can revoke the old entry and ask them to rejoin under an available name.
- The host secret is generated in the Apps Script editor and is never embedded in client files. The host secret has high entropy; its salted SHA-256 digest is stored in Script Properties. Host sessions expire after six hours.
- Character private information, player token hashes, host solution and host notes are omitted from ordinary player responses. Individual ballots are not returned to the host or players while voting is open; only the ballot count is shown.
- The app uses an owner executed deployment so the script can access its private sheet. Anyone allowed to open an anonymous web app can call its public functions; every privileged function therefore checks a host session. Actual access behavior depends on Google account and Workspace deployment policy.
- `CacheService` holds only short lived host sessions and login throttling. Sheets remain the source of truth for game data.
- Apps Script is not a high assurance identity platform. Protect the generated host secret and owner Google account, use a private sheet, and test the signed out deployment. The host login is rate limited, but Apps Script does not expose a dependable participant IP address for per-IP limits.

## Known limits

- Polling is controlled but not instantaneous. Phase timers are visual cues and do not auto-advance phases.
- Apps Script quotas, simultaneous execution limits, account policies and cold starts apply. The spreadsheet model supports up to 30 participants for a small live event, not a public high traffic service.
- There is no self-service player identity recovery or email authentication. The host can revoke a lost session.
- The host dashboard is protected by an editor-generated random secret. Host sessions are cache-backed and may require another login if the cache expires early.
- The story has a server-selected culprit and generated final evidence that names the selected character and ties it to their public motive. Test each clue and the final reveal during a rehearsal before the event.

## GitHub workflow

For a future authorized release, publish only source and documentation; never publish credentials, `.clasp.json`, `.clasprc.json`, host secrets, spreadsheet IDs or user data. Synchronize Apps Script separately and publish a versioned web app deployment. GitHub was not pushed for this migration.

## Voting and elimination

After both staged releases have been published, the Pages root URL is the participant link. Players register with a display name and choose Male or Female for the pumpkin avatar; the server assigns an unused fictional character under a script lock. The avatar preference only selects local pumpkin artwork. A random browser token recovers the player's existing character after refresh; Sheets stores only its digest.

The host opens voting from the dashboard and chooses 30, 60, 90, 120 seconds, or a custom 10â€“600 second duration. Auto close is enabled by default. When disabled, an expired timer leaves the poll open until the host closes or extends it. The backend checks the deadline on ballot submission. Players choose an active suspect card and can change their ballot only when the host setting permits it. The host sees participation counts while voting is open; individual selections are never returned.

After closing, the host reveals aggregate results. A unique highest vote can be explicitly confirmed for elimination. Ties and empty ballots offer runoff/reopen/skip controls; a runoff contains only the tied active suspects. Eliminated players remain in the roster and can follow public evidence, but cannot vote or appear in future polls. If the killer is eliminated, the public solution is revealed. The host can also reveal it manually.

`setupDatabase_()` migrates existing sheet columns by their header names and retains existing rows. Player records now include gender/avatar fields and uppercase `ACTIVE` / `ELIMINATED` status; Votes is round scoped. Keep the spreadsheet private. Presentation mode uses the public endpoint and excludes character secrets, unreleased evidence, individual votes, and the host solution.
