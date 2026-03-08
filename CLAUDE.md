# Sleepytime YouTube

A Next.js application that plays YouTube playlists one video at a time, with sleep timer functionality. It supports both public playlists (via API key) and authenticated user playlists (via Google OAuth). It's a client-side focused app deployed on Vercel with minimal server-side logic (server only needed for OAuth via Auth.js).

## AI Development

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Always use Bun as the package manager
- After making any code changes, run `bun fix` to ensure codebase is valid.
- Before writing any code – State how you will verify this change works (test, bash, browser, etc.) along with exact commands to run, or manual steps the user needs to take.

## React and TypeScript Development

- Early Returns: Prefer early return syntax to reduce nesting
- Functional Code: Write simple, flat, and functional code
- Always use `function` keyword for components instead `const` assignments
- Prefer types to interfaces
- Prefer inline prop types over separate declarations
- Use direct imports with destructuring `import { Component } from "~/path/to/Component"`
- Use Tailwind CSS for styling
- Avoid barrel exports and default exports – we prefer named exports
