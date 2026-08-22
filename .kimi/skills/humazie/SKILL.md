# humazie

Humanize text or code so it reads like it was written by a person, without changing facts, logic, or substantive content.

Use this skill when you have text or source code that feels artificially generated — overly formal, verbose, promotional, or filled with AI stylistic tics — and you want to make it plainer and more natural while keeping the same meaning.

## What it does

- Removes AI-vocabulary tics (`delve`, `robust`, `pivotal`, `underscore`, `tapestry`, `vibrant`, `fostering`, `showcase`, `landscape`, `intricate`, `meticulous`, `bolstered`, `garner`, `testament`, `crucial`, `emphasizing`, `enhance`, `highlight`, `additionally`, etc.).
- Restores simple copulatives (`is`, `are`, `has`, `was`, `wrote`, `died`, `used`, `moved`, `tried`) instead of stiff periphrasis (`serves as`, `functions as`, `boasts`, `features`, `authored`, `passed away`, `utilized`, `relocated`, `attempted`).
- Eliminates puffery, promotional language, and vague significance claims (`stands as a testament to`, `highlights its importance`, `plays a crucial role`, `marks a pivotal moment`).
- Removes weasel attributions (`Experts argue`, `Observers have cited`, `Industry reports`, `Some critics argue`, `Several sources`) unless the source is actually named.
- Breaks formulaic parallelisms (`Not only ... but also`, `It's not ..., it's ...`, `X rather than Y`) and rule-of-three patterns.
- Simplifies overused em-dashes, boldface, inline-header lists, Markdown-to-wikitext artifacts, title-case headings, skipped heading levels, and thematic breaks.
- For code: improves names, formatting, and comments; removes dead code smell; preserves behavior.
- For commit messages: keeps them plain, specific, and imperative; avoids AI-style assurances (`ensured adherence to`, `improved compliance with`, `preserved existing structure while ...`).

## AI-vocabulary watch list

These words are not banned, but clusters of them are a strong sign of AI-generated prose. Prefer simpler, more specific alternatives.

| AI tic | Plain alternative |
|--------|-------------------|
| additionally | also, plus, and, besides |
| align with | match, fit, agree with |
| boasts / features / offers / maintains (for "has") | has |
| bolstered | helped, strengthened, supported |
| crucial / pivotal / vital / significant | important, key, needed |
| delve / deep dive | look into, examine, explore |
| emphasizing / highlighting / underscoring | showing, noting, pointing out |
| enduring / lasting / ongoing | lasting, continuing |
| enhance / foster / cultivate | improve, help, grow |
| garner | get, receive, collect |
| intricate / meticulous / robust | detailed, careful, strong |
| interplay | interaction, relationship |
| landscape (abstract) | scene, field, picture |
| showcase / exemplify | show, demonstrate |
| tapestry | pattern, mix, range |
| testament | sign, evidence, proof |
| underscore | emphasize, show, stress |
| vibrant | lively, active, bright |
| valuable insights | useful findings, useful points |

Also avoid vague significance phrases:

- `is a testament to`
- `underscores the importance of`
- `highlights the significance of`
- `marks a pivotal moment`
- `plays a crucial role`
- `contributes to the broader`
- `reflects broader trends`
- `shaping the future of`
- `evolving landscape`
- `indelible mark`
- `deeply rooted`

## Syntactic patterns to avoid

- Avoid replacing simple `is/are/has` with `serves as`, `stands as`, `functions as`, `operates as`, `represents a`, `boasts a`, `features a`, `offers a`.
- Avoid vague connection phrases: `in connection with`, `associated with`, `connected to` when a more direct relationship works (`of`, `for`, `by`, `caused by`, `used in`).
- Avoid negative parallelisms: `Not only X but also Y`, `It's not X, it's Y`, `X rather than Y`.
- Avoid rule-of-three lists that pad a point: `adjective, adjective, adjective` or `phrase, phrase, and phrase`.
- Avoid outline conclusions: `Despite its successes, X faces several challenges...`
- Avoid canned emphasis on notability: `independent coverage`, `profiled in`, `active social media presence`, `written by a leading expert`.
- Avoid knowledge-cutoff disclaimers: `as of my last update`, `specific details are limited`, `based on available information`.
- Avoid phrasal templates left unfilled: `(Add your channel URL here)`, `2025-xx-xx`.

## Formatting patterns to avoid

- Overuse of boldface, especially boldfacing every instance of a term.
- Inline-header vertical lists (`**Header:** description`).
- Em-dashes used in a formulaic, spaced way where commas or parentheses would do.
- Title case in section headings (`Impact of Technology and Digitalization` → `Impact of technology and digitalization`).
- Skipping heading levels or overusing level 1 headings.
- Thematic breaks (`----`) between every section.
- Markdown fences (```wikitext) inside wikitext.
- Emoji in headings or as bullet markers.
- Curly quotes and apostrophes when straight quotes are expected (`"` vs `“`).
- Broken references, unused named refs, placeholder dates.

## Rules

1. **Do not change facts.** Names, dates, numbers, URLs, and verified claims stay exactly as given.
2. **Do not add new information.** No invented examples, sources, or embellishments.
3. **Do not remove substantive content.** If something is factually stated, keep it in some form.
4. **Preserve logic for code.** Behavior, APIs, inputs, and outputs must remain unchanged.
5. **Keep the original register.** Make it natural, not slangy or dramatic.

## How to apply

When the user asks you to "humazie" something:

1. Read the provided text or code.
2. Identify AI-generated stylistic patterns (vague emphasis, marketing speak, stiff copulas, repetitive transitions, unnecessary lists).
3. Rewrite in plain, direct prose or clean idiomatic code.
4. If the input is code, also rename unclear variables/functions and add concise comments that explain intent, but do not change control flow or data structures.
5. Return only the humanized result plus a very brief note about what changed. If the user asks for a diff-style explanation, provide one.

## For commit messages

A humanized commit message:

- Uses the imperative mood: `Add`, `Fix`, `Update`, `Remove`, `Refactor`.
- Is specific: `Fix off-by-one in pagination` not `Fixed an issue`.
- Is concise: one short summary line, optional blank line, then bullets for details if needed.
- Avoids AI-style meta-commentary: `ensured that...`, `adheres to...`, `preserved...`, `improved...` without specifics.

Bad: `Updated the favicon and ensured adherence to the deployment workflow while preserving existing structure.`
Good: `Replace favicon with compassion.svg; add generate-favicon.py`

## Examples

### Prose

**Before:**

> The Statistical Institute of Catalonia was officially established in 1989, marking a pivotal moment in the evolution of regional statistics in Spain.

**After:**

> The Statistical Institute of Catalonia was established in 1989.

### Code

**Before:**

```js
function processData(d) {
  // This function handles the data and returns the result
  const r = d.map(x => x * 2).filter(x => x > 10);
  return r;
}
```

**After:**

```js
function doubleAndFilter(values) {
  const doubled = values.map(value => value * 2);
  return doubled.filter(value => value > 10);
}
```

### Commit message

**Before:**

```
I revised the deployment workflow to ensure compliance with the multi-environment setup and improved the overall structure while preserving the existing build logic.
```

**After:**

```
Add per-environment secrets and Basic Auth to deploy workflow
```

## Notes

- This skill is for readability and tone, not for adding new research or citations.
- If the source material contains errors of fact, flag them rather than silently correcting them while humanizing.
- One or two AI tics in isolation are fine; look for clusters and patterns.
