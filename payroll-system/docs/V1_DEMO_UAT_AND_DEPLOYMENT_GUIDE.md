# Periscope Mining System — V1 Demo, UAT & Deployment Guide

## Purpose
This guide is written for a non-technical demonstration of V1. The application should be demonstrated by following the same roles and approvals that the company will use in production. Do not explain database tables or code during the business demo unless asked.

## What V1 solves
V1 replaces disconnected paper/payroll handling with a controlled chain: Site Clerk captures attendance and requests site expenses; HR verifies workforce/compliance and approves rosters; Accountant prepares payroll and reviews expenses; CEO gives final financial approval; Finance executes the real company payment process; the system records who approved, what was paid, the payment status, references and exceptions.

The system does not pretend that a browser button transfers money. Periscope currently uses FNB bulk where available and manually processed Orange Money / P2C / eWallet payments. V1 controls and audits that real-world process.

## Before the demo
Use demo/test workers and demo transactions only. Do not use a real employee bank account or mark a real salary paid unless an actual payment has occurred. Create at least one user for Site Clerk, HR, Accountant and CEO. Confirm each user can change their own password. Create one active site and assign the Site Clerk to it. HR should create at least three demo employees and give each a verified payout profile. For a useful payment demonstration, use different payout providers where possible.

The Accountant should open Payment Execution and create the company payment source. For the company information currently confirmed, use a label such as `Periscope Main Payment Account`, institution `First National Bank Botswana`, type `bank`, and a masked/non-sensitive identifier such as `FNB ending 1234`. Do not store internet-banking usernames, passwords, PINs or OTPs.

## Payroll demo — what management should see
1. **Site Clerk:** sign in, open the assigned site, capture a day's attendance for the demo employees, check hours/overtime and submit the roster to HR.
2. **HR:** sign in, open the submitted roster, review employee/rate/compliance information and approve it. Show that the Site Clerk cannot approve their own roster.
3. **Accountant:** sign in, open Payroll Preparation, select the HR-approved roster, prepare the payroll batch and inspect the employee calculations. Show regular hours, overtime, hourly-rate snapshots, net pay and verified payout destinations. Submit the completed batch to the CEO.
4. **CEO:** sign in, open Payroll Approval, inspect the batch and approve it. Then open **Payment Center**. The same approved batch must now appear under **Ready for CEO Pay All** with the employee count, net total and payout-provider breakdown.
5. **CEO Pay All:** click **AUTHORIZE PAY ALL**. The in-app confirmation must explain that the action freezes the exact recipients, amounts and payout destinations but does not claim money has already moved. Confirm the action. A payment-run code such as `PR-...` must appear under Live Payment Run Progress.
6. **Accountant execution:** return to Accountant → Payment Execution. The CEO-authorized run must be visible. Select the company FNB payment source and start execution. Download **Instruction CSV**. Explain that this is the controlled file/instruction set used for the real FNB bulk/manual payment process.
7. Open the run. For UAT only, use obvious test references such as `DEMO-FNB-001`. Mark one worker Paid, one Submitted and one Failed. The failed item must require a reason.
8. **CEO visibility:** return to CEO → Payment Center. Within the refresh period the run must show the same Paid / Submitted / Failed counts. Demonstrate that a failed worker can be retried without creating a second payment for employees already paid.

### Payroll acceptance result
The demo passes if one approved payroll can be traced from attendance to HR approval, Accountant preparation, CEO approval, CEO Pay All authorization, Finance execution, individual references and CEO-visible results without manually altering the database.

## Expense demo — direct vendor
1. Site Clerk creates an expense request and attaches supporting evidence if available.
2. Accountant reviews the request, recommends an amount and sends it to CEO.
3. Accountant opens **Expense Payees** and creates the real payment recipient as a normalized payee. Enter the provider and destination, verify it, then assign the verified payee to the expense request.
4. CEO opens Expense Approval, reviews the request/evidence and approves it.
5. CEO opens **Payment Center**. The approved expense must show the verified payee, provider, masked destination and approved amount.
6. CEO clicks **AUTHORIZE EXPENSE PAYMENT** and confirms. This creates an immutable one-item expense payment run.
7. Accountant opens Payment Execution, selects the company FNB payment source, starts the expense run and records the real transaction reference/result.
8. When the direct-vendor item is marked Paid, the expense is recorded in the expense ledger and the CEO can still see the completed payment run/history.

