# Epistemic Transitions

A faculty workshop tool for mapping emerging directions in architectural education and research.

## Current prototype

The initial prototype includes:
- Six provisional transformations.
- Contributions categorized as conditions, educational implications, responses, or new transformations.
- D3-powered organic network (zoom, pan, collision, drag/pin) and structured synthesis view.
- Connections between ideas.
- JSON, DOT (Graphviz), and SVG exports.
- Browser-local persistence.

Open `index.html` locally or host this repository using GitHub Pages.

**Local mode:** Contributions remain browser-local. **Shared mode:** Click **Join shared session** to sign in anonymously and synchronize through Firestore. Shared mode requires the Firestore rules to be deployed first.

## GitHub Pages deployment

In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, then save. GitHub will display the published URL when deployment completes.

## Firebase project

- Project ID: `epistemic-transitions`
- Cloud Firestore: configured by project owner
- Anonymous Authentication: enabled by project owner
- Database rules: `firestore.rules` is a **draft** and has not been deployed.

## Firestore activation\n\n1. In Firebase Console → Firestore Database → **Rules**, replace the default rules with the reviewed contents of [`firestore.rules`](./firestore.rules).\n2. Use the Rules Playground or emulator to test allowed creates and denied updates/deletes.\n3. Click **Publish** in the Rules editor only after tests pass.\n4. Open the GitHub Pages app in two independent browsers, click **Join shared session**, and enter the same session ID, e.g. `pilot-2026`.\n5. Confirm an entry in browser A appears in browser B.\n\n**Security limitation:** The initial anonymous write model is intended only for a facilitated pilot. Any person who knows the public Firebase project and collection path could anonymously contribute. A session ID is an organizer, not a secret. Enable App Check and stronger server-side session authorization before broad public distribution.\n\n## Before enabling shared submissions

1. Test Firestore rules in the Firebase Rules Playground or emulator.
2. Confirm that anonymous users can create only valid new contributions, cannot overwrite others' work, and cannot read unrelated collections.
3. Decide how session access and facilitator privileges should be secured. A workshop code alone is not authentication.
4. Implement and test an authenticated shared-session data adapter using Firestore `onSnapshot` listeners.
5. Review anonymous-auth abuse protection, data retention, and privacy expectations.
6. Deploy reviewed rules before enabling Firebase write operations in the public app.

## Next implementation milestones

- Refine D3-force behavior, labeling, and interaction as the network grows.
- Use Graphviz layout (DOT) in structured mode.
- Add a Firestore-backed collaboration option with safe session initialization and facilitator controls.
- Preserve versioned snapshots for workshop analysis.

The Firebase web app configuration contains public client identifiers, **not administrative credentials**. Never commit service-account private keys.
