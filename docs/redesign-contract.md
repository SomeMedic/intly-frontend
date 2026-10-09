# Redesign contract · 2026-10-10

The owner-provided root DESIGN.md remains unchanged. This document records how its extracted Linear visual language is applied to INTLY.

## Foundation

Inter Variable is served locally under the included SIL Open Font License. Neutral surfaces use #08090a, #0f1011, #141516 and #191a1b in dark mode, with #f7f8f8 and white in light mode. Borders, typography, spacing, controls and overlay layers are shared across screens.

Four existing saved theme IDs remain compatible: Indigo (Индиго), Sage (Шалфей), Terracotta (Терракота) and Graphite (Графит). Each supports light, dark and system mode. Only accent colour changes between palettes. Functional success, warning and error colours retain their meaning.

Controls use 6px corners, panels 10px, body text 14px, labels 13px and metadata 12px. Mobile inputs use 16px to avoid browser zoom. Existing motion, loading pulses, drag and drop, editor behaviour and reduced-motion preferences remain supported.

## Vocabulary

| Concept                      | Russian                      | English                        |
| ---------------------------- | ---------------------------- | ------------------------------ |
| Dashboard                    | Обзор                        | Overview                       |
| Opportunity catalogue        | Возможности                  | Opportunities                  |
| Vacancy / freelance / tender | Вакансии / Проекты / Тендеры | Vacancies / Projects / Tenders |
| Watchlists                   | Автопоиск                    | Autosearch                     |
| Saved views                  | Сохранённые поиски           | Saved searches                 |
| Pipelines                    | Отклики                      | Responses                      |
| Notifications                | Уведомления                  | Notifications                  |
| Admin                        | Администрирование            | Administration                 |

Content principles follow [Shopify product content guidance](https://shopify.dev/docs/apps/design/content) and [Atlassian voice and tone](https://atlassian.design/foundations/content/voice-tone/): short task-oriented language, consistent terminology, concrete verbs, useful empty states and actionable errors. Visual restraint follows [Linear's design refresh](https://linear.app/now/behind-the-latest-design-refresh).

## Coverage

Shared navigation, search, profile selector, theme controls, form controls, dialogs, editor, loading/error/empty states; authentication and onboarding; dashboard; opportunity catalogue, details, filters, transfer and AI analysis; tasks, responses, calendar, notifications, autosearch and saved searches; profiles, resumes, knowledge and analytics; settings and all administration tabs.

## Validation

Validate existing contracts with typecheck, lint, focused tests and a production build. Inspect rendered screens on desktop and mobile, open representative forms and drawers, check all palettes and restore preview preferences. After the main push, verify GitHub Actions, production image/commit receipt and the live interface.
