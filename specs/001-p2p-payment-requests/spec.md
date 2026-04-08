# Feature Specification: Peer-to-Peer Payment Request Flow

**Feature Branch**: `001-p2p-payment-requests`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "Build the first core feature for PayMe: a peer-to-peer payment request flow in a responsive web application."

## Clarifications

### Session 2026-04-08

- Q: Expiration period contradiction — spec body says 14 days, assumptions say 7 days. Which is correct? → A: 7 days.
- Q: Recipient matching — should the system resolve recipient contact to a user ID eagerly at creation, lazily at query time, or hybrid? → A: Lazy matching at query time.
- Q: Should public/guest endpoints (shareable link page, guest payment, guest bank connection) have rate limiting? → A: Yes, basic IP-based rate limiting on guest payment and bank connection endpoints.
- Q: When a user with an existing bank account connects a new one, should it replace the existing or be blocked? → A: Replace the existing one.
- Q: What happens when a signed-in recipient opens the public shareable link for a request addressed to them? → A: Redirect to the authenticated request detail view.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a Payment Request (Priority: P1)

A signed-in user wants to request money from someone. They open the "New Request" form, choose whether to identify the recipient by email or phone, enter the recipient's contact, an amount, and an optional note explaining what the payment is for. On submission, the system validates the inputs, creates the request in a "pending" state, generates a shareable public link, and confirms success. The requester can copy and share the link with the recipient through any channel.

**Why this priority**: This is the foundational action of the entire product. Without the ability to create a request, no other flow — payment, decline, expiration — can exist. It delivers immediate, standalone value: a user can ask someone for money.

**Independent Test**: Can be fully tested by signing in, filling out the request form with valid inputs, and verifying the request appears in the outgoing requests list with correct details and a copyable shareable link.

**Acceptance Scenarios**:

1. **Given** a signed-in active user, **When** they submit a request with a valid recipient email, a positive amount, and an optional note, **Then** the system creates a pending request, displays a success confirmation, and provides a shareable link.
2. **Given** a signed-in active user, **When** they submit a request with a valid recipient phone number, a positive amount, and no note, **Then** the system creates a pending request, displays a success confirmation, and provides a shareable link.
3. **Given** a signed-in active user, **When** they submit a request using their own email or phone as the recipient, **Then** the system rejects the request with a clear error message indicating they cannot request money from themselves.
4. **Given** a signed-in active user, **When** they submit a request with an invalid email format, a zero amount, or a negative amount, **Then** the system rejects the request and highlights the specific validation errors.
5. **Given** a user whose account is not in an active state, **When** they attempt to create a request, **Then** the system prevents the action and displays a clear message explaining why.

---

### User Story 2 — Pay a Pending Request as a Signed-In Recipient (Priority: P2)

A signed-in user opens their dashboard and sees an incoming pending request. They open the request details and decide to pay. They select a funding source — either their wallet balance or a connected mocked bank account — and confirm payment. The system validates the funding source has sufficient balance, processes the payment atomically, updates the request status to "paid," adjusts the relevant balances, and confirms success.

**Why this priority**: Paying a request completes the core value loop. A payment request only delivers real value when money actually moves. This is the single most important response to a request.

**Independent Test**: Can be tested by creating a pending request for a signed-in recipient, then having the recipient select a funding source and pay. Verify the request becomes "paid," the recipient's funding source balance decreases, and the requester's wallet balance increases.

**Acceptance Scenarios**:

