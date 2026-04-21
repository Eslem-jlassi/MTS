# UI Critical Audit

Audit date: 2026-04-12

Scope:
- no business code changes
- conclusions based on current frontend code, selected backend error paths, and existing audit docs
- target is a defense-safe fix order with minimal additive UI work

Important evidence note:
- no screenshot files for these reported issues were found in the repository during this audit
- this document therefore uses the reported symptoms plus direct code inspection as the evidence base

Primary evidence reviewed:
- `AGENTS.md`
- `docs/final-audit/00-repo-census.md`
- `docs/final-audit/01-non-regression-contract.md`
- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
- `client/src/components/manager-copilot/ManagerCopilotMainPanel.tsx`
- `client/src/components/manager-copilot/ManagerCopilotPanelParts.tsx`
- `client/src/components/manager-copilot/ManagerCopilotStyles.css`
- `client/src/components/manager-copilot/useManagerCopilot.ts`
- `client/src/api/managerCopilotService.ts`
- `client/src/components/chatbot/ChatbotWidget.tsx`
- `client/src/components/chatbot/ChatInput.tsx`
- `client/src/components/chatbot/useChatbotConversation.ts`
- `client/src/components/chatbot/ChatbotStyles.css`
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/components/ui/Drawer.tsx`
- `client/src/components/ui/Modal.tsx`
- `client/src/api/client.ts`
- `client/src/utils/formatters.ts`
- `client/src/pages/SlaPage.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/components/auth/AuthLayout.tsx`
- `client/src/pages/HealthMonitoringPage.tsx`
- `client/src/pages/ReportsPage.tsx`
- `server/src/main/java/com/billcom/mts/service/ChatbotService.java`

## Executive Summary

The current UI issues cluster around six root causes:

- role gating drift for ALLIE across multiple entry points, not just the floating widget
- fixed bottom-right widget shells that are tuned mostly for width, not for shorter laptop heights
- nested scroll containers and local `overflow-hidden` / `overflow-y-auto` combinations that clip dropdowns and compress content
- user-facing error copy that can still echo backend technical details
- good shared formatting helpers that are not applied consistently across all KPI surfaces
- mixed auth visual direction, where `LoginPage.tsx` is already orange/light while `AuthLayout.tsx` still drives a darker slate hero

The safest defense-period strategy is:

1. close the ALLIE role leaks first
2. sanitize user-facing error copy second
3. fix drawer clipping and single-scroll behavior
4. fix chatbot geometry and widget overlap
5. fix ALLIE widget geometry and short-height behavior
6. normalize formatting through existing helpers
7. align auth visual direction only after the functional regressions are contained

## 1. ALLIE Manager Assistant

### Root causes

- `MainLayout.tsx` currently renders the manager copilot for both `MANAGER` and `ADMIN`.
- `ManagerCopilotWidget.tsx` repeats the same widened gate with `role === UserRole.MANAGER || role === UserRole.ADMIN`.
- The widget shell is fixed to the bottom-right corner with a large floating button and a tall panel, which makes overlap more likely on short viewports.
- `ManagerCopilotStyles.css` has several width-based breakpoints, but no strong height-based adjustments for medium-height laptop windows.
- The panel body scrolls, but the total panel remains dense and visually heavy, which can make the content feel truncated even when technically scrollable.

### Affected files

- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
- `client/src/components/manager-copilot/ManagerCopilotStyles.css`
- `client/src/components/manager-copilot/ManagerCopilotMainPanel.tsx`
- `client/src/components/manager-copilot/ManagerCopilotPanelParts.tsx`

### Safe fix strategy

- First replace duplicate role checks with one shared manager-only predicate and reuse it everywhere ALLIE can appear.
- Keep the current widget architecture and panel content model; do not redesign the copilot before defense.
- Prefer additive CSS fixes:
- reduce open-state floating button footprint
- add short-height viewport rules
- ensure one clear internal scroll owner
- reduce dense spacing only inside the widget shell
- Keep the current data-loading and fallback logic from `useManagerCopilot.ts`.

### Regression risks

- manager access could be accidentally removed if the new role predicate is applied too broadly
- dashboard inline ALLIE behavior could be affected if role checks are changed in the wrong layer
- dark and light mode spacing and shadows can drift if widget CSS is rewritten instead of patched

## 2. Client Chatbot

### Root causes

- `ChatbotWidget.tsx` uses a fixed-height panel while the footer can grow with:
- draft ticket panel
- attachment cards
- upload errors
- retry banner
- input composer
- Only the message body is guaranteed to scroll, so the footer can visually crowd or squeeze the available space on short viewports.
- `ChatbotStyles.css` explicitly styles visible scrollbars for `.chatbot-body` and `.chatbot-ticket-draft-body`, so the current visible scrollbar is intentional CSS, not a browser accident.
- The floating orb remains present as the open/close control even while the panel is open, which makes the close affordance compete with the decorative shell.
- Attachment cards live above the composer but do not have a dedicated max-height strategy for constrained windows.

### Affected files

- `client/src/components/chatbot/ChatbotWidget.tsx`
- `client/src/components/chatbot/ChatInput.tsx`
- `client/src/components/chatbot/ChatbotStyles.css`
- `client/src/components/chatbot/useChatbotConversation.ts`
- `client/src/api/client.ts`

### Safe fix strategy

- Preserve the existing client-only guard in `ChatbotWidget.tsx`.
- Keep the current conversation and ticket-draft logic; the issue is mostly shell/layout, not feature architecture.
- Make footer growth bounded:
- allow the draft area or footer subareas to scroll within a capped height
- keep the composer fully visible
- reduce attachment spacing in constrained heights
- Hide or simplify decorative orb layers while the panel is open instead of maintaining both a full orb treatment and an open panel.
- Treat scrollbar visibility as a deliberate style choice that can be softened, not a reason to refactor the widget.

### Regression risks

- auto-scroll-to-latest behavior can break if the message scroll owner changes
- attachment upload and draft submission can regress if footer state is moved too aggressively
- client-only role protection must stay intact

## 3. Ticket Drawer Assignment Dropdown Clipping

### Root causes

- The status dropdown and assignment dropdown are absolutely positioned with only `z-20`.
- Both dropdowns are rendered inside a drawer content tree that already contains `overflow-y-auto`.
- `Drawer.tsx` wraps children in its own scroll container, and `TicketDrawer.tsx` adds another `flex-1 overflow-y-auto` content region, creating nested scroll and clipping pressure.
- The header comment says "sticky header", but the ticket drawer header is currently `flex-shrink-0`, not true sticky positioning inside a single scroll surface.

### Affected files

- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/components/ui/Drawer.tsx`

