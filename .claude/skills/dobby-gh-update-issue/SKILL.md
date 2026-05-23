---
name: dobby-gh-update-issue
description: Internal — updates/refines an Issue in GitHub. Invoked by dobby-update-pbi after backend resolution. Do not invoke directly unless forcing the GitHub backend. Supports field updates (title, body, labels, milestone, assignees, state) and a refinement mode that synthesizes body, comments, related items, and codebase context into a well-structured issue body following the project template.
metadata:
  author: dobby
  version: '1.0'
---

Update or refine an existing Issue in GitHub.

This skill is the **GitHub implementation** invoked by the `dobby-update-pbi` dispatcher after it resolves `backend: "github"` from `.dobby/config.json`. Direct invocation is supported as an escape hatch.

This skill has two modes:

| User intent                            | Mode             | What happens                                                                                       |
| -------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| "Update issue 15 title to …"           | **Field update** | Directly changes the specified fields                                                              |
| "Add this acceptance criterion to #15" | **Field update** | Edits the body's `## Acceptance Criteria` section, preserves the rest                              |
| "Add label X to issue 15"              | **Field update** | Adds/removes labels via `gh issue edit`                                                            |
| "Refine issue 15"                      | **Refinement**   | Reads everything (body, comments, related issues, codebase), synthesizes a template-compliant body |
| "Improve this issue"                   | **Refinement**   | Same as above                                                                                      |
| "Make issue 15 clearer"                | **Refinement**   | Same as above                                                                                      |
| "Build a good issue from #15"          | **Refinement**   | Same as above                                                                                      |

If the intent is ambiguous, ask the user: "Do you want to update specific fields, or do a full refinement?"

## ⛔ Critical Rules (read before every run)

