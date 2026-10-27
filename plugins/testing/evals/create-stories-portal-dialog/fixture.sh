#!/usr/bin/env bash
# Builds a minimal React + Storybook 10 project with one component whose confirmation dialog renders
# through a portal, plus a mimicry-js builder for its data. It is the A/B fixture the knowledge base
# was measured on: the one defect that slipped through trimmed rule sets was asserting the dialog's
# absence through `canvas`, which always passes because `canvas` never sees the portal.
#
# Nothing is installed: the case grades the story file the skill writes, not a test run.
set -euo pipefail

mkdir -p demo-app/.storybook demo-app/src/components demo-app/src/test/builders
cd demo-app

cat > package.json <<'FILE'
{
  "name": "ab-fixture",
  "private": true,
  "type": "module",
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "test:storybook": "vitest --project=storybook"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@faker-js/faker": "^9.9.0",
    "@storybook/react-vite": "^10.0.0",
    "@storybook/addon-vitest": "^10.0.0",
    "mimicry-js": "^1.3.0",
    "storybook": "^10.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
FILE

cat > tsconfig.json <<'FILE'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": "./",
    "paths": { "~/*": ["./*"] }
  },
  "include": [
    "src", ".storybook"]
}
FILE

cat > .storybook/preview.tsx <<'FILE'
import { definePreview } from "@storybook/react-vite";

export default definePreview({
  parameters: {
    layout: "centered",
  },
});
FILE

cat > src/components/user.ts <<'FILE'
export type UserRole = "owner" | "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
FILE

cat > src/components/delete-user-button.tsx <<'FILE'
import { useState } from "react";
import { createPortal } from "react-dom";

import type { User } from "./user";

type DeleteUserButtonProps = {
  user: User;
  onConfirm(userId: string): void;
};

export function DeleteUserButton({ user, onConfirm }: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false);
  const isOwner = user.role === "owner";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={isOwner}>
        Delete {user.name}
      </button>
      {isOwner && <p>The workspace owner cannot be deleted.</p>}
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
            <h2 id="delete-user-title">Delete {user.name}?</h2>
            <p>This removes {user.email} from the workspace.</p>
            <button
              type="button"
              onClick={() => {
                onConfirm(user.id);
                setOpen(false);
              }}
            >
              Confirm
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
FILE

cat > src/test/builders/user.builder.ts <<'FILE'
import { faker } from "@faker-js/faker";
import { build, oneOf } from "mimicry-js";

import type { User } from "~/src/components/user";

/**
 * Test data builder for {@link User}.
 *
 * @example userBuilder.one({ overrides: { name: "Ada Lovelace" } })
 * @example userBuilder.one({ traits: "owner" })
 */
export const userBuilder = build<User>({
  fields: {
    id: () => faker.string.uuid(),
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
    role: oneOf("admin", "member"),
  },
  traits: {
    owner: { overrides: { role: "owner" } },
  },
});
FILE