## Expense demo — site advance
Use the same request → Accountant → CEO → payment-run sequence, but the recipient is a verified site custodian/advance recipient. After the advance is actually paid, Site Clerk must reconcile the amount: actual amount spent plus returned amount must explain the disbursement. Accountant reviews the reconciliation. This is intentionally different from a direct-vendor payment.

## P8,000 site-fee example
For the current V1 demonstration, create the property/vendor as an Expense Payee with a verified payout destination. Create a direct-vendor request for `Monthly Site Fee — P8,000`, Accountant recommends P8,000, CEO approves P8,000 and then authorizes that expense in Payment Center. Finance executes the real payment and records the bank reference. Recurring contract automation can be introduced as a later enhancement; V1 still preserves the request, approver, payee, amount, payment reference and ledger record.

## What Pay All means in V1
`AUTHORIZE PAY ALL` means the CEO authorizes the complete approved payroll as one controlled payment run. It does **not** mean the web application already moved money. Finance then executes the run using Periscope's actual FNB/mobile-money process. This distinction is deliberate: the system must never say an employee was paid without a genuine result/reference.

## FNB demonstration
The Accountant can download the authorized Payment Instruction CSV. It contains the payment-run code, payee, amount, provider, destination, branch code and current status. This demonstrates how the system creates one controlled batch rather than retyping payroll calculations. Before live FNB bulk upload is used, Periscope/FNB should confirm the exact file specification required by their corporate banking profile. The export can then be mapped to that exact specification without changing the payroll workflow.

## Pre-deployment UAT checklist
- Every role is redirected only to its own dashboard.
- Inactive users are blocked.
- Temporary passwords require a change; signed-in users can change their own passwords.
- Admin manages system users/sites/site-clerk assignments but not ordinary employee payroll records.
- Site Clerk sees only the assigned site and cannot approve their own roster.
- HR creates/maintains employees and approves/rejects submitted rosters.
- Payroll uses HR-approved attendance only and snapshots rates/payout destinations.
- Accountant cannot submit payroll to CEO while payout profiles are missing.
- CEO can approve/reject payroll and expenses.
- CEO Pay All creates one immutable run; clicking it again cannot create a duplicate run.
- Accountant cannot execute a run without CEO authorization.
- Paid status requires a real/test reference; Failed requires a reason.
- Retry affects failed items only.
- Expense payment cannot be authorized without a verified normalized payee.
- Site advances require reconciliation; direct vendor payments do not use the advance-reconciliation workflow.
- Audit logs record material approvals, payment authorization and payment execution events.
- No native browser `alert`, `confirm` or `prompt` is used in the final user workflows.
- No production service-role key is exposed to browser code.
- No real bank login/password/PIN/OTP is stored in this application.

## Deployment sequence
1. Pull the latest `main` into the deployment workspace.
2. Run dependency install and a production build locally/CI. Resolve all build errors before deployment.
3. Confirm production environment variables for Supabase are present in Vercel and that the service-role key is server-only.
4. Confirm Supabase migrations are applied to the intended production project.
5. Deploy the Next.js app to Vercel.
6. Sign in with each V1 role and run a smoke test: login, dashboard access, password change, roster flow, payroll review, expense review and Payment Center read-only checks.
7. Run one complete demo payroll using test records before introducing real payroll.
8. Record management/UAT sign-off and only then permit live operational data.

## Current live-payment limitation
V1 is deployment-ready as a controlled workflow only after production build/UAT pass. Actual transfer initiation remains Periscope's existing FNB / mobile-money operation. A direct bank/API integration is a future integration and must not be represented as active until the company obtains and tests the required banking interface.
