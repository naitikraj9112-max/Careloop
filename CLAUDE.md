# CareLoop --- Claude Code Project Instructions

> **Product:** CareLoop --- Intelligent Elderly Care & Medication
> Management Platform\
> **Tagline:** Beyond Reminders. Towards Connected Care.\
> **Project context:** Solo-level hackathon prototype for the "Elderly
> Care & Medication Management Platform" challenge.\
> **Primary objective:** Build a reliable, secure, accessible,
> demonstrable product. Prioritize working end-to-end flows over a large
> number of incomplete features.

This file is the project-wide instruction set for Claude Code. Read it
before making changes. Keep it updated when major architectural
decisions change.

------------------------------------------------------------------------

## 1. Product Vision

CareLoop connects an elderly person with their authorized family members
and caretakers through a shared healthcare profile. It supports
medication scheduling, dose acknowledgement, caregiver escalation,
appointment management, care coordination and AI-assisted access to
verified records.

CareLoop is **not** merely a reminder application. Its central
differentiator is a closed-loop care workflow:

1.  A medication dose is scheduled.
2.  The system sends a reminder.
3.  The elderly person or an authorized caretaker records an outcome.
4.  If no acknowledgement is received within a configured grace period,
    the dose is marked **Unacknowledged**.
5.  The system notifies the designated caregiver.
6.  The caregiver follows up and records the outcome.
7.  Authorized family members can see the updated event and its history.

Never claim that a medicine was swallowed solely because a notification
was delivered, a button was tapped, or a pillbox compartment was opened.

## 2. Core Product Principles

-   **Elderly autonomy:** Keep the elderly person at the centre of their
    healthcare decisions.
-   **Shared care, separate identities:** Every family member and
    caretaker uses an independent account. Never implement shared
    credentials.
-   **Least privilege:** Users see and change only the patient
    information they have been explicitly authorized to access.
-   **Truthful adherence status:** Distinguish confirmed reports from
    missing information and physical interaction signals.
-   **Human oversight:** AI-extracted prescription data must be reviewed
    before it becomes an active medication schedule.
-   **Safety before novelty:** Do not invent medical advice, diagnoses,
    dosage changes or missed-dose instructions.
-   **Accessible by default:** Large controls, readable text, high
    contrast, simple navigation and clear language.
-   **Reliable backend workflows:** Medication scheduling and escalation
    must not depend on a browser tab remaining open.
-   **Demonstrable quality:** Implement tests for critical flows and
    security boundaries, not just attractive screens.

## 3. Target Roles

### Elderly person --- Primary user

Can view their own schedule, acknowledge or report a dose, snooze a
reminder, view appointments, access their timeline and use emergency
assistance. They should be able to understand and control who has access
to their information, subject to the application's consent and
authorization model.

### Family administrator

Can manage a patient profile, invite and remove members, configure
permissions, manage medication schedules and appointments, monitor
adherence events and receive configured alerts.

### Caretaker

Can access only assigned patients and permitted information. Can view
assigned schedules, record administration or reported outcomes, report
missed doses and complete handovers.

### Doctor --- Optional future role

Can view only explicitly authorized records and add permitted
appointment notes or prescription documents. Do not build a full
clinical workflow unless the core MVP is complete.

Roles are not a substitute for per-patient membership checks. A user may
have different roles for different patients.

## 4. MVP Scope and Priority

### P0 --- Must work end to end

1.  Authentication and account management.
2.  Patient profile creation.
3.  Independent user accounts and invitation-based CareCircle
    membership.
4.  Backend-enforced role and patient-level authorization.
5.  Medication creation and recurring schedule management.
6.  Dose event generation and status tracking.
7.  Taken / Snooze / Skipped actions.
8.  Unacknowledged-dose detection.
9.  Caregiver notification/escalation.
10. Appointment creation and reminders.
11. Shared family/caretaker dashboard.
12. Audit history for sensitive actions.
13. Basic accessible and responsive interface.

### P1 --- Build after P0 is stable

-   Care Risk Radar for operational care gaps.
-   Healthcare activity timeline.
-   Caregiver handover.
-   Gemini-powered summaries grounded in authorized patient records.
-   Prescription OCR with human verification.

### P2 --- Stretch goals

-   Voice interaction and text-to-speech.
-   Emergency SOS with consent-based location sharing.
-   ESP32 / smart pillbox simulation or integration.
-   Doctor portal.
-   Regional language support.

Do not start P1 or P2 work while P0 contains broken flows, missing
authorization checks or untested critical logic.

## 5. Recommended Technology Direction

