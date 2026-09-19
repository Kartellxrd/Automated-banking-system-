# Periscope Mining System — V1 Demo, UAT & Deployment Guide

## Purpose
This guide is the final non-technical demonstration, user-acceptance and deployment checklist for Periscope Mining System V1. Demonstrate the application by following the same roles and approvals that the company will use in production. Do not explain database tables or code during the business demo unless asked.

## What V1 solves
V1 replaces disconnected paper attendance, manual payroll preparation, unclear approvals and difficult-to-trace payments with one controlled chain:

**Site Clerk → HR → Accountant → CEO → Payment Processing → Audit trail**

The system records who captured attendance, who approved it, which rates and payout details were used, who prepared payroll, who released company funds for payment, the result for each employee/payee, genuine payment references, failed transactions and expense reconciliation.

The application does not pretend that a browser button transfers money. Periscope currently uses FNB bulk where available and manually processed Orange Money / P2C / eWallet payments. V1 prepares, authorizes, tracks and audits that real-world process. Direct bank/API initiation can be added later without redesigning payroll.

## V1 role boundaries
- **Admin:** manages login users, sites, Site Clerk assignments, permissions and audit visibility. Admin does not maintain ordinary employee payroll records.
- **Site Clerk:** works only with the assigned site, captures attendance, submits rosters to HR, raises site expense requests and reconciles site advances.
- **HR:** owns employee master data, contracts/compliance, documents, absences, site assignment, payout details and roster approval/rejection.
- **Accountant:** prepares payroll from HR-approved attendance, reviews expense requests, manages normalized expense payees, and processes payment instructions only after CEO release.
- **CEO:** gives final payroll/expense approval, releases approved payments using **PAY ALL** / **PAY EXPENSE**, and monitors settlement status.

## Before the demo
Use test workers and test transaction references only. Do not use a real employee bank account or mark a real salary Paid unless an actual payment has occurred.

Create at least one active user for Site Clerk, HR, Accountant and CEO. Create one active site and assign the Site Clerk to it. HR should create at least three test employees and give each a verified payout profile. For a useful payment demonstration, use different payout providers where possible.

Confirm first-login password behaviour: an Admin-created temporary password must open the forced password-change page, both password fields must have show/hide controls, a successful change must redirect to the correct role dashboard, and the new password must work on the next login.

The Accountant should open **Payment Processing** and create the company payment source. For the company information currently confirmed, use a label such as `Periscope Main Payment Account`, institution `First National Bank Botswana`, type `bank`, and a masked/non-sensitive identifier such as `FNB ending 1234`. Do not store internet-banking usernames, passwords, PINs or OTPs.

## Payroll demo — what management should see
1. **Site Clerk:** sign in, open the assigned site, capture a day's attendance for the test employees, check hours/overtime and submit the roster to HR.
2. **HR:** sign in, open the submitted roster, review employee/rate/compliance information and approve it. Show that the Site Clerk cannot approve their own roster.
3. **Accountant:** open **Payroll Preparation**, select the HR-approved roster, prepare the payroll batch and inspect the employee calculations. Show regular hours, overtime, hourly-rate snapshots, net pay and verified payout destinations. Set the **Scheduled Payday** and submit the completed batch to CEO.
4. **CEO:** open **Payroll Approval**, inspect the batch and approve it. Then open **Payment Center**. The same approved batch must appear under payroll ready for release with employee count, net total, scheduled payday and payout-provider breakdown.
5. **CEO PAY ALL:** click **PAY ALL**. The in-app confirmation must show the employee count, amount and scheduled payday. Confirming freezes the exact recipients, amounts and payout destinations into one immutable payment run. It does not falsely mark employees Paid.
6. **Accountant processing:** return to Accountant → **Payment Processing**. The CEO-released run must be visible. Select the company FNB payment source and start processing. Download **Payment Instruction CSV**. Explain that this is the controlled instruction set used for the real FNB bulk/manual payment process.
7. Open the run. For UAT only, use obvious test references such as `DEMO-FNB-001`. Mark one worker **Paid**, one **Submitted to Bank**, and one **Failed**. Paid/Submitted must require a reference and Failed must require a reason.
8. **CEO visibility:** return to CEO → Payment Center. The run must show the same Queued / Submitted / Paid / Failed counts. Demonstrate that a failed worker can be retried without creating a second payment for employees already paid.

### Payroll acceptance result
The payroll flow passes if one approved payroll can be traced from attendance to HR approval, Accountant preparation, scheduled payday, CEO approval, CEO **PAY ALL**, Accountant payment processing, individual references and CEO-visible results without manually altering the database.

## Expense demo — direct vendor
1. Site Clerk creates an expense request and attaches supporting evidence if available.
2. Accountant reviews the request, recommends an amount and sends it to CEO.
3. Accountant opens **Expense Payees** and creates/assigns the real payment recipient as a normalized payee with a verified payout destination.
4. CEO opens **Expense Approval**, reviews the request/evidence and approves it.
5. CEO opens **Payment Center**. The approved expense must show the verified payee, provider, masked destination and approved amount.
6. CEO clicks **PAY EXPENSE** and confirms. This creates one immutable expense payment run.
7. Accountant opens **Payment Processing**, selects the company payment source, starts the expense run and records the real/test transaction reference/result.
8. When the direct-vendor item is marked Paid, the expense is automatically written to **Expenses Ledger**. The Accountant cannot manually create a normal ledger expense and bypass the approval/payment workflow.

## Expense demo — site advance
Use the same request → Accountant → CEO → **PAY EXPENSE** → Payment Processing sequence, but the recipient is a verified site custodian/advance recipient. After the advance is actually paid, the Site Clerk must reconcile the amount. The actual amount spent plus returned amount must explain the disbursement. Accountant reviews the reconciliation. Only after successful reconciliation does the final actual spend enter the Expenses Ledger.