1. **Given** a signed-in recipient viewing a pending request with sufficient wallet balance, **When** they select "wallet" as the funding source and confirm payment, **Then** the request status changes to "paid," the recipient's wallet balance decreases by the request amount, and the requester's wallet balance increases by the request amount.
2. **Given** a signed-in recipient viewing a pending request with a connected mocked bank account that has sufficient balance, **When** they select the bank account and confirm payment, **Then** the request status changes to "paid," the bank account balance decreases by the request amount, and the requester's wallet balance increases by the request amount.
3. **Given** a signed-in recipient viewing a pending request, **When** they attempt to pay with a funding source that has insufficient balance, **Then** the system rejects the payment with a clear message and no balances or statuses change.
4. **Given** a signed-in recipient who has already paid a request, **When** they attempt to submit payment again (e.g., double-click or browser back), **Then** the system prevents duplicate payment and shows an appropriate message.
5. **Given** a signed-in recipient viewing a pending request, **When** a system error occurs during payment processing, **Then** the request remains in "pending" state, no balances change, and the user sees a clear error message.

---

### User Story 3 — View and Manage Requests via Dashboard (Priority: P3)

A signed-in user opens their dashboard to see all payment requests they are involved in. The dashboard has two views: incoming requests (money requested from them) and outgoing requests (money they have requested from others). Each entry shows the amount, counterparty, note preview, created date, status, and expiration information when relevant. The user can search and filter requests to find specific ones.

**Why this priority**: The dashboard is the central hub for all request management. Without it, users cannot discover, track, or act on requests. It provides orientation and control.

**Independent Test**: Can be tested by creating several requests in various states, then verifying the dashboard displays them correctly in the appropriate tab (incoming vs. outgoing) with accurate details, and that search and filter produce correct results.

**Acceptance Scenarios**:

1. **Given** a signed-in user with both incoming and outgoing requests, **When** they open the dashboard, **Then** they see separate views for incoming and outgoing requests, each showing amount, counterparty, note preview, created date, status, and expiration information for requests nearing expiration.
2. **Given** a signed-in user with requests in multiple statuses, **When** they filter by a specific status, **Then** only requests matching that status are displayed.
3. **Given** a signed-in user, **When** they search by counterparty name, email, or phone, **Then** matching requests are displayed.
4. **Given** a signed-in user with no requests, **When** they open the dashboard, **Then** they see a meaningful empty state with guidance on how to get started.

---

### User Story 4 — View Request Details and Take Action (Priority: P4)

A signed-in user opens a specific request to see its full details: amount, note, sender, recipient, created timestamp, current status, and expiration countdown or state. Depending on their role and the request status, they see available actions. A recipient of a pending request can pay or decline. A requester of a pending request can cancel. Non-pending requests are displayed in a read-only state.

**Why this priority**: The detail view is where all lifecycle actions happen. It is the gateway to pay, decline, and cancel — making it essential for completing the core flows.

**Independent Test**: Can be tested by opening a pending request as different roles (requester vs. recipient) and verifying the correct action buttons appear, then opening non-pending requests and verifying they are read-only.

**Acceptance Scenarios**:

1. **Given** a signed-in recipient viewing a pending request, **When** they open the detail view, **Then** they see the full request details and options to pay or decline.
2. **Given** a signed-in requester viewing their own pending request, **When** they open the detail view, **Then** they see the full request details and an option to cancel.
3. **Given** a signed-in user viewing a paid, declined, canceled, or expired request, **When** they open the detail view, **Then** they see full details in a read-only state with no action buttons.
4. **Given** a pending request approaching its expiration, **When** a user views the detail, **Then** the expiration countdown is prominently displayed.

---

### User Story 5 — Connect a Mocked Bank Account (Priority: P5)

A signed-in user wants to connect a bank account to use as a funding source. They initiate the bank connection flow, go through a simulated connect experience, and upon completion have a usable mocked bank account with visible metadata (bank name, last four digits, balance). This bank account can then be used as a funding source for paying requests or topping up their wallet.

**Why this priority**: Bank connection is a prerequisite for bank-based payments and wallet top-ups. Without it, users are limited to wallet-only payments, which themselves require bank-funded top-ups to be useful beyond initial balances.

**Independent Test**: Can be tested by initiating the bank connection flow, completing it, and verifying the bank account appears in the user's funding sources with correct metadata and a usable balance.

**Acceptance Scenarios**:

