# Bump the consent version

`CONSENT_VERSION` in `src/lib/consent.ts` is the notice version a visitor's stored choice was agreed against. When it changes, every visitor whose cookie carries an older version is asked again, with the re-ask wording for a changed notice.

## When to bump it

Only for a material change to what the banner asks consent for:

- a new tool that sets cookies or tracks (GA4 and Clarity, when they land);
- a new category;
- a new purpose for an existing tool.

Never for copy edits, a reworded sentence, a new link or a design change. Re-asking because a sentence was reworded is nagging, which the consent deck prohibits (`src/content/legal/consent-content-deck.md`).

## Steps

1. Make the material change and update the notice text in `src/content/consent.ts` and the privacy policy in the same pull request.
2. Bump `CONSENT_VERSION`. Semantic versioning: a new tool or category is a minor bump (`1.0.0` to `1.1.0`); a change that invalidates what earlier choices meant is a major bump.
3. Update the version in the deck's §10 record example, so the document and the code state the same value.
4. Run `pnpm test`. `src/lib/__tests__/consent.test.ts` covers the re-ask for an older version; `e2e/consent.spec.ts` covers the banner.
5. After deploying, open the site in a browser that has an old choice stored and confirm the banner returns with the changed-notice wording.

## Rolling back across a bump

A rollback to a build with the older version re-asks every visitor who already agreed to the newer one, because their stored version no longer matches. That is correct (the older notice is what they would now be agreeing to) but it is a second prompt, so avoid rolling back across a bump unless production is broken.