Example:
- Advance paid: P8,000
- Actual spend: P6,500
- Returned: P1,500
- Unexplained difference: P0
- Final ledger expense: P6,500

## Expenses Ledger rule
The V1 Expenses Ledger is a **workflow-generated financial record**, not another expense-entry screen.

- Direct vendor payment → ledger entry after confirmed payment.
- Site advance → ledger entry after successful reconciliation.
- Old historical/manual rows remain visible as Legacy Records for history only.
- Normal V1 expenses cannot bypass Site Clerk request, Accountant review, CEO approval and payment/reconciliation controls.

## P8,000 site-fee example
Create the property/vendor as an Expense Payee with a verified payout destination. Site Clerk creates a direct-vendor request for `Monthly Site Fee — P8,000`; Accountant recommends P8,000 and sends it to CEO; CEO approves P8,000 and then clicks **PAY EXPENSE** in Payment Center; Accountant processes the released instruction and records the bank/mobile reference; the final verified expense then appears automatically in Expenses Ledger.

Recurring contract/obligation automation can be introduced later. V1 still preserves request, approver, payee, amount, payment release, payment reference and final ledger record.

## What PAY ALL means in V1
**PAY ALL** is the CEO's final company-side release of the complete approved payroll as one controlled payment run. The system locks the exact recipients, amounts and payout destinations.

It does **not** claim that the browser directly transferred the money. The Accountant/Finance function then submits the released instructions through Periscope's actual FNB/mobile-money process and records real settlement outcomes. FNB remains the actual payment rail until a tested direct banking integration exists.

## Scheduled payday
Every payroll batch requires a scheduled payment date before CEO release. This makes the late-payment problem visible before payday rather than after complaints start.

CEO Payment Center shows the payroll date and timing state such as:
- `3 days to payday`
- `Pay tomorrow`
- `Pay today`
- `2 days overdue`

The objective is to prepare and approve the full workforce before the company's salary date so Finance is processing one controlled batch rather than calculating salaries at the last minute.

## FNB demonstration
The Accountant can download the authorized **Payment Instruction CSV**. It contains the payment-run code, payee, amount, provider, destination/branch details and current status. This demonstrates how the system creates a single controlled batch instead of retyping payroll calculations.

Before a live FNB bulk upload is used, Periscope/FNB must confirm the exact bulk salary file specification required by their Online Banking Enterprise/corporate profile. The export can then be mapped to that exact specification without changing the internal payroll workflow.

## Pre-deployment UAT checklist
- [ ] Every role is redirected only to its own dashboard.
- [ ] Inactive users are blocked.
- [ ] Temporary passwords require a change and redirect to the correct dashboard after success.
- [ ] Signed-in users can change their own password from their dashboard/navigation.
- [ ] Password fields provide show/hide controls.
- [ ] Admin manages system users, sites and Site Clerk assignments but not ordinary employee payroll records.
- [ ] Site Clerk sees only the assigned site and cannot approve their own roster.
- [ ] HR creates/maintains employees and approves/rejects submitted rosters.
- [ ] HR owns payout details, employee documents, contracts/compliance and absences.
- [ ] Payroll uses HR-approved attendance only and snapshots the rate/payout details used for that payroll.
- [ ] Accountant cannot send payroll to CEO while required payout information is missing.
- [ ] Payroll has a Scheduled Payday before CEO payment release.
- [ ] CEO can approve/reject payroll and expenses.
- [ ] CEO **PAY ALL** creates one immutable payroll payment run and duplicate release is blocked.
- [ ] CEO **PAY EXPENSE** requires a verified normalized payee/payout destination.
- [ ] Accountant cannot process a payment run until CEO has released it.
- [ ] Paid/Submitted payment status requires a real or explicit UAT reference.
- [ ] Failed payment status requires a failure reason.
- [ ] Retry affects failed items only and does not repay successful items.
- [ ] Site advances require reconciliation; direct vendor payments do not use the advance-reconciliation workflow.
- [ ] Expenses Ledger is read-only/workflow-generated for new V1 transactions.
- [ ] Audit logs record material user, roster, payroll, expense, approval and payment events.
- [ ] No native browser `alert`, `confirm` or `prompt` is used in final user workflows.
- [ ] No production service-role key is exposed to browser code.
- [ ] No real bank login/password/PIN/OTP is stored in this application.
- [ ] One full payroll test passes from Site Clerk to CEO/payment status.
- [ ] One direct-vendor expense test passes from Site Clerk to Expenses Ledger.
- [ ] One site-advance test passes through reconciliation to Expenses Ledger.

## Deployment sequence
1. Pull the latest `main` into the deployment workspace.
2. Run `npm ci` inside `payroll-system`.
3. Run `npm run build`. Do not deploy if the production build fails.
4. Confirm Vercel production environment variables are present:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose as `NEXT_PUBLIC_*`)
5. Confirm the intended Supabase project contains the latest schema/functions/permissions.
6. Deploy the Next.js application to Vercel.
7. After deployment, run a role-by-role smoke test: Admin, Site Clerk, HR, Accountant and CEO.
8. Run one complete payroll and expense workflow using test records before live payroll data is processed.
9. Record UAT/management feedback and fix any operational issue before enabling real payments.

## Current live-payment limitation
V1 is ready to deploy as a controlled payroll/expense workflow after the production build and UAT checklist pass. Actual transfer initiation remains Periscope's existing FNB / Orange Money / P2C / eWallet operation. A direct bank/API integration is a future integration and must not be represented as active until the company obtains and tests the required banking interface.