1. **Given** a signed-in active user with no connected bank account, **When** they complete the mocked bank connection flow, **Then** a new bank account appears in their funding sources with bank name, masked account number, and balance.
2. **Given** a signed-in user who has not connected a bank account, **When** they attempt to pay with a bank account or top up their wallet from a bank, **Then** those options are unavailable with clear guidance to connect a bank first.

---

### User Story 6 — Top Up Wallet from Connected Bank (Priority: P6)

A signed-in user with a connected mocked bank account wants to add funds to their wallet. They initiate the top-up flow, enter an amount, select their connected bank account, and confirm. The system validates the bank has sufficient balance, transfers the amount from the bank to the wallet atomically, and confirms success.

**Why this priority**: Wallet top-up gives users the ability to build a wallet balance, which is one of the two funding sources for paying requests. It completes the funding lifecycle.

**Independent Test**: Can be tested by initiating a top-up with a valid amount from a connected bank with sufficient balance, then verifying the wallet balance increases and the bank balance decreases accordingly.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a connected bank account that has sufficient balance, **When** they top up their wallet with a positive amount, **Then** the wallet balance increases by that amount and the bank account balance decreases by that amount.
2. **Given** a signed-in user with a connected bank account, **When** they attempt to top up with an amount exceeding the bank balance, **Then** the system rejects the top-up with a clear insufficient funds message and no balances change.
3. **Given** a signed-in user with no connected bank account, **When** they attempt to top up, **Then** the option is unavailable with guidance to connect a bank account.

---

### User Story 7 — Pay a Request via Public Shareable Link as a Guest (Priority: P7)

A person who is not a registered PayMe user receives a shareable link to a payment request. They open the link in a browser and see a public request page showing the amount, requester information, note, current status, and expiration information. If the request is pending, they can pay through a guest mocked bank connection flow — they connect a bank account inline and complete payment. Guest users do not have access to wallet funding. If the request is already in a terminal state (paid, declined, canceled, expired), the page shows an appropriate read-only status.

**Why this priority**: This extends the product's reach beyond registered users, enabling anyone to fulfill a payment request. It is a key viral growth mechanism and a differentiator, but it is not required for the core registered-user loop.

**Independent Test**: Can be tested by generating a shareable link, opening it in an unauthenticated browser session, verifying the request details are visible, completing the guest bank connection and payment flow, and confirming the request becomes "paid."

**Acceptance Scenarios**:

1. **Given** a non-user opening a valid shareable link for a pending request, **When** they view the page, **Then** they see the request amount, requester info, note, status, and expiration information, plus an option to pay.
2. **Given** a non-user on the public request page for a pending request, **When** they complete the guest bank connection flow and confirm payment with sufficient bank balance, **Then** the request status changes to "paid" and the requester's wallet balance increases.
3. **Given** a non-user opening a shareable link for a request that is already paid, declined, canceled, or expired, **When** they view the page, **Then** they see the request details in a read-only state with a clear status indicator and no payment option.
4. **Given** a non-user on the public request page, **When** they attempt to pay through the guest flow and the bank has insufficient funds, **Then** the payment is rejected with a clear message and the request remains pending.
5. **Given** a non-user opening an invalid or non-existent shareable link, **When** they view the page, **Then** they see a clear "not found" message.

---

### User Story 8 — Decline or Cancel a Pending Request (Priority: P8)

A signed-in recipient of a pending request can decline it, and a signed-in requester can cancel their own pending request. Both actions move the request into a final, read-only state. Users cannot decline or cancel requests that are not pending. Invalid attempts are rejected gracefully.

**Why this priority**: Decline and cancel provide essential lifecycle control. Without them, unwanted requests would linger until expiration, creating a poor user experience. However, the core value (create + pay) works without these actions.

**Independent Test**: Can be tested by declining a pending incoming request as a recipient and canceling a pending outgoing request as a requester, then verifying each request reaches its terminal state and no further actions are available.

**Acceptance Scenarios**:

