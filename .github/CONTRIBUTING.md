# Contributing

This is a private repository for a live commercial storefront. It is not the Shopify Dawn
project — if you arrived looking to contribute to Dawn, go to
[Shopify/dawn](https://github.com/Shopify/dawn).

## Working here

1. **Read [`CLAUDE.md`](../CLAUDE.md) first.** It documents the ways live work has been
   destroyed here before, and how to avoid repeating them.
2. **Branch for anything non-trivial.** `main` mirrors the live theme and is written to
   automatically by Shopify's GitHub integration.
3. **One commit, one idea.** If a change might need reverting on its own, it gets its own
   commit.
4. **Write commit messages that explain why.** The standard set in this repo:
   `Fix bar chart clipping: add topPadding so count labels on tallest bars aren't cut off`
5. **Never commit secrets.** No `shpat_` tokens, no `.env` contents, no passwords.
6. **Update the docs in the same commit.** If behaviour changes, `REFERENCE.md` in
   `whiskyblender-docs` changes too.

## Before opening a PR

- [ ] `shopify theme check` passes
- [ ] Changes previewed on an unpublished theme, not the live one
- [ ] Mobile checked as well as desktop
- [ ] No secrets in the diff
- [ ] Documentation updated if behaviour changed

## Reviewing

The question to answer is not "does this work" but "what does this break if I'm wrong".
Pay particular attention to anything touching the Lab, the cart, or checkout.
