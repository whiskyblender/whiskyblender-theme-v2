# Claude Instructions — whiskyblender-theme-v2

**This is the live Shopify theme.** Theme ID `185122423049`, store
`whiskyblenderlive.myshopify.com`, published 2026-06-06. Anything pushed here is visible to
customers immediately.

Full technical detail is in `../whiskyblender-docs/REFERENCE.md`. This file is the rules.

---

## 1. Never push without explicit permission

Ask before every push. Permission for one push is not permission for the next.

## 2. Never run `shopify theme dev`

It pushes local files to the remote theme on startup, and syncs bidirectionally while
running. Editing files while it runs creates a race condition that **deletes theme files
from both local and the live store** — acknowledged in Shopify CLI 3.90.0's release notes
for AI coding tools specifically.

If it is already running, stop it before editing. Restart it after pushing, if at all.

## 3. Pull before every push — and stash first

Andrew frequently edits the theme directly in the Shopify theme editor: section settings,
JSON template content, block arrangement. **Those changes live only on Shopify's servers.**
Pushing without pulling silently overwrites them.

But `shopify theme pull` overwrites local files with whatever Shopify currently has, so any
local edit not yet pushed is silently lost. Both directions can destroy work. The safe
sequence:

```bash
git status                                                        # 1. check for local edits
git stash -u                                                      # 2. stash them (incl. untracked)
shopify theme pull --theme 185122423049 --nodelete                # 3. get Shopify's state
git stash pop                                                     # 4. restore your edits on top
git diff                                                          # 5. review, resolve conflicts
shopify theme push --theme 185122423049 --allow-live --nodelete   # 6. push immediately
```

**Session rule: pull once → make ALL edits → push immediately. Never pull again mid-session.**

## 4. Never use `--only` on push

The CLI checksum cache causes `--only` to silently skip files it believes are already in
sync, even when the server has something different. Always use the full command:

```bash
shopify theme push --theme 185122423049 --allow-live --nodelete
```

`--nodelete` stops the clean step removing files. `--allow-live` skips the interactive
confirmation.

## 5. Never touch the Lab

Do not edit `templates/page.lab-page.json` or any `wb-lab` section file unless explicitly
instructed for that specific file. Even when instructed, confirm the exact change first.

---

## Traps that have bitten before

**`assets/wb-preview.css` used to exist only in git**, so any `shopify theme pull` — even
`--only assets/wb-preview.css` — deleted the local file, because Shopify reported no matching
asset. That is how it was lost once already.

**As of 2026-08-30 it is on Shopify** (verified two ways: a full `theme pull` into a scratch
directory listed it, and it returns 200 from the CDN). The repeated full pushes during that
day's work uploaded it. So the trap should be closed — but it has only been observed once,
and the cost of the habit is nothing, so after any pull still run:

```bash
git checkout HEAD -- assets/wb-preview.css   # no-op now; harmless insurance
git status                                    # if it shows as deleted, the trap is back
```

**The stale-pull trap.** If you commit local changes and then pull, Shopify may hand back
older versions of those same files — either because the change hasn't propagated, or
because of a CLI checksum cache mismatch. Before accepting pulled changes as intentional:

```bash
git diff HEAD~1 -- <file>
```

**Push rejected by GitHub?** Shopify's auto-sync may have added commits ahead of you:

```bash
git fetch origin && git rebase origin/main
```

**Uncommitted live work.** On 2026-08-26 six days of theme-editor changes were found never
committed. Shopify's GitHub integration usually auto-commits editor changes to `main`, but
do not assume it has. Check `git log` against the Shopify version history if something
looks missing.

---

## Commit discipline

- One commit, one idea — if a change might need reverting alone, it gets its own commit.
- Commit messages say *why*, not just what. Match the existing standard:
  `Fix bar chart clipping: add topPadding so count labels on tallest bars aren't cut off`.
- Never commit secrets. No `shpat_` tokens, no `.env` contents, no passwords.
- If a change alters how something works, update `../whiskyblender-docs/REFERENCE.md` in the
  same commit.

## Before reporting done

Say which files changed, whether you pushed, and what you have **not** verified. If you
changed CSS but haven't seen it render, say so.
