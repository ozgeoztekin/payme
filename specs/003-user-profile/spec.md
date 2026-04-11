# Feature Specification: User Profile

**Feature Branch**: `003-user-profile`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Add a Profile feature to PayMe as a responsive web app capability for authenticated users."

## Clarifications

### Session 2026-04-12

- Q: Should successful phone-number add and logout produce audit log entries consistent with product-wide critical-action auditing? → A: Yes — audit **phone add** and **logout** (actor, action, target, timestamp, outcome).
- Q: Should inactive users be able to use the Profile page and add a phone? → A: Inactive users **may view** Profile (read-only details and logout) but **cannot** add a phone; show a clear explanation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Profile Information (Priority: P1)

A signed-in user navigates to the Profile tab from the main app navigation. The Profile page displays their current email address in a read-only format and their phone number if one is on file, also read-only once saved. If no phone number exists, the page clearly indicates that no phone number has been added yet. The user can see their identity details at a glance; email and any saved phone number are shown for review only.

**Why this priority**: Viewing profile information is the foundational action of the Profile feature. Every other profile capability — adding a phone (when missing), logging out — depends on the user first being able to see their current account state. It delivers immediate, standalone value: a user can confirm their identity details.

**Independent Test**: Can be fully tested by signing in, navigating to the Profile tab, and verifying the email is displayed as read-only and the phone number (or its absence) is shown correctly.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an email and a phone number on file, **When** they navigate to the Profile tab, **Then** they see their email and phone number displayed read-only.
2. **Given** an **active** signed-in user with an email but no phone number, **When** they navigate to the Profile tab, **Then** they see their email displayed as read-only and a clear indication that no phone number is on file, with an option to add one.
3. **Given** a signed-in user, **When** they view the Profile page, **Then** the email field is not editable.
4. **Given** an **inactive** signed-in user with an email but no phone number, **When** they navigate to the Profile tab, **Then** they see their email as read-only, see that no phone is on file, **do not** have a usable add-phone path, and see a clear message that adding a phone is unavailable while the account is inactive.

---

### User Story 2 — Add a Phone Number (Priority: P2)

An **active** signed-in user who does not yet have a phone number on file can add one from the Profile page. They enter a phone number, the system validates it for correct format and uniqueness across all users, and on success the new phone number appears immediately on the Profile page in read-only form. If validation fails or the number is already in use by another user, the user receives clear feedback and no data changes.

**Why this priority**: Adding a phone number expands the user's identity, making them discoverable by phone for incoming payment requests. It is the only profile data write action in this MVP besides logout and enables the payment request matching system to reach more users.

**Independent Test**: Can be tested by navigating to the Profile page as an **active** user without a phone number, entering a valid unique phone number, saving, and verifying the phone number is displayed on the Profile page as read-only.

**Acceptance Scenarios**:

1. **Given** an **active** signed-in user with no phone number, **When** they enter a valid, unique phone number and save, **Then** the phone number is saved and displayed immediately on the Profile page with a success confirmation, and it remains read-only on the page afterward.
2. **Given** an **active** signed-in user with no phone number, **When** they enter a phone number that fails format validation, **Then** the system displays a clear validation error, and no phone number is saved.
3. **Given** an **active** signed-in user with no phone number, **When** they enter a phone number that is already in use by another user, **Then** the system displays a clear error indicating the number is unavailable, and no phone number is saved.
4. **Given** an **active** signed-in user with no phone number, **When** the save operation is in progress, **Then** the save action is disabled and a loading indicator is shown.
5. **Given** an **active** signed-in user with no phone number, **When** they successfully save a valid, unique phone number, **Then** the system records an audit log entry for that successful add with actor, action, target, timestamp, and outcome.
6. **Given** an **inactive** signed-in user with no phone number, **When** they attempt to add a phone number (including via any client that calls the same save path), **Then** the system rejects the attempt with a clear inactive-account message and does not save a phone number.

---

### User Story 3 — Log Out (Priority: P3)

A signed-in user can log out from the Profile page. The logout action ends their authenticated session and redirects them to the login page. After logout, the user can no longer access protected pages without signing in again.

**Why this priority**: Logout is a core security and session management action. While it does not involve profile data editing, it is essential for users who share devices, want to switch accounts, or need to end their session intentionally. It completes the Profile page as a self-service identity hub.

**Independent Test**: Can be tested by navigating to the Profile page, triggering the logout action, verifying redirection to the login page, and confirming that attempting to access a protected page results in a redirect to login.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Profile page, **When** they trigger the logout action, **Then** their authenticated session is ended and they are redirected to the login page.
2. **Given** a user who has just logged out, **When** they attempt to navigate to any protected page (e.g., dashboard, wallet, profile), **Then** they are redirected to the login page.
3. **Given** a signed-in user on the Profile page, **When** they trigger the logout action and it completes, **Then** the transition to the login page is immediate and no protected content is momentarily visible.
4. **Given** a signed-in user on the Profile page, **When** they successfully complete logout, **Then** the system records an audit log entry for that logout with actor, action, target, timestamp, and outcome.

---

