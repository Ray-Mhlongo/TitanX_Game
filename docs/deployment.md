# Owner setup and deployment

## 1. Create the private game spreadsheet

1. In the Google account that will own the event, create a new Google Sheet dedicated to this game.
2. Do not share this Sheet with players. The web app accesses it as its owner.
3. Open **Extensions → Apps Script** from that Sheet to create a bound Apps Script project.

## 2. Copy or synchronise the source

You can copy each file from `src/` into the matching Apps Script editor file. Or use clasp on your own computer:

1. Install Node.js only if you want to use clasp locally. Install clasp with `npm install -g @google/clasp` and authenticate with `clasp login`.
2. Copy `.clasp.json.example` to `.clasp.json`; replace the placeholder with the script ID shown in the Apps Script URL. The configured `rootDir` is `src`.
3. Run `clasp push` from the repository root and review the files before confirming an overwrite prompt. Do not commit `.clasp.json` or `.clasprc.json`.
4. Apps Script may ask you to enable the Apps Script API in your account settings before clasp can synchronise.

## 3. Initialise storage and host access

From the Apps Script editor, select and run `setupDatabase_()`. The first run creates the seven game tabs and headers and stores the spreadsheet ID in Script Properties. Approve the requested spreadsheet permission. Run `configureInitialHost_()` once. Open the execution log and copy the generated one time host secret into a password manager. The function refuses to replace an already configured host secret. If it is lost, an owner can rotate it by reviewing and updating the `HOST_SALT` and `HOST_HASH` script properties with an owner-controlled maintenance procedure; do not create a public reset endpoint.

The host setup functions end in `_`, so they are not callable through `google.script.run`. Run them only in the Apps Script editor. To rotate a lost or exposed host secret later, run `rotateHostSecret_()` in the editor and copy the replacement from the execution log. Existing sessions may remain valid until the six hour expiry.

## 4. Deploy the web app

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as** to the spreadsheet owner so the app can use the private database.
3. Set **Who has access** to the broadest option that is permitted by the owner's Google account and Workspace administrator. For participants without Google accounts, anonymous/“Anyone” access is needed. Some Workspace tenants disable it.
4. Deploy, review the authorization prompt, and copy the resulting web app URL.
5. Test that URL in a signed-out/private browser window and on a second device. Verify the app can open, a test player can register, and the host can authenticate. Do not infer anonymous access from a browser session already signed into the owner account.

If the deployment cannot be opened without sign-in, the owner must ask their Workspace administrator to allow anonymous web apps or use an account/deployment policy that does. Do not give participants direct spreadsheet access as a workaround.

## 5. First game and updates

1. Open the web app URL, enter the host secret and unlock the dashboard.
2. Select a player cap from 4 to 31 and create a game.
3. Copy the shared URL and post it in Google Meet chat. Everyone uses the same URL and enters a distinct display name.
4. Once at least four players are in the lobby, start the mystery and share the presentation view in Meet.
5. After code changes, synchronise with `clasp push` (or copy the files), then choose **Deploy → Manage deployments → Edit** and publish a new version. Confirm with a signed-out browser after updating.

## 6. Reset and data cleanup

The host's **Reset / replay game** action clears active players, ballots and clues for the current game and opens a fresh lobby. Completed result rows are preserved in GameHistory when starting another game after the reveal. The host should use reset only after confirming; it cannot restore the current lobby. To remove old history or test records, the Sheet owner can delete the relevant rows directly after making a backup. Never delete or share the spreadsheet with participants.

## 7. Manual integration checklist

- Run setup twice and confirm it does not duplicate headers or character definitions.
- Create a game, join from two browsers, refresh one browser and confirm its card returns; verify a duplicate display name is rejected.
- Join from at least four devices and confirm the roster has unique characters.
- Start the game, inspect a non-killer player response and confirm it contains no killer identity, unreleased clues, host notes, token hashes or solution.
- Confirm only the killer's own authenticated response includes the killer instruction.
- Try every phase control and confirm an out-of-order transition is rejected by the server.
- Attempt a host operation without a host session and confirm it is rejected.
- Release clues one at a time and confirm they remain available after refresh.
- Attempt a vote before voting opens, for a non-player suspect, twice with vote changes disabled, and after voting closes; all must fail. Enable changes and confirm the existing ballot updates rather than duplicating.
- While voting is open, inspect player and host responses; only aggregate participation count should be visible. Close voting and confirm totals appear. Confirm ties are shown as inconclusive.
- Confirm the public presentation hides the solution through VOTING_CLOSED and displays it only after REVEAL.
- Revoke a player and confirm their old token no longer retrieves a card or submits a vote.
- Reset and confirm active rows are cleared while prior GameHistory entries remain.
- Repeat registration from multiple devices at once to exercise `LockService` uniqueness.
