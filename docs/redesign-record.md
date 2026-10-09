# INTLY Redesign Record · 2026-10-10

This file records the redesign that is currently built in `intly-frontend`. It does not replace the owner-provided `DESIGN.md`; that file remains the Linear reference. The implementation adapts that reference to INTLY's existing product contracts, saved preferences, role model, workflows, and bilingual interface.

## Evidence Sampled

- `PRODUCT.md` confirms the redesign must preserve integrations, permissions, data contracts, workflow behavior, AI progress states, Russian/English UI, four palettes, light/dark/system modes, density, reduced motion, keyboard navigation, focus management, and responsive behavior.
- `docs/redesign-contract.md` defines the 2026-10-10 application contract: neutral Linear-inspired surfaces, Inter typography, thin borders, restrained accents, four saved theme IDs, and coverage across shared navigation, auth, onboarding, opportunities, workflows, settings, admin, knowledge, analytics, and profiles.
- `src/styles/globals.css` is the source of shared color, radius, spacing, density, shadow, motion, reduced-motion, table, modal, and brand-mark rules.
- `src/components/intly/app-shell/index.tsx`, `src/components/intly/theme-controls/index.tsx`, `src/components/ui/button/index.tsx`, `src/components/ui/modal/index.tsx`, `src/components/ui/input/index.tsx`, and `src/components/ui/textarea/index.tsx` define the built shared shell and control system.
- Representative feature samples: `src/features/workflows/ui/ScreenScaffold.tsx`, `src/features/opportunities/OpportunitiesScreen.tsx`, `src/features/opportunities/OpportunityWorkspace.tsx`, `src/features/settings/ui/SettingsScreen.tsx`, and `src/features/settings/ui/SettingsSections.tsx`.
- Rendered evidence sampled from `.local/redesign-2026-10-10/contact-desktop-4.png` through `contact-desktop-9.png` and `contact-mobile-1.png` through `contact-mobile-3.png`.

## Built System

The redesign is a dense operational workspace, not a marketing surface. Desktop screens use a persistent left navigation rail, sticky top bar, narrow controls, compact cards, admin tab strips, tables, and route-local forms. Mobile screens keep the same product hierarchy through a sticky top control row, bottom navigation, full-menu drawer, centered modals, and stacked task panels.

The visual language uses neutral background layers with a single active accent. Light mode uses a near-white app background, white cards, muted gray secondary surfaces, and thin gray borders. Dark mode uses near-black app backgrounds, dark cards/popovers, muted gray borders, and the same component structure. Functional success, warning, destructive, and AI colors retain semantic meaning separate from palette selection.

## Tokens

The durable tokens live in `src/styles/globals.css`.

| Area                | Built contract                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Font                | Local `Inter Variable`, served from `/fonts/inter-variable.ttf`; system fallbacks remain configured.                                                                              |
| Base text           | `0.875rem` body size, `1.5` line height, antialiasing, Inter feature settings, optical sizing.                                                                                    |
| Page heading        | Shared `.intly-page-header h1` uses `1.5rem`, `1.33` line height, weight `590`, and slight negative tracking. Feature scaffolds may use `text-2xl` for first-level screen titles. |
| Metadata and labels | Tables and controls use `0.8125rem`; labels and status copy use `text-xs` or `0.8125rem` with muted foreground.                                                                   |
| Radii               | `--radius-sm: 0.25rem`, `--radius-md: 0.375rem`, `--radius-lg: 0.625rem`. Controls and tabs use `rounded-md`; panels, modals, and floating menus use `rounded-lg`.                |
| Control height      | `--control-height: 2.125rem` by default, `2.5rem` in comfortable density, `2.75rem` on mobile.                                                                                    |
| Rows                | `--row-height: 2.5rem` by default and `2.875rem` in comfortable density.                                                                                                          |
| Panel padding       | `--card-padding: 1rem`; comfortable density increases it to `1.25rem`.                                                                                                            |
| Shadows             | `--shadow-soft` for light elevation, `--shadow-floating` for menus and modal drawers. Most panels use borders and one-pixel shadows rather than heavy elevation.                  |

## Themes And Preferences

The built theme system preserves four saved theme IDs. The settings UI labels them as Indigo, Sage, Terracotta, and Graphite in English/Russian. The CSS IDs are:

| Saved theme            | CSS theme ID      | Built behavior                   |
| ---------------------- | ----------------- | -------------------------------- |
| Indigo / Индиго        | `intly-plum`      | Blue-indigo primary accent.      |
| Sage / Шалфей          | `forest-teal`     | Green-teal primary accent.       |
| Terracotta / Терракота | `warm-clay`       | Warm clay primary accent.        |
| Graphite / Графит      | `graphite-copper` | Neutral graphite primary accent. |

Only the primary accent changes between palettes. Layout, density, semantic state colors, borders, shadows, and typography stay shared. `use-appearance-preferences.ts` applies optimistic preference updates and persists them through `/me/settings` under `uiSettings`, with rollback to saved values on failure.