1. **Always use `--body-file <path>` for body updates** — never `--body "<string>"` for multiline content. GitHub's CLI accepts both, but inline `--body` is brittle under shell quoting (escaping, newlines, backticks). Write the body to a temp file and use `--body-file`.
2. **Preserve unrelated sections when partially updating.** GitHub issues have a single `body` field that holds both `## Description` and `## Acceptance Criteria`. When the user asks for a change to one section, fetch the current body, modify only the targeted section, and write the rest back unchanged.
3. **Follow the template** when generating new body content. Use `skills/dobby-gh-create-issue/templates/issue-template.md`. When updating, only re-structure sections the user explicitly wants rebuilt.
4. **Run `gh` commands exactly as shown — no piping or post-processing.** Every command in this skill uses `--json <fields>` (or `--jq` where explicitly noted). Do NOT pipe through `| ConvertFrom-Json`, `| Select-Object`, `| jq` (beyond what's documented here), `| grep`, `| python -c "..."`, or any other transform. Read the full JSON output and extract fields in your own reasoning.
5. **Use canonical `skills/` paths for all file reads.** This SKILL.md lives at `skills/dobby-gh-update-issue/`. Reference templates from the canonical path (e.g., `skills/dobby-gh-create-issue/templates/issue-template.md`), not from `.github/skills/` or `.claude/skills/` host copies. The host copies are auto-generated mirrors.
6. **Include `--repo "<owner>/<repo>"` on every `gh` command.** Do not rely on implicit current-directory inference — it silently picks the wrong repo when the cwd doesn't match.
7. **Never close, reopen, or transfer an issue as part of an "update".** Those are separate lifecycle operations. If the user asks to close, route them to `dobby-close-pbi` instead.

## Field Reference

| Field              | gh flag                                 | Notes                                      |
| ------------------ | --------------------------------------- | ------------------------------------------ |
| Title              | `--title "<text>"`                      | Single line. Inline is fine — no markdown. |
| Body               | `--body-file <path>`                    | Multiline markdown. Always via file.       |
| Labels (add)       | `--add-label "<name>"` (repeatable)     | Label must already exist in the repo.      |
| Labels (remove)    | `--remove-label "<name>"` (repeatable)  |                                            |
| Milestone          | `--milestone "<title>"`                 | Title or number.                           |
| Remove milestone   | `--remove-milestone`                    |                                            |
| Assignees (add)    | `--add-assignee "<login>"` (repeatable) | Use `@me` for self.                        |
| Assignees (remove) | `--remove-assignee "<login>"`           |                                            |

State changes (open/close) are out of scope for this skill — see `dobby-close-pbi` for closure.

---

## Common Steps (both modes)

### 1. Validate Prerequisites

**1a. Check gh CLI**

```bash
gh --version
```

- If `gh` is not found → stop: "GitHub CLI is not installed. Install from https://cli.github.com/"

**1b. Check authentication**

```bash
gh auth status
```

- If not authenticated → stop: "Run: `gh auth login`"
- Display the active GitHub user so the user can catch wrong-account issues before any writes.

### 2. Resolve Owner and Repo

Read the `github` block from `.dobby/config.json` for `owner` and `repo`. Example shape:

```json
{
  "backend": "github",
  "github": {
    "owner": "myorg",
    "repo": "myrepo"
  }
}
```

If `owner` or `repo` is missing, prompt the user once ("What's the GitHub repo? (`owner/repo`)") and persist the answer back to `.dobby/config.json` at the end of the run.

### 3. Resolve and Fetch the Issue

Parse the user's input to determine the lookup strategy:

| Input format            | Strategy                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- |
| Numeric ID (e.g., `15`) | Direct fetch                                                                     |
| `#15`                   | Strip `#`, fetch by ID                                                           |
| GitHub issue URL        | Extract numeric ID from path, fetch                                              |
| Title or keywords       | `gh issue list --search "<keywords>"`; if multiple matches, ask the user to pick |

Fetch the issue:

```bash
gh issue view <N> --repo "<owner>/<repo>" --json number,title,state,body,labels,milestone,assignees,url,comments
```

Extract:

- **Title**: `title`
- **State**: `state` — if `CLOSED`, warn the user and ask whether to proceed.
- **Body**: `body` — the source of truth for current Description + Acceptance Criteria sections.
- **Labels**: `labels[].name`
- **Milestone**: `milestone.title` (may be null)
- **Assignees**: `assignees[].login`
- **Comments**: `comments[]` — each has `author.login`, `createdAt`, `body`. Refinement mode uses these; field-update mode can skip reading them.

Display current title, number, and state to the user for confirmation.

**Then choose the mode** based on the user's intent (see mode table above).

---

## Field Update Mode (steps 4–7)

Use this mode when the user wants to change specific, known fields.

### 4. Determine What to Update

Based on the user's request, classify each requested change:

**Simple fields** (title, labels, milestone, assignees) → handled in step 5 via `gh issue edit` flags.

**Body sections** (Description, Acceptance Criteria, or the whole body) → handled in step 6 via `--body-file`.

When updating a body **subset** (e.g., "add this acceptance criterion"), fetch the current body (already done in step 3) and modify only the targeted section. Do not silently rewrite other sections.

### 5. Update Simple Fields

Batch all simple-field changes into a single `gh issue edit` call:

```bash
gh issue edit <N> \
    --repo "<owner>/<repo>" \
    --title "<new-title>" \
    --add-label "<label-a>" \
    --remove-label "<label-b>" \
    --milestone "<milestone-title>" \
    --add-assignee "<login>"
```

Include only the flags the user actually requested.

**Error handling:**

- If `gh` reports a label that doesn't exist, list available labels:
  ```bash
  gh label list --repo "<owner>/<repo>" --json name --limit 100
  ```
  Show the list and ask the user.
- If the milestone is not found, list available milestones:
  ```bash
  gh api "repos/<owner>/<repo>/milestones" --jq '[.[] | {title, number, state}]'
  ```
  (This is a deliberate exception to the no-pipe rule — `gh api` requires `--jq` for selection.)
- If an assignee is unknown, surface the `gh` error and ask the user.

### 6. Update Body via `--body-file`

Compose the updated body in a temp file. Apply the user's requested change while preserving everything else:

- If updating only `## Description`: keep `## Acceptance Criteria` (and any other section) byte-for-byte from the current body.
- If updating only `## Acceptance Criteria`: keep `## Description` byte-for-byte.
- If the existing body has sections the template doesn't define (e.g., a "Refinement Notes" trailer added by another skill), preserve them.

Apply:

```bash
gh issue edit <N> \
    --repo "<owner>/<repo>" \
    --body-file <path-to-body.md>
```

Clean up the temp file after a successful update.

### 7. Verify and Report

Re-fetch the issue to confirm the change landed:

```bash
gh issue view <N> --repo "<owner>/<repo>" --json number,title,state,body,labels,milestone,assignees,url
```

Show the user the updated fields and the issue URL.

---

## Refinement Mode (steps R1–R6)

Use this mode when the user says "refine", "improve", or wants a well-structured issue built from all available context. This mode reads everything — current body, comments, related items, and the codebase — then synthesizes a complete, template-compliant body.

### R1. Read Comments (already fetched in step 3)

Comments came back in step 3's `gh issue view --json comments` call. Each entry has `author.login`, `createdAt`, and `body`.

**⚠️ How to treat comments:**

Comments are **historical context and ideas** — they are NOT authoritative requirements. They may contain:

- Brainstorming and early ideas (not all will be relevant)
- Current state observations (may be outdated)
- Stakeholder feedback (valuable but may conflict with other comments)
- Technical notes and investigation results
- Rejected approaches (still useful as context for what NOT to do)

**Rules for using comments:**

- Prefer the current issue body and explicit user instructions over comment content
- If comments conflict with each other, surface the conflict and ask the user
- If comments conflict with the current body, ask — don't silently choose
- Extract useful information (requirements hints, edge cases, stakeholder preferences) but don't treat every comment as a requirement
- Preserve author attribution (`@<login>`) when referencing specific comment insights
- Recent comments generally carry more weight than older ones, but use judgment

### R2. Fetch Related Items (bounded)

GitHub doesn't have first-class parent/child links outside Projects v2, but task-list references in the body act as one. Parse the current body for `- [ ] #<M>` or `- [x] #<M>` lines:

- For each referenced issue (cap at 5), fetch title and state:
  ```bash
  gh issue view <M> --repo "<owner>/<repo>" --json number,title,state
  ```

Also check for issues whose body references this one:

```bash
gh issue list --repo "<owner>/<repo>" --search "#<N>" --state all --json number,title,state --limit 5
```

Linked PRs (cross-references):

```bash
gh api "repos/<owner>/<repo>/issues/<N>/timeline" --jq '[.[] | select(.event=="cross-referenced") | .source.issue | select(.pull_request) | {number: .number, title: .title, state: .state, url: .html_url}]'
```

(Pipe through `--jq` is permitted here — `gh api` does not have a `--json` filter equivalent.)

All of this is **context only**, not requirements.

### R3. Explore the Codebase

Search the repository for context relevant to the issue. Use the title, body, and comment insights to guide the search:

- Look for existing code, modules, or components mentioned in the body or comments
- Find relevant documentation, design docs, or test specs
- Identify existing patterns and conventions in the affected areas
- Surface hidden complexity (e.g., the issue says "remove field X" but X is used in 12 places)

**Guardrails:**

- Search based on specific terms from the issue, not broad exploration
- Prefer existing docs/tests/code near matching features
- Do not infer product requirements solely from current implementation — code is how it IS, not how it SHOULD be
- If code contradicts the body or comments, present the discrepancy to the user
- Keep exploration bounded — spend at most a few minutes, then move on

For non-trivial searches, prefer a single `Explore` subagent call over many manual greps — it keeps the main conversation focused on synthesis.

### R4. Synthesize the Refined Body

Read the template at `skills/dobby-gh-create-issue/templates/issue-template.md` and use it as the structural guide for the refined body. The template defines two top-level sections in one markdown body:

- `## Description` — user-story line, overview table, goal, scope, solution approach, references
- `## Acceptance Criteria` — Given/When/Then checkbox items

**Inputs (in priority order):**

1. Explicit user instructions (highest priority)
2. Current issue body (Description + Acceptance Criteria)
3. Comments (ideas and context — weigh, don't blindly include)
4. Related items (context only)
5. Codebase findings (technical reality)

**What the refinement should do:**

- Fill in empty or incomplete template sections with information from comments and codebase
- Sharpen vague language into specific, actionable requirements
- Add scope boundaries (in-scope / out-of-scope) if not already present
- Add dependencies if discovered during codebase exploration
- Convert scattered comment ideas into structured acceptance criteria where appropriate
- Preserve any existing content that is already well-written — don't rewrite for the sake of it
- Preserve any non-template sections at the end of the body (e.g., "Refinement Notes")

**What the refinement should NOT do:**

- Invent requirements not supported by any input (body, comments, or user instructions)
- Silently resolve conflicts between comments — ask the user
- Remove content unless it's clearly wrong or outdated (and flag the removal in the preview)
- Rebuild sections that don't need rebuilding

### R5. Present the Proposed Refinement

Show the user the full proposed refinement before applying:

```markdown
## Proposed Refinement — Issue #<N>: "<title>"

### Sources used

- Current body: <existing / empty>
- Comments: <C> comments from <date-range> (<R> found relevant)
- Related items: <task-list refs, cross-refs, linked PRs — counts and IDs>
- Codebase: <summary of what was found>

### Assumptions made

- <any assumptions that weren't explicitly stated>

### Unresolved questions

- <conflicts or ambiguities that need user input>

### Removals (if any)

- <content removed and why>

---

### Proposed Body

<full proposed body — both ## Description and ## Acceptance Criteria sections, following the template structure>
```

**If there are unresolved questions**, ask them now and incorporate the answers before proceeding.

Then ask: **"Do you want me to apply this refinement to issue #<N>?"**

### R6. Apply the Refinement

On user approval, write the proposed body to a temp file and update:

```bash
gh issue edit <N> \
    --repo "<owner>/<repo>" \
    --body-file <path-to-body.md>
```

Clean up the temp file. Verify (same as step 7 in field-update mode) and report the issue URL.

---

## Content Guidelines

- **Body is GitHub-flavored markdown.** No HTML wrappers needed. `<details>` / `<summary>` are fine where genuinely useful but avoid by default.
- Use the template from `skills/dobby-gh-create-issue/templates/issue-template.md` as the structural guide for refinements.
- When partially updating (e.g., only acceptance criteria), preserve the rest of the body byte-for-byte.
- When replacing a body entirely, follow the template structure.
- Keep acceptance criteria in the `- [ ] **Given** ... **when** ... **then** ...` checkbox format so they can be ticked off during implementation and used by `dobby-gh-close-issue`'s acceptance-check step.

## Error Handling

- **Wrong identity**: `gh auth status` shows the wrong user → suggest `gh auth switch`.
- **Issue not found**: clear message with the ID used.
- **Permission errors**: surface the underlying `gh` error and suggest checking repo access / token scopes.
- **Unknown label / milestone / assignee**: list available values (as shown in step 5) and ask the user.
- **Body update succeeded but a follow-up `gh issue edit` for labels/milestone failed**: report partial success — the body change is durable; the user can re-run for the remaining flags.
- **Network errors**: suggest checking connectivity; do not auto-retry writes.

## Guardrails

- Always show the logged-in GitHub identity early so the user can catch wrong-account issues before any writes.
- Always use `--body-file` for body changes — never inline `--body`.
- Always include `--repo "<owner>/<repo>"` on every `gh` command.
- Use `--json <fields>` for reads (and `--jq` only where this SKILL.md explicitly documents it).
- Skip prompts for fields the user already provided.
- Batch simple-field changes into a single `gh issue edit` call.
- Never close/reopen an issue from this skill — route to `dobby-close-pbi` for closure.
- Never delete comments. If a comment is wrong, leave it and add a correcting one (out of scope for this skill — do it manually).

## Optional Quality Gate

After a successful update or refinement, suggest:

> **Optional:** Run `grill-pbi` to stress-test the refined requirements and acceptance criteria before moving to proposal generation.

Do not invoke `grill-pbi` automatically — only suggest it. The user decides whether to grill.

## Efficiency Notes

- Skip prerequisite checks if they were already validated in the same session (e.g., during a create-then-update flow).
- Batch all simple-field changes into a single `gh issue edit` call.
- Fetch comments only in refinement mode — field-update mode doesn't need them.
- Don't prompt for fields the user already provided.

## Usage Examples

**Refine an issue:**

> Refine issue 15

**Refine via URL:**

> Refine https://github.com/myorg/myrepo/issues/15

**Field update:**

> Update issue 15 title to "Add validation visualization modes"

**Add a label:**

> Add the "frontend" label to issue 15

**Replace acceptance criteria:**

> Replace the acceptance criteria on #15 with these: <list>

**Append a new criterion:**

> Add this acceptance criterion to #15: Given a node with state=busy, when the dashboard renders, then a busy animation appears on the validation indicator.