### Safe fix strategy

- Keep the current route, tabs, and drawer structure.
- Prefer a targeted dropdown fix over a drawer rewrite:
- either lift menus to a portal/popover layer
- or remove the local clipping constraints and raise z-index within one stable scroll owner
- Simplify to one main scroll owner for the drawer body if possible.
- If sticky behavior is needed, make header and tabs sticky inside the drawer content rather than relying on nested scroll regions.

### Regression risks

- keyboard and focus behavior in custom dropdowns
- comment/history tab scroll behavior
- drawer height behavior in small windows

## 4. Admin vs Manager: ALLIE Must Never Appear In Admin UI

### Root causes

- `MainLayout.tsx` currently treats `ADMIN` as eligible for the floating ALLIE widget.
- `ManagerCopilotWidget.tsx` repeats the widened eligibility.
- `TicketDrawer.tsx` defines `isManagerContext` as `MANAGER || ADMIN`, so the admin leak is broader than the floating widget.
- The admin leak therefore exists in:
- shell widget entry
- ticket drawer ALLIE card
- ALLIE-specific explanatory banners in drawer flows

### Affected files

- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/manager-copilot/ManagerCopilotWidget.tsx`
- `client/src/components/tickets/TicketDrawer.tsx`

### Safe fix strategy

- Treat manager-only ALLIE as a hard business invariant, not a cosmetic preference.
- Centralize the rule in one shared frontend helper or one local predicate reused consistently.
- Revalidate manager dashboard, incidents prefill flows, and ticket drawer manager enhancements after the gate is tightened.

### Regression risks

- manager-only flows could disappear if ALLIE checks are replaced with generic staff checks
- admin dashboard behavior could accidentally pick up manager-only visual remnants if only one entry point is fixed

## 5. Error Messaging Must Never Expose Raw Localhost Or Port Details

### Root causes

- `client/src/api/client.ts` returns backend `detail` or `message` verbatim when present.
- `ChatbotWidget.tsx` shows `errorMessage` directly in the retry banner.
- `ChatbotWidget.tsx` also inserts `getErrorMessage(error)` directly into ticket-draft feedback.
- `TicketDrawer.tsx` uses raw `err.response?.data?.message` in multiple toast flows.
- `HealthMonitoringPage.tsx` currently uses `e.message` directly on load failure.
- `server/src/main/java/com/billcom/mts/service/ChatbotService.java` currently builds user-facing unavailable and health messages that include `chatbotBaseUrl`, which can expose `127.0.0.1:8002` or similar values.

### Affected files

- `client/src/api/client.ts`
- `client/src/components/chatbot/ChatbotWidget.tsx`
- `client/src/components/chatbot/useChatbotConversation.ts`
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/pages/HealthMonitoringPage.tsx`
- `server/src/main/java/com/billcom/mts/service/ChatbotService.java`