Use the stack already present in the repository if one exists and is
viable. Do not rewrite a working project merely to match this suggested
stack.

Preferred direction for a new implementation:

### Frontend

-   React
-   Vite
-   TypeScript
-   Tailwind CSS
-   Accessible component patterns and semantic HTML

### Identity and data

-   Firebase Authentication
-   Cloud Firestore
-   Firebase Cloud Messaging (FCM)

### Backend and scheduled work

-   TypeScript/Node.js or Python backend, selected consistently with the
    existing repository.
-   Google Cloud Run for backend deployment where needed.
-   Cloud Scheduler or a reliable scheduled-job mechanism for medication
    event processing.
-   Server-side validation and authorization for all sensitive
    operations.

### AI and document processing

-   Gemini API for constrained, grounded assistance and structured
    extraction.
-   OCR technology such as Google ML Kit or a suitable cloud OCR
    service.
-   Speech-to-text and text-to-speech only after the core experience is
    stable.

Do not add every Google service just to increase the technology count.
Use services where they solve a real product requirement and document
their purpose.

## 6. Architecture and Data Model

Prefer a simple, modular architecture over premature microservices.

Suggested Firestore collections (adapt to the repository's actual
schema):

``` text
users/{userId}
patients/{patientId}
caregiver_memberships/{membershipId}
medications/{medicationId}
medication_schedules/{scheduleId}
medication_events/{eventId}
appointments/{appointmentId}
health_observations/{observationId}
notifications/{notificationId}
caregiver_handovers/{handoverId}
audit_logs/{auditId}
```

### Important data relationships

-   A patient can have multiple memberships.
-   A user can belong to multiple patient CareCircles.
-   Each membership links `patientId` and `userId`, and stores role,
    permissions, status, invitation metadata and timestamps.
-   Medication schedules belong to a patient and a medication.
-   Medication events represent an individual scheduled occurrence and
    its outcome.
-   Notifications belong to a recipient and reference the relevant
    patient/event.
-   Audit entries identify the actor, action, target, patient and
    timestamp.

### Suggested medication event fields

-   `patientId`
-   `medicationId`
-   `scheduleId`
-   `scheduledAt`
-   `status`
-   `confirmationMethod`
-   `confirmedBy`
-   `confirmedAt`
-   `reportedOutcome`
-   `notes` (only if necessary; avoid unnecessary sensitive free text)
-   `createdAt`
-   `updatedAt`

Store timestamps consistently and preserve the patient's configured
timezone for schedule display and recurrence. Prevent duplicate dose
events when scheduled jobs retry.

## 7. Medication Status Semantics --- Mandatory

Use statuses with precise meanings. Do not collapse them into a single
boolean.

-   **Scheduled:** A dose occurrence exists for a future or current
    time.
-   **Reminder sent:** A reminder delivery attempt was recorded.
-   **Acknowledged:** The user interacted with the reminder, but has not
    necessarily reported taking the medicine.
-   **Taken --- self-reported:** The elderly person reports taking the
    dose.
-   **Taken --- caregiver-reported:** An authorized caretaker reports
    administering or observing the dose.
-   **Skipped:** The user reports intentionally skipping the dose. Do
    not infer the medical reason.
-   **Unacknowledged:** No acknowledgement was received within the
    configured grace period.
-   **Confirmed missed:** A user or authorized caretaker explicitly
    confirms the dose was not taken.
-   **Unverified interaction:** A physical signal, such as a pillbox
    compartment opening, occurred but ingestion is unknown.

Do not automatically convert **Unacknowledged** to **Confirmed missed**.
A lack of response is not proof of non-administration.

### Adherence metric

For a clearly defined reporting period:

`adherence percentage = confirmed taken doses / eligible scheduled doses × 100`

Show skipped, unacknowledged and unverified doses separately. Explain
the denominator and reporting period in the UI. Do not silently count
unknown outcomes as taken or missed.

## 8. Medication Reminder and Escalation Workflow

Implement this workflow on the backend:

1.  Generate a unique dose event for each scheduled occurrence.
2.  Trigger the reminder at the configured time.
3.  Record notification attempts and delivery status where available.
4.  Accept a user or caregiver outcome.
5.  Apply a configurable grace period.
6.  If still unacknowledged, mark the event **Unacknowledged**.
7.  Notify the designated caregiver according to patient preferences.
8.  If configured, escalate to another authorized contact after another
    interval.
9.  Stop further escalation when an outcome is recorded or the event is
    otherwise resolved.
10. Keep an audit trail.

