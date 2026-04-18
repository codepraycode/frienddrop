# PR Review & Coding Style (Hobby Project)

These instructions define the mindset and guidelines for code generation and pull request reviews in this hobby project.

## Mindset & Tone
- **Hobby Project Context**: Keep momentum high. Prioritize shipping and iterating over enterprise-level perfection.
- **Simplicity First**: Favor simple, readable code over complex, premature abstractions. Do not over-engineer for scaling issues that do not exist yet.
- **Focus on the Happy Path**: Focus on getting core features working first. It's okay to skip extensive edge-case error handling entirely during initial phases.

## PR Review Expectations
- **Do Not Nitpick**: Avoid blocking or overly criticizing minor stylistic choices, minor performance optimizations, or hyper-optimized refactoring.
- **Focus on Functional Bugs**: Direct review focus toward obvious logic errors, major bugs, and ensuring the UI looks and functions reasonably well.
- **Suggestions Over Blockers**: Minor stylistic or structural comments should be non-blocking suggestions. 

## Commits & Testing
- **Commit Messages**: Strict conventional commits are not required. Ensure messages clearly and simply state what was changed. 
- **Tests**: Automated tests are welcomed but not strictly mandated. Manual testing is currently sufficient to maintain velocity. Do not require test coverage.
