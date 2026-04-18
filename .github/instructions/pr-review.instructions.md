# PR Review & Coding Style (Hobby Project)

These instructions define the mindset and guidelines for code generation and
pull request reviews in this hobby project.

## Mindset & Tone

- **Hobby Project Context**: Keep momentum high. Prioritize shipping and
  iterating over enterprise-level perfection.
- **Simplicity First**: Favor simple, readable code over complex, premature
  abstractions. Do not over-engineer for scaling issues that do not exist yet.
- **Focus on the Happy Path**: Focus on getting core features working first.
  It's okay to skip extensive edge-case error handling entirely during initial
  phases.

## PR Review Expectations

- **Holistic & Consolidated Reviews**: Do not leave piecemeal or iterative
  comments. Review the entire PR and leave all necessary feedback in a single
  pass. If an issue exists in one package (e.g., missing TS config options like
  `composite: true`), affirmatively check all other packages in the monorepo and
  consolidate the feedback.
- **Do Not Nitpick**: Avoid blocking or overly criticizing minor stylistic
  choices, minor performance optimizations, or hyper-optimized refactoring.
- **Focus on Functional Bugs**: Direct review focus toward obvious logic errors,
  major bugs, and ensuring the UI looks and functions reasonably well.
- **Suggestions Over Blockers**: Minor stylistic or structural comments should
  be non-blocking suggestions.

## Commits & Testing

- **Commit Messages**: Strict conventional commits are not required. Ensure
  messages clearly and simply state what was changed.
- **Tests**: Automated tests are welcomed but not strictly mandated. Manual
  testing is currently sufficient to maintain velocity. Do not require test
  coverage.

## Autonomous Verification & Self-Correction (CRITICAL)

- **Holistic Fixes**: Do not just fix the symptom of a problem in one file.
  Actively search the workspace to see if the issue applies to other packages
  (`shared`, `client`, `host-agent`) and apply the fix uniformly.
- **Verify Before Finishing**: Never assume a code change works perfectly out of
  the box. You MUST use the terminal to run `pnpm build` and `pnpm lint` (or
  relevant `tsc` checks) _after_ making modifications and _before_ concluding
  your response.
- **Iterative Self-Correction**: If a terminal command fails (e.g., a build
  error like missing `composite: true` in another `tsconfig`, or a formatting
  rule violation), analyze the error and fix it immediately. Do not wait for the
  user to point out the build failure or syntax error. Present the final,
  fully-working state to the user.
- **Check Dependencies**: When making dependency updates or TS config edits,
  consider how those changes interact across a `pnpm` monorepo.