Requirements: - Use idempotency keys or deterministic event IDs to avoid
duplicate events. - Make scheduled processing safe to retry. - Handle
timezone and daylight-saving changes correctly where relevant. - Do not
rely on frontend timers for critical scheduling. - Avoid alert storms;
deduplicate and rate-limit repeated notifications. - Do not provide
medical advice about what to do after a missed dose. Direct users to
their clinician or the prescription instructions.

## 9. Authentication, Authorization and Privacy

Security is a release blocker, not a later enhancement.

-   Authenticate every private request.
-   Enforce patient membership and permission checks on the backend.
-   Enforce Firestore security rules as a second layer.
-   Never trust a `patientId`, `role` or `userId` supplied by the client
    without verifying it against the authenticated identity and
    membership records.
-   Do not rely on hidden frontend buttons as authorization.
-   Verify invitation tokens, expiry and acceptance.
-   Revoke access promptly when membership is removed or disabled.
-   Keep secrets and service credentials out of source control and
    client bundles.
-   Use environment variables or managed secret storage.
-   Do not log passwords, access tokens, full prescriptions or
    unnecessary health information.
-   Record sensitive actions in an audit log.
-   Collect the minimum personal and health information required.
-   Obtain appropriate consent before sharing records or using external
    AI services.
-   Do not expose one patient's records to another patient's CareCircle.

For every data operation, ask: **Who is the authenticated actor, which
patient does this concern, what membership grants access, and does that
membership permit this exact action?**

## 10. AI and Prescription OCR Guardrails

Gemini may be used for: - Summarizing verified medication events and
appointments. - Answering questions about records the current user is
authorized to view. - Extracting candidate fields from prescription
images. - Producing a daily care activity summary.

Gemini must not: - Diagnose a condition. - Recommend, alter or infer
medication dosages. - Decide that a dose was taken. - Convert an
unacknowledged dose into a missed dose. - Modify an active medication
schedule without explicit authorized human confirmation. - Invent
missing prescription fields or claim certainty when OCR is unclear.

For prescription extraction: 1. Extract candidate medicine name, dosage,
frequency, timing and dates. 2. Preserve the original document reference
where permitted. 3. Show extracted fields for human review. 4. Flag
uncertain or missing fields. 5. Require an authorized user to confirm
before saving. 6. Record who confirmed the schedule and when.

AI responses must be grounded in the authorized patient's stored data.
If the data is missing, say so. Do not send more personal information to
the model than is necessary.

## 11. UX and Accessibility Requirements

-   Design mobile-first, responsive screens.
-   Use large, clearly labelled controls for primary actions.
-   Use readable font sizes and sufficient contrast.
-   Do not communicate status using colour alone; include text and/or
    icons.
-   Keep key actions reachable with minimal navigation.
-   Use plain language and avoid technical medical jargon.
-   Provide clear confirmation and error states.
-   Provide keyboard navigation and visible focus indicators.
-   Label form fields and buttons for assistive technology.
-   Provide a non-voice alternative for every voice action.
-   Show loading, offline and failed-notification states honestly.
-   Do not imply that a notification was received if only a send attempt
    is known.

## 12. Testing Requirements

Write tests alongside implementation. At minimum, cover:

### Authentication and membership

-   A new user can register and sign in.
-   An invited user cannot access a patient before invitation
    acceptance.
-   An authorized member can access permitted patient data.
-   A non-member cannot read or modify the patient's data.
-   A revoked member loses access.
-   A caretaker cannot perform family-admin-only actions.
-   A user with different roles across patients receives the correct
    permissions for each patient.

### Medication

-   A medication can be created and scheduled.
-   A dose event is generated at the correct local time.
-   A self-reported taken event records the actor and timestamp.
-   A caretaker-reported event records the caretaker as actor.
-   Snooze does not create a second dose.
-   Skipped and unacknowledged remain distinct.
-   An unacknowledged event triggers the configured escalation.
-   A confirmed outcome stops further escalation.
-   A retried scheduler does not create duplicate dose events or
    notifications.
-   Timezone boundaries and recurring schedules are tested.

### Appointments and notifications

-   Appointment creation and updates are authorized.
-   Reminders are generated at the expected times.
-   Duplicate jobs do not send duplicate alerts.
-   Notification failures are visible and retried safely.

### AI and OCR

-   AI answers only from authorized records.
-   Missing data is reported as missing.
-   OCR output cannot become an active schedule without human
    confirmation.
-   Prompt injection in uploaded text cannot override system rules or
    expose other records.

### Accessibility and resilience