## Motion

Shared motion tokens are `--motion-fast: 100ms`, `--motion-control: 160ms`, `--motion-panel: 240ms`, and `--ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94)`.

The built motion is restrained: controls transition on state changes; table rows transition background on hover; auth art enters with a short blur/translate animation; modal overlays fade in; modal panels fade from a light blur. System `prefers-reduced-motion: reduce` and `html[data-reduced-motion="true"]` reduce animation and transition duration to `0.01ms`.

## Components

`AppShell` owns the application frame. Desktop uses a sticky left rail grouped into Search, Work, Analytics, and Materials; the rail can collapse to icons. The top bar holds global search, active profile selector, new opportunity action, notifications, theme controls, and account menu. Mobile replaces the rail with bottom navigation for Overview, Opportunities, Tasks, Notifications, and More; More opens a floating full menu with profile and appearance controls.

`Button` has primary, secondary, ghost, outline, and danger variants. All buttons share the control height token, `rounded-md`, border, compact font, disabled and busy states, focus rings, and optional loading spinner. Icon buttons use a square token-sized hit area.

`Modal` uses Radix Dialog. It supports centered dialogs and right-side drawers, restores focus to the opener, scrolls focused fields into view, and uses shared overlay/panel animation classes. The close action uses a lucide `X` icon and localized accessible labels.

`Input`, `Textarea`, and native `select` controls share tokenized height, border/input colors, card backgrounds, compact text, placeholder color, disabled states, invalid border color, and primary focus rings. Mobile input text is raised to `1rem` to avoid browser zoom.

## Composition Rules

Feature screens reuse `intly-page-header`, `intly-toolbar`, `intly-section`, `intly-table-wrap`, and workflow panel classes rather than one-off page skins. The main repeated panel pattern is a thin border, `rounded-lg`, `bg-card/95`, tokenized padding, and a subtle one-pixel shadow.

Tables are compact, horizontally scrollable, tabular-numeric, and use muted header rows plus row hover. Admin screens in the screenshots keep dense card/table layouts for users, sources, AI routes, AI prompts, formats, usage, queues, infrastructure, and settings. Opportunity dialogs and filters use the shared modal/drawer layer over a blurred background.

Brand visuals are used sparingly. `intly-brand-mark` is a CSS-built mark with a primary-accent gradient and an inset geometric symbol. Feature illustrations appear in knowledge, analytics, resumes, and empty states, but they do not replace the operational UI.

## Localization And Content

The redesign keeps Russian and English copy in the relevant workflow files. `AppShell`, opportunities, settings, workflow scaffolds, modal labels, empty/error states, and preference controls choose text from the authenticated user's locale. Product wording follows the contract vocabulary: Overview, Opportunities, Autosearch, Saved searches, Responses, Notifications, and Administration.

The implementation keeps technical labels where the workflow requires them: AI provider settings, prompt schemas, webhook events, API tokens, queue names, source diagnostics, and infrastructure status. Ordinary workflow labels remain task-oriented and concise.

## Preservation Contracts

- Preserve the owner-provided `DESIGN.md`; use it as the external Linear reference, not as the mutable built-system record.
- Preserve existing source integrations, admin-only areas, profile scoping, search state, saved views, response workflows, AI progress/failure states, settings persistence, and auth behavior.
- Preserve keyboard focus behavior and accessible labels in shared shell controls, modals, menus, and icon buttons.
- Preserve the four saved theme IDs and the light/dark/system, density, and reduced-motion preferences.
- Preserve bilingual copy paths when adding new UI. New shared UI should provide Russian and English labels at the same level as the workflow it serves.
- Preserve the neutral operational style: thin borders, restrained accent, compact controls, tokenized panels, and reusable screen scaffolds.

## Non-Canonical Observations

Some screenshots show active compilation/toast overlays and partial loading/skeleton states. Those are runtime states, not design-system rules. They should not be copied as permanent layout or spacing references.

Local delivery checks passed: TypeScript, ESLint (zero errors; one existing TanStack Virtual/React Compiler warning), 53 Vitest suites with 317 tests, the production build with 33 routes, and all 10 frontend delivery-contract checks. Desktop and mobile screens and representative forms were inspected in the browser. All four palettes were inspected in light and dark modes, with contrast checked for text, controls, and semantic states.

A fresh reviewer confirmed the three mobile findings were resolved: truncated bottom-navigation labels, a save action overlapping profile fields, and a dashboard metric stack pushing recommendations below the first viewport. The final disposition was `ready`. The unavailable `impeccable_reviewer` and `impeccable_documenter` roles were replaced by a fresh code reviewer and writer using the supplied degraded references.

Production GitHub Actions, immutable image receipt, and live-interface checks are recorded separately after the main-branch push. Local verification does not stand in for those deployment checks.