1. **Given** a signed-in recipient viewing a pending incoming request, **When** they decline it, **Then** the request status changes to "declined" and becomes read-only.
2. **Given** a signed-in requester viewing their own pending outgoing request, **When** they cancel it, **Then** the request status changes to "canceled" and becomes read-only.
3. **Given** a signed-in user viewing a request that is already paid, declined, canceled, or expired, **When** they attempt to decline or cancel, **Then** the system rejects the action gracefully with a clear message.
4. **Given** a signed-in recipient who declines a request, **When** they revisit the request, **Then** it is displayed as "declined" with no available actions.

---

### User Story 9 — Request Expiration (Priority: P9)

Pending payment requests automatically expire after a defined duration (7 days from creation). When a request expires, it moves to the "expired" state and can no longer be paid, declined, or canceled. Expiration state is clearly visible in both the dashboard and detail views. Requests approaching expiration display a countdown to help users act before the deadline.

**Why this priority**: Expiration prevents indefinite obligation and keeps the request ecosystem clean. It is a business rule that protects both parties but is lower priority because the core flows work without it initially.

**Independent Test**: Can be tested by creating a request, advancing past the expiration period, and verifying the request status is "expired" and all actions are rejected.

**Acceptance Scenarios**:

1. **Given** a pending request that has reached its expiration time, **When** the system evaluates the request, **Then** the request status becomes "expired."
2. **Given** an expired request, **When** a user or guest attempts to pay, decline, or cancel it, **Then** the system rejects the action with a clear "request expired" message.
3. **Given** a pending request nearing expiration, **When** a user views it on the dashboard or detail page, **Then** the expiration countdown is clearly displayed.
4. **Given** an expired request, **When** a non-user opens its shareable link, **Then** they see the request in a read-only expired state with no payment option.

---

### Edge Cases

- **Recipient is the same user as the sender**: The system must prevent a user from creating a request to their own email or phone, even if they have both an email and a phone and use the alternate contact.
- **Recipient contact matches a registered user**: If the recipient email or phone matches a registered user, the request should appear in that user's incoming requests on their dashboard. Matching is performed dynamically at query time (lazy), not stored as a resolved user ID at creation.
- **Recipient contact does not match any registered user**: The request is still created with a shareable link. If the recipient later registers with that contact, the request automatically appears in their incoming dashboard because matching is lazy — no backfill or migration is needed.
- **Concurrent payment attempts**: If two parties (e.g., the registered recipient and a guest via the public link) attempt to pay the same request simultaneously, only one payment must succeed. The second must be rejected gracefully.
- **Payment request created while recipient is already viewing their dashboard**: The new request should be discoverable on refresh or next navigation to the dashboard.
- **User loses connectivity during payment**: The payment must either complete fully or not at all. The user should be able to return and see the actual state of the request.
- **Amount at boundary values**: Requests for very small amounts (e.g., $0.01) and very large amounts must be handled. The system should enforce a minimum of $0.01 and a reasonable maximum for MVP purposes.
- **Note field with special characters or maximum length**: The note field must handle Unicode and enforce a maximum character length gracefully.
- **Expired request with in-flight payment**: If a request expires while a user is on the payment confirmation screen, the payment submission must be rejected with a clear expiration message.
- **Multiple bank accounts**: For MVP, users can connect one mocked bank account. Connecting a new one replaces the existing one.
- **Signed-in user opens public shareable link**: If a signed-in user opens a public shareable link for a request where they are the recipient, the system redirects them to the authenticated detail view (providing wallet funding and full dashboard context).
- **Shareable link guessing/enumeration**: Public shareable links must use non-guessable identifiers to prevent unauthorized access to request details.
- **Inactive user attempts restricted actions**: Any attempt by an inactive user to create a request, pay, top up, or perform other restricted actions must be blocked with clear feedback.

## Requirements *(mandatory)*

### Functional Requirements

**User Identity and Contacts**

