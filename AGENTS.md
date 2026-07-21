# Repository Agent Rules

## UI Components

- For frontend UI work, search the shadcn registry before creating a component or styled interactive element.
- Prefer an installed component from `apps/web/src/components/ui` first. If shadcn supports the required component but it is not installed, inspect it with `pnpm dlx shadcn@latest docs <component>` and add it from `apps/web` with `pnpm dlx shadcn@latest add <component>`.
- Do not hand-roll menus, dialogs, confirmation dialogs, selects, popovers, tooltips, tabs, toggles, form controls, feedback states, or layout primitives when an appropriate shadcn component exists.
- Compose business-specific wrappers around shadcn components only when the wrapper removes repeated domain behavior or provides a stable typed API. Do not copy primitive behavior, positioning, focus management, keyboard navigation, or overlay handling into business components.
- Keep generated shadcn components in `apps/web/src/components/ui`. Before updating an installed component, use `--dry-run` and `--diff`; do not overwrite local changes without reviewing the diff.
- Use the project's configured shadcn base (`base-nova`), Base UI primitives, Lucide icons, aliases, semantic color tokens, and existing variants.
- Use `Separator` instead of decorative `<hr>`, `Empty` for empty states, `Skeleton` for loading placeholders, `Badge` for status labels, `AlertDialog` for destructive confirmation, and Sonner for transient notifications.
- The current registry and installed component inventory is documented in `docs/shadcn-components.md`. Refresh it using the commands in that document when `components.json` or the registry changes.

## Frontend Structure

- Put business modules directly under `apps/web/src/<domain>` such as `src/documents`, `src/tasks`, `src/settings`, and `src/plans`.
- Do not introduce a generic `src/features` directory. It adds nesting without defining an architectural boundary in this project.
- Keep reusable cross-domain composition in `src/components` and shadcn primitives in `src/components/ui`.
