# whiskyblender-theme-v2

The live Shopify theme for [whiskyblender.com](https://whiskyblender.com) — custom whisky
blending and personalised labels.

Built on [Shopify Dawn](https://github.com/Shopify/dawn) (tracked as the `upstream` remote).
Published 2026-06-06, superseding `whiskyblender-theme` (v1).

| | |
|---|---|
| **Store** | `whiskyblenderlive.myshopify.com` |
| **Theme ID** | `185122423049` |
| **Live URL** | https://whiskyblender.com |
| **Sync** | Shopify's GitHub integration auto-commits theme-editor changes to `main` |

---

## Before you touch anything

Read **[`CLAUDE.md`](CLAUDE.md)**. It contains the rules that stop you destroying live work
— in particular the pull/stash/push sequence, and why `shopify theme dev` must never be run
here.

Full system documentation lives in the
[`whiskyblender-docs`](https://github.com/whiskyblender/whiskyblender-docs) repo:

| Document | Covers |
|---|---|
| `REFERENCE.md` | Every storefront flow, in detail |
| `RUNBOOK-RESTORE.md` | What to do when the theme is broken or gone |
| `PLAN-LIVE.md` | Current work in progress |
| `SEO-REFERENCE.md` | Search performance and the product-naming constraint |

---

## Local development

```bash
npm i -g @shopify/cli
shopify theme pull --theme 185122423049 --nodelete
```

⚠️ **Do not run `shopify theme dev`.** See `CLAUDE.md` for why.

Preview changes by pushing to an unpublished theme:

```bash
shopify theme push --unpublished
```

### Theme Check

```bash
shopify theme check
```

Config in `.theme-check.yml`.

---

## Custom code

Whisky Blender's own code is prefixed `wb-` to separate it from Dawn's:

| Area | Files |
|---|---|
| Blending Lab | `sections/wb-lab.liquid`, `assets/wb-lab.js` |
| Label preview | `assets/wb-preview.css` ⚠️ *git-only — see `CLAUDE.md`* |
| Single malt flow | `assets/wb-single-malt.js` |
| Product structured data | `snippets/wb-product-structured-data.liquid` |
| Press page | `sections/wb-press.liquid` |
| Page effects | `sections/wb-effects.liquid` |

---

## Staying current with Dawn

```bash
git fetch upstream
git merge upstream/main    # expect conflicts in customised files
```

Review carefully — Dawn changes have overwritten custom work before.
Dawn's own README is kept as [`README-dawn-original.md`](README-dawn-original.md).

---

## Licence

Dawn is licensed under the [MIT License](LICENSE.md). Whisky Blender's customisations are
proprietary.