- **FR-001**: The system MUST allow users to have an email address, a phone number, or both.
- **FR-002**: The system MUST require every user to have at least one of email or phone.
- **FR-003**: The system MUST enforce uniqueness of email addresses across all users when email is present.
- **FR-004**: The system MUST enforce uniqueness of phone numbers across all users when phone is present.
- **FR-005**: The system MUST restrict request creation, payment, and wallet top-up to active users only, providing clear feedback when an inactive user attempts a restricted action.

**Create Payment Request**

- **FR-006**: The system MUST allow a signed-in active user to create a payment request by specifying a recipient contact type (email or phone), a recipient contact value, an amount, and an optional note.
- **FR-007**: The system MUST validate that the recipient contact matches a valid email or phone format depending on the chosen type.
- **FR-008**: The system MUST validate that the request amount is greater than zero.
- **FR-009**: The system MUST reject requests where the sender's own email or phone is used as the recipient.
- **FR-010**: The system MUST generate a unique, non-guessable shareable public link for each created request.
- **FR-011**: The system MUST create new requests in the "pending" status.

**Request Lifecycle**

- **FR-012**: The system MUST support the following request statuses: pending, paid, declined, canceled, and expired.
- **FR-013**: The system MUST enforce valid status transitions only: pending may transition to paid, declined, canceled, or expired. All other transitions are forbidden.
- **FR-014**: The system MUST reject any action (pay, decline, cancel) on a request that is not in "pending" status, providing a clear reason.

**Dashboard**

- **FR-015**: The system MUST provide signed-in users with a dashboard showing incoming requests (where they are the recipient, matched dynamically by contact) and outgoing requests (where they are the requester).
- **FR-016**: The system MUST display for each request entry: amount, counterparty, note preview, created date, status, and expiration information when the request is pending and nearing expiration.
- **FR-017**: The system MUST allow users to search requests by counterparty information.
- **FR-018**: The system MUST allow users to filter requests by status.

**Request Detail**

- **FR-019**: The system MUST provide a detail view for each request showing: amount, note, sender, recipient, created timestamp, current status, and expiration countdown (for pending requests) or expiration state.
- **FR-020**: The system MUST show pay and decline actions to the recipient of a pending request.
- **FR-021**: The system MUST show a cancel action to the requester of their own pending request.
- **FR-022**: The system MUST display non-pending requests in a read-only state with no action controls.

**Payment Fulfillment (Signed-In Users)**

- **FR-023**: The system MUST allow a signed-in recipient to pay a pending request using either their wallet balance or a connected mocked bank account.
- **FR-024**: The system MUST require explicit selection of a funding source before payment.
- **FR-025**: The system MUST validate that the selected funding source is active and has sufficient balance before processing payment.
- **FR-026**: The system MUST update the request status to "paid" and adjust all affected balances upon successful payment as an atomic operation.
- **FR-027**: The system MUST credit the requester's wallet balance when a request is paid.
- **FR-028**: The system MUST prevent duplicate payment submissions for the same request.
- **FR-029**: The system MUST ensure that a failed payment attempt leaves the request in "pending" status and all balances unchanged.

**Wallet**

- **FR-030**: The system MUST maintain a wallet balance for each signed-in user.
- **FR-031**: The system MUST allow wallet balance to be used as a funding source for paying requests.
- **FR-032**: The system MUST reflect incoming payment funds in the requester's wallet balance.
- **FR-033**: The system MUST allow users to add funds to their wallet through a top-up flow using a connected mocked bank account.
- **FR-034**: The system MUST validate sufficient bank balance before processing a wallet top-up.
- **FR-035**: The system MUST process wallet top-ups atomically — either the bank balance decreases and wallet balance increases, or neither changes.

**Mock Bank Connection**

- **FR-036**: The system MUST allow a signed-in user to connect a mocked bank account through a simulated connection flow.
- **FR-037**: The system MUST provide visible bank metadata for connected accounts: bank name, masked account number, and balance.
- **FR-038**: The system MUST make bank-based payment and bank-based wallet top-up unavailable when no bank account is connected, with clear guidance to connect one.