### User Story 4 — Unauthenticated Access Prevention (Priority: P4)

An unauthenticated user who attempts to access the Profile page directly (e.g., by entering the URL) is redirected to the login page. The Profile page and its data are never visible to unauthenticated users.

**Why this priority**: Access control is a baseline security requirement. While it is not a user-initiated action, it ensures the Profile feature does not introduce unauthorized data exposure. It is lower priority because it is enforced by the existing authentication system rather than new Profile-specific logic.

**Independent Test**: Can be tested by opening the Profile page URL in an unauthenticated browser session and verifying the user is redirected to the login page without seeing any profile data.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they attempt to access the Profile page URL directly, **Then** they are redirected to the login page.
2. **Given** an unauthenticated user, **When** they are redirected to login from the Profile page, **Then** no profile data is exposed during the redirect.

---

### Edge Cases

- **User already has a phone number**: The Profile page shows the number as read-only and does not surface an add flow or a remove control for it in this MVP.
- **Inactive user without a phone**: The Profile page remains viewable; the add-phone flow is not available, with a clear explanation tied to account status. Server-side enforcement must match the UI.
- **User attempts to remove their only identifier**: If a user has only a phone number (no email) and any future flow allowed clearing it, the system must reject removal and explain that at least one identifier is required. In this MVP, the Profile page does not offer phone removal.
- **Concurrent phone number claim**: If two users attempt to save the same phone number at the same time (each adding their first number), only one should succeed. The other must receive a clear "number already in use" error with no partial state change.
- **Phone number format edge cases**: Numbers with leading/trailing whitespace, country code variations, or special characters must be handled by validation. The system should normalize input before uniqueness checks.
- **Session expiration while adding a phone**: If the user's session expires while they are entering or saving a new phone number, the save attempt must fail gracefully with a redirect to login rather than silently losing changes or producing an unhandled error.
- **Rapid repeated save attempts**: If a user clicks save multiple times in quick succession during add, the system must prevent duplicate submissions. Only one save should be processed.
- **Logout while a phone save is in progress**: If a user triggers logout while a phone number save is still processing, the system should handle the race gracefully. The save may succeed or fail, but the user should end up logged out and redirected to login with no inconsistent state.
- **Browser back button after logout**: If a user presses the browser back button after logging out, they must not see cached profile data. They should be redirected to the login page.

## Requirements *(mandatory)*

### Functional Requirements

**Profile Access and Navigation**

- **FR-001**: The system MUST provide a Profile tab in the main app navigation accessible to signed-in users.
- **FR-002**: The system MUST redirect unauthenticated users who attempt to access the Profile page to the login page.
- **FR-003**: The system MUST NOT display any profile data to unauthenticated users during the redirect.

**Profile Information Display**

- **FR-004**: The system MUST display the signed-in user's email address on the Profile page in a read-only format.
- **FR-005**: The system MUST display the signed-in user's phone number on the Profile page if one exists, in read-only form.
- **FR-006**: The system MUST clearly indicate when no phone number is on file. When the signed-in user’s account is **active** and no phone exists, the system MUST provide an option to add one. When the account is **inactive** and no phone exists, the system MUST NOT provide a usable add-phone path and MUST explain that adding a phone is unavailable while inactive.
- **FR-007**: The email address MUST NOT be editable on the Profile page in this MVP.

**Add Phone Number**

- **FR-008**: The system MUST allow a signed-in **active** user without a phone number to add one from the Profile page.
- **FR-009**: The system MUST validate the phone number format before saving.
- **FR-010**: The system MUST enforce uniqueness of the phone number across all users.
- **FR-011**: The system MUST display the newly saved phone number immediately on the Profile page upon successful save.
- **FR-012**: The system MUST display a clear success confirmation after a phone number is saved.

**Saved Phone Number (read-only)**

- **FR-013**: The Profile page MUST display a saved phone number read-only and MUST NOT expose any Profile control that modifies or removes it in this MVP.
- **FR-014**: The system MUST reject any server-side attempt to overwrite or clear a user's saved phone number through profile-update paths intended for this feature, preserving the existing number.

**Identity Integrity**

- **FR-015**: The system MUST ensure that a user always has at least one identifier (email, phone, or both).
- **FR-016**: The system MUST NOT allow a user to remove or clear their phone number if it is their only identifier (enforced on any supported mutation paths).
- **FR-017**: The system MUST display a clear message explaining why a removal or clearing action is blocked when identity integrity would be violated (if such an action is ever exposed).

**Logout**

- **FR-018**: The system MUST provide a logout action on the Profile page.
- **FR-019**: The system MUST end the authenticated session when the user triggers logout.
- **FR-020**: The system MUST redirect the user to the login page after logout.
- **FR-021**: The system MUST prevent access to all protected pages after logout until the user authenticates again.

**Validation and Reliability**

- **FR-022**: The system MUST validate all profile updates on the backend regardless of any client-side validation.
- **FR-023**: The system MUST NOT partially change user data when a save fails — either the add succeeds fully or no phone data changes.
- **FR-024**: The system MUST prevent duplicate submission of phone number save requests (e.g., rapid repeated clicks).
- **FR-025**: The system MUST provide clear success feedback after a successful phone number save.
- **FR-026**: The system MUST provide clear error feedback for failed phone number saves, including specific reasons (invalid format, number already in use, identity integrity violation, inactive account).

