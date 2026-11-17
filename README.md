# Epistemic Transitions

A faculty workshop tool for mapping emerging directions in architectural education and research.

## Current prototype

The initial prototype includes:
- Six provisional transformations.
- Contributions categorized as conditions, educational implications, responses, or new transformations.
- Organic network and structured synthesis views.
- Connections between ideas.
- JSON, DOT (Graphviz), and SVG exports.
- Browser-local persistence.

Open `index.html` locally or host this repository using GitHub Pages.

**Important:** The current version is not a shared live session. Each browser stores its own graph.

## GitHub Pages deployment

In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, then save. GitHub will display the published URL when deployment completes.

## Firebase project

- Project ID: `epistemic-transitions`
- Cloud Firestore: configured by project owner
- Anonymous Authentication: enabled by project owner
- Database rules: `firestore.rules` is a **draft** and has not been deployed.

## Before enabling shared submissions

1. Test Firestore rules in the Firebase Rules Playground or emulator.
2. Confirm that anonymous users can create only valid new contributions, cannot overwrite others' work, and cannot read unrelated collections.
3. Decide how session access and facilitator privileges should be secured. A workshop code alone is not authentication.
4. Implement and test an authenticated shared-session data adapter using Firestore `onSnapshot` listeners.
5. Review anonymous-auth abuse protection, data retention, and privacy expectations.
6. Deploy reviewed rules before enabling Firebase write operations in the public app.

## Next implementation milestones

- Replace the custom force simulation with D3-force, including zoom and drag.
- Use Graphviz layout (DOT) in structured mode.
- Add a Firestore-backed collaboration option with safe session initialization and facilitator controls.
- Preserve versioned snapshots for workshop analysis.

The Firebase web app configuration contains public client identifiers, **not administrative credentials**. Never commit service-account private keys.