**Public Shareable Payment Page**

- **FR-039**: The system MUST make each request's shareable link accessible without authentication.
- **FR-040**: The system MUST display on the public page: amount, requester information, note, current status, and expiration information.
- **FR-041**: The system MUST allow non-users to pay a pending request through a guest mocked bank connection flow on the public page.
- **FR-042**: The system MUST NOT offer wallet funding to guest users on the public page.
- **FR-043**: The system MUST display an appropriate read-only state on the public page when the request is paid, declined, canceled, expired, or not found.
- **FR-043a**: The system MUST apply IP-based rate limiting on guest payment submission and guest bank connection endpoints to prevent abuse.
- **FR-043b**: The system MUST redirect a signed-in user who opens a public shareable link for a request where they are the recipient to the authenticated request detail view.

**Decline and Cancel**

- **FR-044**: The system MUST allow the recipient of a pending request to decline it, transitioning the status to "declined."
- **FR-045**: The system MUST allow the requester of a pending request to cancel it, transitioning the status to "canceled."
- **FR-046**: The system MUST treat declined and canceled as final, read-only states.
- **FR-047**: The system MUST reject invalid decline or cancel attempts (wrong role, wrong status) with a clear message.

**Expiration**

- **FR-048**: The system MUST expire pending requests after 7 days from creation.
- **FR-049**: The system MUST reject all state-changing actions (pay, decline, cancel) on expired requests with a clear "request expired" message.
- **FR-050**: The system MUST display expiration state and countdown information in dashboard and detail views.

**Reliability and Audit**

- **FR-051**: The system MUST generate audit log entries for all critical business actions: request creation, payment, decline, cancel, expiration, balance changes, and bank connection events.
- **FR-052**: The system MUST include actor, action, target resource, timestamp, and outcome in each audit log entry.
- **FR-053**: The system MUST ensure that failed actions leave the previous valid state intact — no partial updates.
- **FR-054**: The system MUST provide clear success and error feedback for all critical user actions.

**UX Requirements**

- **FR-055**: The system MUST be fully usable across mobile and desktop screen sizes with a responsive layout.
- **FR-056**: All critical flows MUST include intentional loading, success, error, empty, and disabled states.
- **FR-057**: Funding source selection, request status, and expiration information MUST always be clearly presented when relevant.
- **FR-058**: The system MUST enforce a minimum request amount of $0.01 and a reasonable maximum amount per request.
- **FR-059**: The system MUST enforce a maximum character length for the request note field.

### Key Entities

- **User**: A person with an account in the system. Has at least one of email or phone (both may be present). Has an active/inactive status. Has a wallet balance. May have a connected mocked bank account.
- **Payment Request**: A record representing a request for money from one party to another. Contains: requester, recipient contact (email or phone), recipient type, amount (in minor currency units), optional note, status (pending/paid/declined/canceled/expired), creation timestamp, expiration timestamp, and a unique shareable link identifier.
- **Wallet**: A balance associated with a user. Receives funds when the user is paid or tops up. Decreases when used as a funding source for payments. Balance is always non-negative.
- **Mocked Bank Account**: A simulated external bank account connected by a user. Contains bank metadata (name, masked account number) and a simulated balance. Used as a funding source for payments and wallet top-ups.
- **Transaction**: A record of a financial movement — payment fulfillment, wallet top-up, or balance adjustment. Links to the originating action (payment request, top-up) and captures amounts, funding source, timestamp, and outcome.
- **Audit Log Entry**: A structured record of a critical business action. Contains actor, action type, target resource, timestamp, and outcome (success/failure with reason).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a payment request and receive a shareable link in under 30 seconds from opening the form.
- **SC-002**: A signed-in recipient can complete a payment from the request detail view in under 60 seconds, including funding source selection.
- **SC-003**: A guest user can complete a payment via the public shareable link (including the guest bank connection flow) in under 90 seconds.
- **SC-004**: 100% of payment, top-up, and state-transition operations are atomic — no partial state is ever visible to users.
- **SC-005**: All critical user flows (create, pay, decline, cancel, top-up, connect bank) provide clear feedback within 3 seconds of user action.
- **SC-006**: The dashboard loads and displays request data within 3 seconds for users with up to 500 requests.
- **SC-007**: 100% of critical business actions are captured in audit logs with complete actor, action, target, timestamp, and outcome information.
- **SC-008**: All critical user journeys are fully functional on viewports as small as 320px wide (mobile) through large desktop screens.
- **SC-009**: Expired requests are correctly identified and blocked from all state-changing actions with zero exceptions.
- **SC-010**: Duplicate payment submissions for the same request result in exactly one successful payment, with no double-charges or inconsistent balances.