**UX Requirements**

- **FR-027**: The Profile page MUST be fully usable across mobile and desktop screen sizes with a responsive layout.
- **FR-028**: The Profile page MUST clearly separate read-only information (email; saved phone when present) from the add-phone flow (shown only when no phone is on file **and** the account is **active**).
- **FR-029**: The phone number add flow MUST include intentional loading, success, error, and disabled states.
- **FR-030**: The logout action MUST provide a clear, reliable user experience with no ambiguous intermediate states.

**Audit**

- **FR-031**: When a user successfully adds a phone number through the Profile flow, the system MUST write an audit log entry including actor, action type, target (the user’s identity profile), timestamp, and outcome (success).
- **FR-032**: When a user completes logout from the Profile page and the session ends successfully, the system MUST write an audit log entry including actor, action type, target (the ended session or equivalent resource), timestamp, and outcome (success).

**Account activity (active vs inactive)**

- **FR-033**: Signed-in users whose accounts are **inactive** MUST still be allowed to access the Profile page to view read-only identity information and to log out.
- **FR-034**: The system MUST validate account active state on the server for every phone-number add and MUST reject attempts from inactive users with clear feedback and no change to stored phone data.

### Key Entities

- **User Profile**: The identity record for a signed-in user. Contains an email address (always present, read-only in this feature), an optional phone number (read-only once saved), the user’s **account activity state** (active or inactive, as used elsewhere in the product), and authentication/session state. A user must always have at least one identifier (email or phone).
- **Phone Number**: A contact identifier associated with a user. Must be in a valid format and unique across all users. May be added once from the Profile page when none exists; once saved, it is shown read-only on Profile in this MVP with no Profile mutation path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can view their profile information within 2 seconds of navigating to the Profile tab.
- **SC-002**: An **active** user without a phone number can add one in under 30 seconds from initiating the action to seeing the confirmed result.
- **SC-003**: 100% of invalid or duplicate phone number submissions during add are rejected with clear, specific feedback and no data changes.
- **SC-004**: 100% of logout actions successfully end the session and redirect to the login page, with no protected content accessible afterward.
- **SC-005**: The Profile page is fully functional on viewports as small as 320px wide through large desktop screens.
- **SC-006**: Identity integrity is preserved in 100% of profile scenarios — no user is ever left without at least one identifier.
- **SC-007**: Phone add and logout actions provide visible feedback (loading, success, or error) within 3 seconds of user action.
- **SC-008**: 100% of successful phone number additions from the Profile page and 100% of successfully completed Profile logouts produce an audit log entry that includes actor, action, target, timestamp, and outcome.

## Non-Goals

The following are explicitly out of scope for this MVP to prevent over-scoping:

- **Removing a saved phone number from the Profile page**: No UI or Profile flow to clear phone in this MVP.
- **Email editing**: The email address is displayed as read-only. Changing email requires a separate feature with verification flows.
- **Profile photo or avatar**: No image upload or avatar management is included.
- **Display name editing**: Users cannot change a display name or username from the Profile page in this MVP.
- **Account deletion**: Users cannot delete their account from the Profile page.
- **Password or credential management**: Changing passwords, managing two-factor authentication, or other credential actions are not part of this feature.
- **Phone number verification via SMS/OTP**: Phone numbers are validated for format and uniqueness but are not verified via a sent code in this MVP.
- **Notification preferences**: No settings for managing email or push notification preferences.
- **Privacy or data export settings**: No GDPR-style data export or privacy controls are included.
- **Linked accounts or social logins**: No management of linked OAuth providers or social accounts.
- **Activity history or login sessions**: No display of recent login activity or active sessions management.

## Assumptions

- **Authentication exists**: The existing authentication system is reused. This feature does not define login, registration, or session management mechanics — only that it can identify the current user and end their session on logout.
- **Account activity matches existing product rules**: **Active** vs **inactive** account state is the same concept used for restricted actions elsewhere (e.g., payment flows in spec 001). Inactive users may use Profile for viewing and logout but not for adding a phone.
- **Email is always present**: Every user in the system has an email address. This is the primary identifier established during registration. The Profile page relies on this invariant.
- **Phone number format**: Phone numbers are validated using a standard format (e.g., E.164 international format). The specific validation rules are defined by the existing product phone validation logic established in the payment request feature (FR-004 of spec 001).
- **Phone number normalization**: The system normalizes phone numbers before uniqueness checks to prevent near-duplicates (e.g., stripping whitespace, standardizing country codes).
- **No real-time updates**: The Profile page reflects state at page load. If the user's profile is modified from another session, the changes appear on the next page load or navigation.
- **Logout is immediate**: Logout ends the session on the backend and redirects the client. There is no confirmation dialog before logout — the action is immediate upon trigger.
- **Existing navigation structure**: The Profile tab is added to the existing main app navigation alongside existing tabs (Dashboard, Wallet, etc.).
