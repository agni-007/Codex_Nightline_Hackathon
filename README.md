# HyperLocal Echo

HyperLocal Echo is a local-first CLI that turns one raw business update, such as a voice-note transcript, product description, or flyer draft, into a safe multi-channel marketing content matrix. It writes each finished block to a timestamped local folder and includes a self-contained dashboard for reviewing the run.

The complete product contract is in the [HyperLocal Echo SRS](./HyperLocal-Echo_SRS_v1.0.pdf).

## Install

Requires Node.js 20 or newer.

```sh
git clone https://github.com/agni-007/Codex_Nightline_Hackathon.git
cd Codex_Nightline_Hackathon
npm install
cp .env.example .env
```

Add your OpenAI API key to `.env` as `OPENAI_API_KEY`. The key is read locally only and is never written to a run output or manifest. The current implementation uses the OpenAI Responses API with `gpt-5.4-mini`.

Run commands with `npm run dev -- <command>` during development, or install the package globally with `npm install -g .` to use `hyperlocal-echo` directly.

## Commands

| Command | Example | Purpose |
| --- | --- | --- |
| `init` | `npm run dev -- init` | Interactively saves a default business profile and modules. |
| `config` | `npm run dev -- config` | Views, and interactively edits, the saved business profile. |
| `run` | `npm run dev -- run --type "Artisan Bakery" --input ./notes/sourdough.txt --location "Fort Kochi" --modules flyer,sms,hashtags` | Generates the core content and selected modules. `--input` also accepts inline text; use `--stdin` for piped text. |
| `open` | `npm run dev -- open 2026-07-19_1042_hey-so-this-saturday` | Opens a completed run's dashboard in the default browser. |
| `serve` | `npm run dev -- serve --port 4174` | Runs the local dashboard input server at `http://localhost:4174`. Type a plain-English update directly into the dashboard to generate a new run. |

`run` supports `--lang es` for the language-pack module, `--feedback "open_rate=18%,click_rate=2%"` for feedback notes, `--cta-link https://example.com` for a flyer QR code, and `--out ./output` to change the output directory.

## Expansion modules

The three core outputs, SEO Blog Post, Script Studio, and Smart Newsletter, are always generated. These independently toggleable modules can be selected with `--modules` or saved as defaults during `init`.

| CLI module | Output | Default |
| --- | --- | --- |
| `flyer` | `modules/flyer.md` and scannable `modules/flyer-qr.png` | On |
| `sms` | `modules/sms-blast.txt` | On |
| `reviews` | `modules/review-replies.md` | On |
| `hashtags` | `modules/hashtags.txt` | On |
| `headlines` | `modules/headline-ab.md` | Off |
| `calendar` | `modules/posting-calendar.md` | Off |
| `languagePack` | `modules/language-pack-<lang>.md` | Off |
| `feedback` | `modules/feedback-notes.md` | Off |
| Automatic Event Page | `modules/event-page.html` | Generated automatically when the input describes an event, workshop, class, talk, launch, or similar gathering. |

Each run creates `output/<timestamp>_<input-slug>/` containing the individual content files, `dashboard.html`, and an auditable `run-manifest.json`. Review any fabrication warnings before publishing.

## Dashboard input mode

Start `serve`, then open the displayed localhost address. Enter a plain-English business update such as “Saturday workshop, 10am to noon, twelve seats, starter jar included.” The local server silently identifies supported facts and generates the full matrix using the saved profile and default modules. Your browser never receives the API key; it remains in the local `.env` file and is used only by the localhost server.