## Non-Goals

The following are explicitly out of scope for this MVP to prevent over-scoping:

- **Real payment processing**: All bank connections and balances are mocked. No real money movement or integration with real payment processors.
- **User registration and authentication flows**: This spec assumes user identity exists. The registration, login, password reset, and session management flows are separate features.
- **Push notifications or email notifications**: Users will not receive real-time notifications about incoming requests, payments, or expirations for MVP. They discover updates by visiting the dashboard.
- **Multi-currency support**: The MVP supports a single currency (USD). Currency conversion and multi-currency wallets are out of scope.
- **Multiple bank accounts per user**: For MVP, a user may connect one mocked bank account. Multi-bank management is out of scope.
- **Partial payments**: A request must be paid in full. Splitting payments across multiple funding sources or paying a portion of the requested amount is not supported.
- **Recurring or scheduled requests**: All requests are one-time. Scheduled or recurring payment requests are out of scope.
- **Social features**: Comments, reactions, or social feeds related to payment requests are not included.
- **Admin panel or back-office tools**: Administrative views for managing users, requests, or resolving disputes are out of scope.
- **Dispute resolution**: There is no mechanism for disputing a payment or requesting a refund in the MVP.
- **Accessibility beyond responsive design**: While the MVP must be responsive, full WCAG 2.1 AA compliance auditing is not in scope (best-effort accessibility is expected).
- **Internationalization/localization**: The MVP is English-only with USD formatting.

## Assumptions

- **Authentication exists**: Users are assumed to already have a way to sign in. This spec does not define how authentication works — only that the system can identify the current user and their active/inactive status.
- **Single currency (USD)**: All monetary values are in US dollars. Amounts are stored as integer cents (minor units) per the project constitution.
- **Expiration period of 7 days**: Pending requests expire 7 days after creation. This is a common default in peer-to-peer payment products and provides reasonable time for recipients to act.
- **One mocked bank account per user**: For MVP simplicity, each user may have at most one connected mocked bank account. Connecting a new one replaces the existing one.
- **Wallet starts at zero**: New users have a wallet balance of $0.00 by default. They can receive funds from paid requests or top up from a connected bank.
- **Mocked bank accounts have a predefined balance**: The simulated bank connection flow creates an account with a predetermined balance (e.g., $10,000.00) to enable realistic payment and top-up demonstrations.
- **Guest payments are immediate**: Guest payments via the public page are processed the same way as signed-in user payments — atomically and immediately. The guest bank connection is a one-time inline flow.
- **Requester info on public page is limited**: The public shareable page shows the requester's display name (or first name) but does not expose their full email or phone number for privacy.
- **No real-time updates**: The dashboard and detail views reflect state at page load or on explicit refresh. Real-time push updates (WebSockets, SSE) are not required for MVP.
- **Note field maximum length**: The optional note on a payment request is limited to 250 characters.
- **Maximum request amount**: For MVP, individual requests are capped at $10,000.00 to prevent abuse in the demo context.
- **Request visibility rules**: A user can only see requests where they are the requester or the recipient (matched by email or phone). The public shareable link is the only way for others to view a specific request.
