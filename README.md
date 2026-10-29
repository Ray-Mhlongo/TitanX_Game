# Who Killed the Pumpkin?

**A TitanX Halloween Mystery** — a browser based multiplayer murder mystery for a 15–20 minute Google Meet session. Players join through one shared URL, receive private server assigned characters, investigate released clues and cast private votes. A host runs the game from the same app's protected dashboard.

The “murder” is the destruction of a fictional pumpkin. All characters and motives are fictional.

## Architecture

- Google Apps Script serves the HTML Service page and handles every sensitive action through `google.script.run`.
- A private Google Sheet stores settings, players, characters, evidence, votes, game events and completed results.
- Vanilla HTML, CSS and JavaScript provide the responsive player, host and presentation views. There is no build step or runtime asset service.
- GitHub stores source. `clasp` can synchronise `src/` to an Apps Script project.
- The server assigns unique characters while holding `LockService`, keeps session token hashes in Sheets, and stores host sessions in a six hour script cache.
- The selected killer is one of the registered players and is selected once when the mystery starts. The role is returned only in that player's authenticated character response. Killer specific final evidence is generated on the server.
- Players poll the server about every seven seconds while visible, with jitter, slower polling in a hidden tab and exponential backoff after failures. Apps Script does not provide WebSockets. The timer is a display aid; phase changes and vote acceptance are enforced by server state.

## Project files

```text
src/                    Apps Script source (clasp root)
  Code.gs               HTML Service entry point
  Config.gs             Sheet schemas and game settings
  Database.gs           Spreadsheet setup and data helpers
  Authentication.gs     Host secret and host sessions
  GameLogic.gs          Pure, locally testable game rules
  GameService.gs        Phases, clues, results and host state
  PlayerService.gs      Registration and private character cards
  ClueService.gs        Player safe state and released evidence
  VotingService.gs      Private ballot validation and storage
  GameData.gs           Fictional cast, story and clue blueprint
  Index.html            Main player, host and presentation page
  Styles.html           Local CSS artwork and responsive styles
  Client.html           Browser interaction and polling
tests/                  Node-based tests for pure game rules
docs/                   Deployment and game master instructions
.clasp.json.example     Safe template; copy to .clasp.json locally
```

## Setup and deployment

See [deployment.md](docs/deployment.md) for the full owner checklist. In brief:

1. Create a dedicated Google Sheet and open **Extensions → Apps Script**.
2. Add/synchronise the files in `src/` to that bound Apps Script project. With clasp, install and authenticate clasp on your own computer, copy `.clasp.json.example` to `.clasp.json`, fill in the script ID, then run `clasp push` from the repository root. `.clasp.json` is ignored by Git.
3. In the Apps Script editor, run `setupDatabase_()` and approve the spreadsheet access request. Then run `configureInitialHost_()`. Copy its one time host secret from the execution log; the script stores only a salted SHA-256 digest.
4. Deploy as a web app that executes as the sheet owner. For anonymous meeting participants, choose the broadest access option your Google account and Workspace administrator allow. Google may require sign-in or restrict “Anyone” deployment; test with a signed-out browser and the actual participant devices.
5. Open the deployment URL, sign in to the host dashboard, create a game, and share that same URL in the Meet chat. Players use it on their own devices.

The spreadsheet ID is stored in Apps Script Script Properties, not in the browser or repository. Keep the spreadsheet private; players should never be shared on it. Never commit `.clasp.json`, `.clasprc.json`, deployment URLs containing private parameters, host secrets or tokens.

## Running a game

The host creates a lobby, sets a 4–31 player cap, waits for at least four players, and advances each phase in order. Evidence is released manually. Players discuss in Meet and vote privately in the app. The host closes voting and reveals the solution. The presentation view is available from the dashboard for screen sharing; it contains no private player cards or pre-reveal solution.

See [game_master_guide.md](docs/game_master_guide.md) for the 20 minute run sheet and checklist.

## Local development and tests

The deployed app needs no Node.js, package manager, or build. Node is used only for the pure game logic tests:

```sh
node tests/game_logic_tests.js
```

The tests cover unique character selection, culprit selection, session lookup, voting rules, tally privacy, reveal gating, legal phases and reset behavior. Apps Script services (Sheets, locks, cache, deployment permissions and concurrent requests) require a manual integration check in the owner's Google account; see the deployment guide. No local test can prove the actual web app's anonymous access mode.

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

Commit and push only source and documentation. Do not push credentials, `.clasp.json`, `.clasprc.json`, host secrets, spreadsheet IDs or user data. Update the Apps Script deployment after each source change from the deployment manager; `clasp push` synchronises source but does not itself publish a new web app version.