### Safe fix strategy

- Add one user-facing error normalization layer and reuse it instead of formatting ad hoc strings in each component.
- Preserve technical details in logs and trace ids, not in the visible UI.
- Replace backend AI availability messages that embed service URLs with generic service-unavailable copy.
- Preserve the current `ProblemDetail` structure and traceability; this only needs safer presentation.

### Regression risks

- losing helpful retry guidance if copy becomes too generic
- inconsistency between frontend and backend error language if only one layer is changed

## 6. Formatting: Percentages, SLA Duration, MTTR, Counters

### Root causes

- The repository already has solid shared helpers in `client/src/utils/formatters.ts`.
- Several important views already use them correctly:
- `ManagerDashboard.tsx`
- `HealthMonitoringPage.tsx`
- `TicketDrawer.tsx`
- `TicketDetail.tsx`
- `TicketList.tsx`
- `ReportsPage.tsx`
- `SlaPage.tsx` still renders some values as raw strings or raw counts:
- `complianceRate%`
- raw integer counters
- `Math.round(...)` chart percentages
- `${averageResolutionHours}h`
- The main problem is inconsistent usage, not missing infrastructure.

### Affected files

- `client/src/utils/formatters.ts`
- `client/src/pages/SlaPage.tsx`
- validation references:
- `client/src/pages/dashboard/ManagerDashboard.tsx`
- `client/src/pages/HealthMonitoringPage.tsx`
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/pages/ReportsPage.tsx`

### Safe fix strategy

- Reuse the existing formatter layer instead of introducing new helpers before defense.
- Normalize the remaining SLA and KPI surfaces through:
- `formatPercent`
- `formatDurationMinutes`
- `formatHours`
- `formatNumberValue`
- Be explicit about value scales when formatting percentages so 0-100 and 0-1 values are not mixed.

### Regression risks

- double-formatting if an already humanized value is passed back through a formatter
- incorrect percent scaling if raw and normalized values are mixed

## 7. Login Page Visual Direction

### Root causes

- `LoginPage.tsx` already uses a bright orange direction for:
- primary CTA
- focus states
- verification actions
- mobile branding shell
- `AuthLayout.tsx` still defines the shared auth shell around a dark slate left hero with AI robot branding.
- Because login is nested inside `AuthLayout`, the final auth experience currently pulls in two visual directions at once.

### Affected files

- `client/src/pages/LoginPage.tsx`
- `client/src/components/auth/AuthLayout.tsx`
- `client/src/index.css`

### Safe fix strategy

- If bright/light orange is the chosen defense direction, align the shared `AuthLayout` first.
- Keep the current auth routing and page composition.
- Preserve dark mode support; the request is about visual direction, not removing theme parity.
- Avoid per-page one-off overrides that leave register, forgot-password, reset-password, and verify-email visually inconsistent.

### Regression risks

- auth pages can drift apart if only `LoginPage.tsx` is restyled
- dark mode readability can regress if orange accents are increased without contrast checks

## 8. Responsiveness, Padding, Sticky Header/Footer Behavior

### Root causes

- Widget CSS is mostly width-driven and does not strongly account for medium-height laptop windows.
- `Drawer.tsx` and `TicketDrawer.tsx` currently combine nested scroll regions.
- The generic `Modal.tsx` is relatively safe because it keeps a non-scrolling header and a scrolling body, but several screens still use custom fixed overlays with `max-h-[90vh] overflow-y-auto`.
- Those custom modal implementations can make header/footer behavior inconsistent across pages.

### Affected files

- `client/src/components/ui/Drawer.tsx`
- `client/src/components/ui/Modal.tsx`
- `client/src/components/tickets/TicketDrawer.tsx`
- `client/src/components/chatbot/ChatbotStyles.css`
- `client/src/components/manager-copilot/ManagerCopilotStyles.css`
- `client/src/pages/ReportsPage.tsx`
- `client/src/pages/ClientsPage.tsx`
- `client/src/components/tickets/CreateTicketModal.tsx`

### Safe fix strategy

- Standardize on one scroll owner per surface wherever possible.
- For the drawer:
- sticky header and tabs
- scrollable body only
- no clipping dropdowns
- For modals:
- prefer the existing generic `Modal.tsx` pattern for future fixes
- before defense, patch only the touched custom modals instead of doing a repo-wide modal refactor
- Add viewport checks for:
- 1366x768
- 1280x720
- medium-height browser windows
- narrow desktop windows

### Regression risks

- body scroll lock and focus trapping
- close-button reachability on small screens
- dark/light spacing differences caused by ad hoc modal overrides

## Safe Fix Order

1. Close ALLIE role leaks in `MainLayout.tsx`, `ManagerCopilotWidget.tsx`, and `TicketDrawer.tsx`.
2. Sanitize user-facing error copy in the frontend error boundary/helper layer, then remove endpoint-bearing backend AI copy.
3. Fix ticket drawer clipping and move toward one scroll owner for the drawer surface.
4. Fix chatbot footer/composer/draft geometry and reduce open-state orb overlap.
5. Fix ALLIE widget short-height and overlap behavior.
6. Normalize formatting on `SlaPage.tsx` and any remaining raw KPI surfaces through existing formatter helpers.
7. Align `AuthLayout.tsx` with the final defense visual direction if bright/light orange is confirmed.
8. Run a responsive polish pass on drawer/modal/widget surfaces in both dark and light mode.

## Regression Risks To Watch During Implementation

- manager-only ALLIE can regress into admin visibility again if role checks stay duplicated
- client chatbot can lose auto-scroll or ticket-draft usability if footer scroll ownership is changed carelessly
- drawer fixes can regress comments, activity, and attachments tabs if clipping is solved with broad overflow changes
- error sanitization can remove too much context if traceable but friendly copy is not retained
- formatting fixes can break values if percent scale assumptions are inconsistent
- auth visual adjustments can unintentionally diverge login from register/forgot/reset flows

## Bottom Line

The critical UI problems are real, but they do not require a defense-period redesign. The codebase already has the right primitives:

- a manager copilot shell
- a client-only chatbot shell
- shared formatter helpers
- a workable generic modal

The safest path is a tight, additive pass that:

- restores manager-only ALLIE
- removes technical error leakage
- fixes clipping and scroll ownership
- tunes widget geometry for short and narrow viewports
- reuses existing formatter and theme infrastructure instead of replacing it