-   Primary flows work on mobile viewport sizes.
-   Forms have labels and validation messages.
-   Keyboard navigation works.
-   Offline state is clear.
-   Failed network operations do not falsely show success.

Run the relevant test suite after changes. Do not claim tests pass
unless they were actually run.

## 13. UI Screens to Build

### Shared

-   Landing page
-   Registration and login
-   Invitation acceptance
-   Profile and account settings
-   Notification centre

### Elderly dashboard

-   Today's overview
-   Medication schedule
-   Dose confirmation screen
-   Upcoming appointments
-   Care timeline
-   Voice assistant (P2)
-   Emergency assistance (P2)

### Family dashboard

-   Patient overview
-   CareCircle members and invitations
-   Medication management
-   Adherence and unresolved events
-   Care Risk Radar
-   Appointment management
-   Activity timeline and audit history

### Caretaker dashboard

-   Assigned patients
-   Today's medication tasks
-   Record dose outcome
-   Report missed/uncertain dose
-   Care activities
-   Handover and pending tasks

## 14. Demo Scenario

Use fictional, clearly labelled demo data. Do not use real patient
information.

Suggested demonstration:

1.  A family administrator creates a fictional elderly patient profile.
2.  The administrator invites a second family member and a caretaker.
3.  Each person signs in with their own account.
4.  The administrator adds a medication and a recurring schedule.
5.  The elderly user's dashboard displays the next dose.
6.  Simulate a reminder.
7.  Leave the dose unacknowledged until the grace period expires.
8.  Show the caregiver escalation.
9.  The caretaker follows up and records the outcome.
10. Show the updated family dashboard and audit timeline.
11. Add an appointment and demonstrate its reminder.
12. Attempt unauthorized access and show that the backend denies it.

The demo must show real application state changes, not just static mock
screens.

## 15. Coding Rules for Claude Code

Before editing: 1. Inspect the repository structure, package scripts,
dependencies and existing implementation. 2. Identify the current
framework, routing, database and authentication approach. 3. Read
existing project documentation and environment examples. 4. Preserve
working code and existing conventions. 5. Propose a concise
implementation plan for substantial changes.

While editing: - Use TypeScript types or equivalent strict data
models. - Keep UI components, domain logic and data-access code
separated. - Reuse existing dependencies where reasonable. - Validate
all user input on the server as well as the client. - Handle loading,
empty, success and error states. - Keep functions small and
responsibilities clear. - Use consistent naming and formatting. - Add
tests for new business logic and authorization rules. - Avoid
placeholder buttons or fake success states. - Never hardcode secrets,
credentials or real patient data. - Do not introduce a dependency
without explaining why it is needed. - Do not silently change the
database schema or authorization model.

After editing: 1. Run linting and type checks where configured. 2. Run
relevant unit and integration tests. 3. Run the production build. 4.
Report exactly what was changed and which checks were run. 5. List any
incomplete work, assumptions, migration steps or manual setup required.

If a requirement is ambiguous, inspect the codebase first. Ask a focused
question only when the ambiguity blocks a safe or correct
implementation. Do not invent product behaviour that conflicts with this
file.

## 16. Definition of Done

A feature is not complete merely because its screen exists.

A feature is done only when: - The user can complete the intended
workflow. - Data persists correctly. - Backend authorization is
enforced. - Errors and loading states are handled. - Important actions
are auditable. - Tests cover the critical behaviour. - The UI is
accessible and responsive. - The production build succeeds. - The
feature does not misrepresent a reminder, acknowledgement or sensor
signal as proof of ingestion.

## 17. Hackathon Evaluation Alignment

  -----------------------------------------------------------------------
  Evaluation area                     Evidence CareLoop should
                                      demonstrate
  ----------------------------------- -----------------------------------
  Code quality                        Modular architecture, clear types,
                                      validation and maintainable
                                      services

  Security                            Independent identities,
                                      patient-level authorization, secure
                                      rules and audit logs

  Efficiency                          Indexed queries, controlled reads,
                                      idempotent jobs and limited AI
                                      calls

  Testing                             Unit, integration, authorization
                                      and end-to-end tests

  Accessibility                       Large controls, high contrast,
                                      readable text, keyboard and voice
                                      alternatives

  Problem alignment                   Medication management, adherence,
                                      appointments and collaborative care

  Google services usage               Real, purposeful Firebase, Gemini,
                                      FCM and Google Cloud integration
  -----------------------------------------------------------------------

**Final instruction:** Build a trustworthy, secure and testable
care-coordination product. A small number of complete workflows is
better than a large collection of superficial features.
