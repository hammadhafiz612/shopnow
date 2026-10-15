# ShopNow

Complete Installation, Configuration and Client Handover Guide

**Project version:** 0.6.0

**Primary setup platform:** Windows with PowerShell

**Default address:** [http://localhost:3000](http://localhost:3000)

ShopNow is an e-commerce application built with Node.js, Express 5, EJS, PostgreSQL and Sequelize 6. It includes customer accounts, a searchable product catalogue, carts, wishlists, delivery addresses, coupon checkout, orders, simulated payments, an administration panel, product image uploads and email notifications.

This guide explains how to install the complete project on a new computer, configure it, create an administrator, check the main features and preserve its data. Place this file as `README.md` in the project root, beside `package.json`.

**Payments are simulated. No real money is charged.** The supplied server listens on the local computer at `127.0.0.1`; public hosting requires additional deployment configuration.

## Contents

- [1. What you need](#1-what-you-need)
- [2. Open the complete project](#2-open-the-complete-project)
- [3. Install dependencies](#3-install-dependencies)
- [4. Create the PostgreSQL database](#4-create-the-postgresql-database)
- [5. Configure the environment](#5-configure-the-environment)
- [6. Create tables and sample data](#6-create-tables-and-sample-data)
- [7. Start the application](#7-start-the-application)
- [8. Create the first administrator](#8-create-the-first-administrator)
- [9. Configure email](#9-configure-email)
- [10. Use the application](#10-use-the-application)
- [11. Verify the installation](#11-verify-the-installation)
- [12. Daily use and project updates](#12-daily-use-and-project-updates)
- [13. Command reference](#13-command-reference)
- [14. Back up and recover data](#14-back-up-and-recover-data)
- [15. Optional GitHub setup](#15-optional-github-setup)
- [16. Project structure](#16-project-structure)
- [17. Troubleshooting](#17-troubleshooting)
- [18. Deployment and current limits](#18-deployment-and-current-limits)
- [19. Handover checklist and resources](#19-handover-checklist-and-resources)

## 1. What you need

| Requirement | Purpose and installation |
| --- | --- |
| Node.js | Version 22 or later is required by this project. Node.js 24 LTS is recommended for a new installation. Download it from the [official Node.js website](https://nodejs.org/en/download/); npm is included. |
| PostgreSQL | A running PostgreSQL server stores accounts, products, orders and sessions. Install a supported release from [PostgreSQL downloads](https://www.postgresql.org/download/). The [Windows installer page](https://www.postgresql.org/download/windows/) provides an installer with pgAdmin and command-line tools. |
| PostgreSQL password | Keep the password chosen for the database user during installation. It is different from the ShopNow website password. |
| Code editor | VS Code or another text editor for opening the project and editing `.env`. |
| Web browser | A current browser to use the website. |
| Internet connection | Required to download the initial tools and npm dependencies; SMTP delivery also needs access to your mail provider. |
| Git, optional | Needed only if obtaining or managing the source through Git/GitHub. Install it from [Git downloads](https://git-scm.com/downloads). |

During PostgreSQL installation, keep the default port `5432` unless it is already occupied. Ensure the PostgreSQL service is running. Installing pgAdmin alone does not install or start the database server.

After installing tools, close and reopen your terminal or VS Code. Check:

```powershell
node --version
npm.cmd --version
```

If using Git, also run `git --version`.

All Windows commands below use `npm.cmd` to avoid PowerShell's `npm.ps1` execution-policy error. Run commands from the project root, one at a time, and fix any error before continuing. Do not type the displayed terminal prompt, such as `PS C:\...>`.

On macOS/Linux, use `npm` instead of `npm.cmd`, use your own folder paths, and use `cp .env.example .env` only when `.env` does not already exist. The same database and application setup sequence applies.

## 2. Open the complete project

Obtain the complete ShopNow source from the project owner or its repository. Extract a source ZIP before running commands. An incremental update ZIP contains only changed files and cannot set up a fresh computer by itself.

In VS Code, choose **File > Open Folder** and open the folder that directly contains these items:

| Required item | Why it matters |
| --- | --- |
| `package.json` and `package-lock.json` | Application commands and exact dependency installation. |
| `.env.example` and `.sequelizerc` | Configuration template and database migration locations. |
| `src/` and `public/` | Application code, database migrations, templates and bundled assets. |
| `scripts/` and `docs/` | Setup, verification, maintenance and handover guides. |

If extraction creates `shopnow\shopnow`, open the inner folder containing `package.json`.

Open **Terminal > New Terminal**. If necessary, change to the actual project location. For example, if you placed it in `C:\Projects\shopnow`:

```powershell
Set-Location "C:\Projects\shopnow"
Test-Path .\package.json
Test-Path .\.env.example
Test-Path .\.sequelizerc
```

All three results should be `True`. Replace the example folder path with your own location.

## 3. Install dependencies

```powershell
npm.cmd ci
```

This installs the versions recorded in `package-lock.json`, including the Sequelize command-line tool used for migrations. Keep the supplied lockfile. No separate frontend build command is required.

The `node_modules` folder is generated locally. Do not copy it between operating systems or include it in a source handover.

## 4. Create the PostgreSQL database

For a fresh installation:

1. Open pgAdmin and connect to your local PostgreSQL server using the database password.
2. Expand the server, right-click **Databases**, then select **Create > Database**.
3. Enter `shopnow_db` as the database name.
4. Use the database owner that will match `DB_USER` in `.env`; the default local example uses `postgres`.
5. Save the database.

Alternatively, open **Query Tool** on the existing `postgres` database and execute:

```sql
CREATE DATABASE shopnow_db;
```

Use one method only. Skip database creation if you are deliberately connecting to an existing ShopNow database. This creates an empty database; the migration command in section 6 creates the tables.

## 5. Configure the environment

### Create `.env`

Run this in PowerShell. It preserves an existing `.env`:

```powershell
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}
```

Open `.env` in the editor. For a new local installation, use the following configuration and enter your real PostgreSQL password. This example selects email previews so the initial setup does not need an SMTP account:

```dotenv
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
TRUST_PROXY=0

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=shopnow_db
DB_USER=postgres
DB_PASSWORD="your_actual_postgresql_password"

# Generated by the auth:setup command below.
SESSION_SECRET=

# Local welcome/order/status previews; no notification emails are sent.
MAIL_MODE=preview
MAIL_WORKER=1

# Required for real email delivery and all password-reset emails.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=
```

The supplied `.env.example` defaults to `MAIL_MODE=smtp`; change that value to `preview` for this local preview setup. If you are updating an existing installation, edit only the settings you need and retain its database and SMTP credentials.

Use quotes around values containing spaces or `#`. The example password is a placeholder, not a working credential. Keep `.env` private; `.env.example` is the shareable template.

### Generate the session secret

```powershell
npm.cmd run auth:setup
```

This generates a random session secret inside `.env` without printing it. It preserves your other settings and keeps an already valid secret. The application requires at least 32 bytes for `SESSION_SECRET`.

### Configuration reference

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | Use `development` for this local setup. `production` changes cookie/TLS behavior and needs a configured HTTPS deployment. |
| `PORT` | Local HTTP port; default `3000`. |
| `APP_URL` | Full application origin used for links, such as `http://localhost:3000`. Keep it consistent with the browser address; do not add a subfolder or credentials. |
| `TRUST_PROXY` | Keep `0` locally. `1` trusts one reverse proxy and is only appropriate for a matching deployment. |
| `DB_HOST` | PostgreSQL host, normally `127.0.0.1` for a local server. |
| `DB_PORT` | PostgreSQL port, normally `5432`. |
| `DB_NAME` | Existing database to use, such as `shopnow_db`. |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL account and password, not a website login. |
| `SESSION_SECRET` | Private signing secret generated by `auth:setup`; preserve it between ordinary restarts. |
| `MAIL_MODE` | `preview` writes private welcome/order/status email previews; `smtp` sends those messages through your provider. |
| `MAIL_WORKER` | `1` enables automatic notification processing while the web server runs. `0` disables the background worker. |
| `SMTP_HOST` / `SMTP_PORT` | Mail provider's SMTP server and port. |
| `SMTP_SECURE` | `true` for an immediate TLS connection, normally port `465`; `false` normally uses port `587` with STARTTLS when supported. Follow your provider's settings. |
| `SMTP_USER` / `SMTP_PASSWORD` | Provider credentials; use an app password or dedicated SMTP credential if your provider requires one. |
| `MAIL_FROM` | Sender identity accepted by your provider, for example `"ShopNow <notifications@example.com>"`. |
| `PG_BIN_DIR`, optional | PostgreSQL `bin` directory containing `pg_dump` and `pg_restore`; needed for backup/recovery if those tools are not on PATH. |

Restart the server manually after changing `.env`. If a value appears to be ignored, check whether the terminal or hosting environment already defines the same variable; existing process environment values take precedence.

## 6. Create tables and sample data

With `.env` saved and PostgreSQL running, execute:

```powershell
npm.cmd run check
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:status
npm.cmd run db:seed
npm.cmd run db:summary
```

| Command | Expected result |
| --- | --- |
| `check` | JavaScript and EJS templates compile. It does not connect to PostgreSQL. |
| `db:check` | Reports that the database connection is successful. |
| `db:migrate` | Applies the supplied schema migrations to the selected database. |
| `db:status` | All supplied migrations show as applied (`up`). |
| `db:seed` | Adds the initial demonstration catalogue and coupons to a fresh database. |
| `db:summary` | Shows row counts for the application models. |

A clean seeded database contains **5 categories, 25 products, 25 product-image entries and 2 coupons**. The initial images are bundled illustrations; an administrator can upload product photographs later. No default customer or administrator account is created.

The application uses 15 business tables plus session and email-outbox tables. Sequelize also tracks migration/seed history. Use the supplied migrations to manage the schema; do not create the tables manually or force-reset an existing database.

For an existing shop, apply pending migrations and preserve its data. The seeder is tracked and repeat-safe, but rerunning it does not reset used or expired coupons. Never undo seeds or recreate a working database as a routine startup step.

## 7. Start the application

For development with JavaScript file watching:

```powershell
npm.cmd run dev
```

For a normal run without file watching:

```powershell
npm.cmd start
```

Choose one command and leave that terminal open. Expected startup output:

```text
PostgreSQL connection successful.
ShopNow is running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000). Check [http://localhost:3000/api/health](http://localhost:3000/api/health) for:

```json
{
  "status": "ok",
  "application": "ShopNow",
  "database": "connected"
}
```

The health check returns HTTP 503 if the database becomes unavailable. Stop the application with **Ctrl+C** in its terminal. Keep PostgreSQL running while using the application.

Use `localhost` consistently in the browser. Switching between `localhost` and `127.0.0.1` creates separate browser cookie contexts.

## 8. Create the first administrator

1. Open [Register](http://localhost:3000/register) and create your own account using an email address you control.
2. Use a password of at least 12 characters. Passwords must fit within 72 UTF-8 bytes; some non-ASCII characters use more than one byte.
3. Open a **second terminal** in the same project folder.
4. Replace the email below with the email you just registered and run:

```powershell
npm.cmd run admin:promote -- "your-registered-email@example.com"
```

5. Sign in again. Promotion invalidates earlier sessions.
6. Open [http://localhost:3000/admin](http://localhost:3000/admin).

There are **no built-in administrator credentials**. The promotion command works only for an account already registered in this database. Ordinary registrations receive the customer role.

## 9. Configure email

### Option A: Local previews

Keep these values in `.env` and restart the app:

```dotenv
MAIL_MODE=preview
MAIL_WORKER=1
```

Welcome, order-confirmation and order/payment-status notifications are saved as private `.eml` files in `mail-preview/`. An administrator can inspect their delivery state and previews at `/admin/emails`. The worker checks the queue every 10 seconds while the application runs.

Registration, login and shopping can be used without SMTP. **Password-reset emails always require SMTP, even when `MAIL_MODE=preview`.** Reset links are not saved in the notification previews or shown in the administrator email screen.

### Option B: Send real emails

Obtain the actual SMTP settings from your provider. A typical STARTTLS configuration is:

```dotenv
MAIL_MODE=smtp
MAIL_WORKER=1
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_provider_username
SMTP_PASSWORD="your_provider_smtp_password"
MAIL_FROM="ShopNow <your_verified_sender@example.com>"
APP_URL=http://localhost:3000
```

These are placeholders; `smtp.example.com` is not a configured mail service. If your provider specifies port `465` with immediate TLS, use `SMTP_PORT=465` and `SMTP_SECURE=true`. The sender must be authorized by the provider. Restart the server after changing settings.

For a real delivery test, register a test account at an address you control, inspect `/admin/emails`, and confirm receipt in that inbox and its spam folder. Test password reset separately from `/forgot-password`; reset links expire after 15 minutes and can be used once.

A notification delivery failure leaves the committed account/order intact and is retried up to five attempts. Failed queued messages can be retried from `/admin/emails`. SMTP interruptions can cause duplicate deliveries on retry.

For manual notification processing, set `MAIL_WORKER=0`, restart the web server, then run:

```powershell
npm.cmd run mail:process
```

This processes up to 20 ready queued messages once and exits. It does not replace the separate password-reset SMTP flow.

## 10. Use the application

### Customer workflow

1. Browse `/products`, search for products, filter by category or price, and open product details.
2. Add products to the cart. Guest carts are supported and merge into the saved cart on registration/login.
3. Sign in to use a wishlist and save delivery addresses at `/addresses`.
4. Open `/checkout`, select an address, optionally apply a coupon, and review the total.
5. Confirm the order. Stock is deducted, coupon usage is reserved, item/address snapshots are saved and the cart is cleared.
6. Open the order and choose a simulated successful or failed payment. A failed payment can be retried with a new attempt.
7. View your own order history at `/orders`. An unpaid pending order can be cancelled to release stock and coupon usage.

Checkout reviews expire after 15 minutes. If prices, stock, cart contents, the selected address or coupon conditions change, request a fresh review before confirming.

Fresh sample coupons:

| Code | Discount | Minimum order | Per-customer limit |
| --- | --- | --- | --- |
| `WELCOME10` | 10% | PKR 1,000.00 | 1 use |
| `SAVE500` | PKR 500.00 | PKR 2,500.00 | 2 uses |

Both initially expire 60 days after first seeding and have shared usage limits. Existing coupons may have expired, been deactivated or reached their limits. Manage their settings through the admin panel.

### Administrator workflow

| Page | What an administrator can do |
| --- | --- |
| `/admin` | View order/customer counts, paid delivered sales, recent orders and low-stock products. |
| `/admin/categories` | Create, edit or deactivate categories. |
| `/admin/products` | Create, edit or deactivate products and open their image manager. |
| `/admin/inventory` | Update available stock with a check against stale quantities. |
| `/admin/coupons` | Manage fixed/percentage coupons, expiry, minimum order and usage limits. |
| `/admin/orders` | Inspect orders and perform permitted fulfilment/cancellation transitions. |
| `/admin/emails` | Inspect notification delivery, retry failed messages and view private previews. |

Successful demo payment normally moves an order from pending to processing. Paid orders can progress to shipped and then delivered. Administrators can cancel eligible pending/processing orders before shipping; stock and coupon usage are restored once. Earlier demo payment history is preserved. Shipped/delivered orders cannot be cancelled here.

### Product images

From a product's admin edit page, open its image manager. Upload one JPEG, PNG or WebP image at a time, up to 5 MiB, 16 million pixels and 6,000 pixels per side. A product can have up to six images, including its seed image.

The server decodes uploads, strips metadata and saves normalized WebP files with a maximum side of 1,600 pixels under `uploads/products/`. Administrators can set the primary image, edit its description or remove it. Preserve these files together with the database.

## 11. Verify the installation

Keep the app running in the first terminal. In a second project terminal, run:

```powershell
npm.cmd run verify -- http://localhost:3000
```

Use your actual port if you changed it. Verification runs three phases:

1. Checks that retired documentation files are absent and compiles JavaScript/EJS.
2. Checks the session secret, database connection, applied migrations, required tables and referenced uploaded images.
3. Checks the running site's public pages, health, catalogue, cart totals, session/CSRF behavior, protected routes and expected error responses.

A successful run ends with `Verification passed.` A failed phase stops the command with a nonzero exit code. An admin count of zero is informational; create/promote an account before the admin handover.

The command does not create customers, orders or payments, or send email. A CSRF check can create a normal temporary session. It does not replace manual acceptance testing or prove real-provider inbox delivery and native database recovery on your computer.

### Manual acceptance checklist

Use a test installation and accounts you control. Order tests change stock and coupon usage.

- [ ] Catalogue, search, filters, sort, pagination and product details work.
- [ ] Registration, login, logout and invalid-input messages work.
- [ ] SMTP password reset works, and a used reset link cannot be reused.
- [ ] Guest cart, login merge, quantity changes, removal and wishlist work.
- [ ] Address creation, editing, deletion and default selection work.
- [ ] Valid coupons calculate the expected total; invalid/expired/limited coupons are rejected.
- [ ] Checkout saves the order and deducts stock once; repeating confirmation does not duplicate it.
- [ ] Failed and successful simulated payment attempts behave correctly.
- [ ] Unpaid cancellation restores stock/coupon usage once; customer access to another account's records is denied.
- [ ] A customer cannot open admin pages; the promoted administrator can manage products, categories, stock and coupons.
- [ ] Admin fulfilment, permitted cancellation and dashboard figures are correct.
- [ ] Image upload, primary selection, description editing and removal work; invalid uploads are rejected.
- [ ] Notification previews or SMTP delivery and failed-message retry work.
- [ ] Main customer/admin screens work at desktop and narrow browser widths.
- [ ] A native PostgreSQL backup and recovery into a fresh database preserves business data and uploaded images.

Record the actual results and date in [the final acceptance record](docs/FINAL_SUBMISSION.md). Verification and handover are complete only after the required scenarios pass on the target computer.

## 12. Daily use and project updates

### Start again after a computer restart

1. Ensure the PostgreSQL service is running.
2. Open a terminal in the project root.
3. Run `npm.cmd start` or `npm.cmd run dev`.
4. Open the application's configured localhost address.

You do not need to recreate the database, regenerate the secret, reinstall dependencies or seed data on each start. Stop the app with Ctrl+C before closing its terminal.

### Apply a project update

1. Preserve a private backup of the database, uploaded images and environment settings.
2. Stop the app and any standalone mail worker.
3. Apply the files supplied for your installed version, preserving `.env` and existing uploads/data.
4. Run `npm.cmd ci` if the dependency files changed, then apply any pending migrations with `npm.cmd run db:migrate`.
5. Run `npm.cmd run check`, start the application and run `npm.cmd run verify` from a second terminal.

Only use matching `package.json` and `package-lock.json` files from the same project release. An incremental update must be applied to its required base project.

## 13. Command reference

| Command | Purpose / prerequisite |
| --- | --- |
| `npm.cmd ci` | Install locked dependencies; needed on a fresh setup or dependency update. |
| `npm.cmd run auth:setup` | Generate/retain the private session secret in an existing `.env`. |
| `npm.cmd run check` | Compile JavaScript and EJS; database/server not required. |
| `npm.cmd run db:check` | Test the configured PostgreSQL connection. |
| `npm.cmd run db:migrate` | Apply pending schema migrations. |
| `npm.cmd run db:status` | List migration status. |
| `npm.cmd run db:seed` | Load the initial demonstration catalogue/coupons. |
| `npm.cmd run db:summary` | Display model table counts. |
| `npm.cmd run dev` | Start the server with JavaScript watching. |
| `npm.cmd start` | Start the server without watching. |
| `npm.cmd run admin:promote -- "EMAIL"` | Promote an existing registered account; sign in again afterward. |
| `npm.cmd run smoke -- http://localhost:3000` | Run HTTP availability checks against an already running app. |
| `npm.cmd run verify -- http://localhost:3000` | Run combined source, environment, schema, image and HTTP checks. |
| `npm.cmd run mail:process` | Process up to 20 ready notification jobs once. |
| `npm.cmd run uploads:clean` | Dry-run report of eligible unreferenced uploaded images older than 24 hours. |
| `npm.cmd run uploads:clean -- --delete` | Delete only the eligible orphan image files reported by the cleanup rules. |
| `npm.cmd run backup` | Back up the configured database and referenced uploaded images; stop app/file writers first. |
| `npm.cmd run restore -- "BACKUP_FOLDER" --database NEW_NAME` | Validate and restore into a fresh database and separate image folder. |
| `npm.cmd run cleanup:api-reference` | Legacy-update maintenance: remove the five known retired documentation files. Unnecessary for a clean complete source copy. |

`EMAIL`, `BACKUP_FOLDER` and `NEW_NAME` are placeholders. Replace them with your actual values; the restore example below uses a valid database name.

## 14. Back up and recover data

### Prepare the PostgreSQL tools

Backup requires `pg_dump`; recovery requires `pg_restore`. Use tools matching the database server's major version. An older `pg_dump` cannot back up a newer-major PostgreSQL server.

If the tools are not on PATH, locate your installation:

```powershell
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
```

For example, if your installed version is in the `18` folder:

```powershell
$env:PG_BIN_DIR = "C:\Program Files\PostgreSQL\18\bin"
Test-Path "$env:PG_BIN_DIR\pg_dump.exe"
Test-Path "$env:PG_BIN_DIR\pg_restore.exe"
```

Use your actual version and installation directory. Both checks should return `True`. This environment variable lasts for the current terminal. For a persistent project setting, add the actual path to `.env`:

```dotenv
PG_BIN_DIR="C:\Program Files\PostgreSQL\18\bin"
```

### Create a backup

Stop the ShopNow server with Ctrl+C and stop any other application/database/file writers. **Keep the PostgreSQL service running.** Then run:

```powershell
npm.cmd run backup
```

The command prints the completed folder, such as `backups\shopnow-TIMESTAMP-UUID`. Keep that entire folder together:

| Backup item | Contents |
| --- | --- |
| `database.dump` | PostgreSQL custom-format database dump, including application records and migration history. |
| `images/` | Uploaded WebP images referenced by the database. |
| `manifest.json` | Backup information, file sizes and SHA-256 checksums. |

The database dump and image-reference query use the same exported database snapshot. File writers must remain stopped while images are copied. The command refuses to proceed if the configured local app port is listening.

The data backup does not include source code, `.env`, `node_modules`, bundled seed illustrations, orphan uploads or private email-preview files. Preserve the matching source and environment settings separately. Keep a private backup copy outside the project/computer. Backups contain customer and account data and are not encrypted by this command; do not publish them in GitHub or a public source ZIP. Checksums detect file damage, not who created the backup.

### Test a restore safely

Keep the app stopped during this procedure. Replace the folder below with the exact completed backup folder printed by the backup command:

```powershell
npm.cmd run restore -- ".\backups\shopnow-YOUR_TIMESTAMP-UUID" --database shopnow_recovery_test
```

The database account must be able to connect to the `postgres` maintenance database and create/restore a database. Target names must start with a lowercase letter and contain only lowercase letters, digits or underscores, up to 63 characters.

The command validates the backup and restores into a **new** database. It rejects the active database name and all existing target databases. Use a fresh name such as `shopnow_recovery_test2` for a repeat test.

Recovered images are written separately to `recovery\TARGET-UUID\uploads\products`, with a `restore-info.json` summary. The active database, `.env` and current upload folder are not switched automatically.

The restored copy retains users/password hashes, products, stock, saved customer carts, addresses, wishlists, coupons, orders and payments. It clears old sessions, guest carts, password-reset tokens and notification-outbox history/jobs. Users must sign in again; old reset links no longer work and old notification jobs are not resent.

Inspect the new database in pgAdmin and check the recovered images. If recovery fails after creating its new database, that incomplete database can remain for inspection. Do not switch the application to an incomplete recovery; fix the problem and retry with a fresh target name.

### Switch to a verified recovered copy

1. Stop the application and workers, and preserve the current database, uploads and `.env` privately.
2. Change `DB_NAME` in `.env` to the successfully restored database name.
3. Move the current `uploads/products` folder to a private backup location. Copy the recovered `uploads/products` folder into the project at that same path; avoid mixing unrelated old and recovered image sets.
4. Initially set `MAIL_MODE=preview` and `MAIL_WORKER=0`.
5. Start the app, run `npm.cmd run verify` from a second terminal, sign in again, and check photos, order history and stock.
6. After acceptance, restore the intended mail settings and restart the server. New notification events then follow those settings.

The recovered data reflects the backup time; later changes are not included. Run this native backup/restore exercise on the target computer before relying on it for a handover. Additional notes are in [the backup and recovery guide](docs/BACKUP_RESTORE.md).

## 15. Optional GitHub setup

GitHub is optional for running ShopNow. If the project already has a repository, use its existing Git workflow and remote.

To publish your own new source repository:

1. Sign in to GitHub and [create an empty repository](https://github.com/new), for example `shopnow`. Choose Private unless you intend the source to be public.
2. Leave GitHub's README, license and `.gitignore` initialization unchecked because these files are already supplied locally.
3. In the project folder, review `.gitignore`. It excludes `.env`, `node_modules`, uploads, mail previews, backups and recovery data.
4. For a folder that is not already a Git repository, run:

```powershell
git init -b main
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_EMAIL_OR_NOREPLY_EMAIL"
git add .
git diff --cached --name-only
```

Review that list before committing. It must not contain your actual `.env`, private backups, previews or customer data. Then run:

```powershell
git commit -m "Set up ShopNow"
git remote add origin https://github.com/YOUR_USERNAME/shopnow.git
git push -u origin main
```

Replace the repository URL with the exact HTTPS URL GitHub gives you. Use GitHub's normal browser/Git Credential Manager sign-in if prompted. Website and PostgreSQL passwords are unrelated to GitHub authentication.

Git stores the source; it does not automatically back up the running PostgreSQL database, private configuration or uploaded product photos.

## 16. Project structure

| Path | Purpose |
| --- | --- |
| `src/server.js` | Database readiness checks and local HTTP server startup. |
| `src/app.js` | Express middleware, static assets and routes. |
| `src/config/` | Environment, database, session and storage configuration. |
| `src/routes/` / `src/controllers/` | Routes, request handling and HTML/JSON responses. |
| `src/services/` | Authentication, catalogue, shopping, checkout, payments, admin and notification logic. |
| `src/models/` | Sequelize models and database relationships. |
| `src/migrations/` | Versioned database schema changes. |
| `src/seeders/` / `src/data/` | Initial sample catalogue, images and coupon data. |
| `src/middleware/` / `src/validators/` / `src/utils/` | Access checks, validation, CSRF and shared helpers. |
| `src/views/` | EJS customer/admin pages and shared templates. |
| `public/` | Public styles, browser scripts and bundled images. |
| `scripts/` | Setup, database, admin, email, verification, backup and recovery commands. |
| `docs/` | Requirements mapping, acceptance checklist and supporting guides. |
| `uploads/products/` | Generated uploaded product images; preserve with database backups. |
| `mail-preview/` | Private generated notification previews. |
| `backups/` / `recovery/` | Private generated backup/recovery outputs. |
| `.env.example` | Shareable environment template. |
| `.env` | Private local configuration, created during setup. |
| `package.json` / `package-lock.json` | Commands, project metadata and locked dependencies. |

Generated folders may appear only after their first use. PostgreSQL stores the business data; source files alone do not contain an existing shop's accounts or orders.

## 17. Troubleshooting

| Problem | Action |
| --- | --- |
| `npm.ps1 cannot be loaded` | Use `npm.cmd` as shown throughout this guide. No execution-policy change is needed. |
| `node` or `npm.cmd` is not recognized | Install Node.js, close/reopen the terminal, and check that Node.js is on PATH. |
| `package.json` not found / `ENOENT` | Change to the inner project folder that directly contains `package.json`. |
| `npm ci` reports a lockfile mismatch | Obtain matching `package.json` and `package-lock.json` from the same release, then rerun `npm.cmd ci`. |
| Package installation fails for `sharp` or `bcrypt` | Confirm a supported Node.js version and internet access; reinstall with `npm.cmd ci` on the target computer instead of copying `node_modules`. Inspect the first installation error if it persists. |
| `Missing script` | Run `npm.cmd run` to list available scripts. Check the current folder and that the complete matching update was applied, especially `package.json` and `scripts/`. See the checks below. |
| Database connection refused | Start PostgreSQL; verify `DB_HOST` and `DB_PORT`, then run `npm.cmd run db:check`. |
| PostgreSQL password authentication failed | Correct `DB_USER` and `DB_PASSWORD` in `.env`; these are PostgreSQL credentials. Quote passwords containing `#` or spaces. |
| Database does not exist | Create the configured database in pgAdmin or correct `DB_NAME`. |
| Missing table/column / tables not ready | Run `npm.cmd run db:migrate`, then check `npm.cmd run db:status`. |
| Missing or short `SESSION_SECRET` | Ensure `.env` exists and run `npm.cmd run auth:setup`; restart the app. |
| Port already in use / `EADDRINUSE` | Stop the earlier ShopNow process, or change both `PORT=3001` and `APP_URL=http://localhost:3001`; restart and open the new address. |
| Admin access denied | Register the account, promote that exact email in the same database, then sign in again. |
| Login/forms fail after environment changes | Restart the app, use the same hostname consistently, and ensure `NODE_ENV=development` for local HTTP. Secure production cookies need HTTPS. |
| CSRF/session error | Reload the page and retry from the current form. If the session expired, sign in again. |
| Notifications are not delivered | Check `MAIL_MODE`, worker settings and `/admin/emails`. Preview mode intentionally saves files rather than sending. Check provider credentials for SMTP mode. |
| SMTP `535` / `EAUTH` | The mail provider rejected authentication. Check its username, SMTP/app password and account requirements; changing database settings will not fix it. |
| Password reset is not received | Configure real SMTP even in preview mode; verify `MAIL_FROM`, `APP_URL`, provider access and the recipient's spam folder. |
| Coupon is rejected | Check active status, expiry, minimum order and global/per-user usage limits. Seeding again does not reset an existing coupon. |
| Checkout review or admin edit is stale | Reload/review the latest values and submit a fresh form. Stock or another relevant value may have changed. |
| Uploaded photo is missing after moving the project | Restore matching `uploads/products` files with the matching database. Run verification to find missing referenced images. |
| `pg_dump` / `pg_restore` not found | Install PostgreSQL command-line tools and set the actual `PG_BIN_DIR` or PATH. |
| PostgreSQL dump version mismatch | Use tools matching the server's major version; an older dump tool cannot dump a newer-major server. |
| Backup says stop the server | Stop the app and other writers while leaving PostgreSQL running; check for another process on the configured app port. |
| Restore target already exists | Choose a fresh database name. The command does not overwrite existing databases. |
| Restore permission error | The configured DB role needs access to the `postgres` maintenance database and permission to create/restore the new database. |
| Backup checksum mismatch | Use one complete, intact trusted backup folder. Do not mix its dump, images or manifest with another backup. |

For a missing-script error, inspect the installation from its project root:

```powershell
Test-Path .\package.json
Test-Path .\scripts\verify-project.js
Test-Path .\scripts\cleanup-api-reference.js
Test-Path .\scripts\lib\recovery.js
npm.cmd run
```

If an expected file is missing, apply the complete matching source/update. If the files exist but the scripts are absent from the list, `package.json` is from an older release. For the specific cleanup alias, `node scripts/cleanup-api-reference.js` is also available when that file exists. A clean full source copy does not require legacy cleanup.

## 18. Deployment and current limits

This README provides a complete **local installation**. Public deployment needs its own host-specific setup: HTTPS, a reverse proxy to the current loopback listener, a process manager/service, persistent PostgreSQL and upload storage, private environment configuration and operational backups. Set `APP_URL` to the actual site origin. Use `TRUST_PROXY=1` only with the intended single-proxy configuration.

The supplied Sequelize CLI configuration defines the `development` environment. Follow this guide in that environment for local migrations; add and validate the appropriate CLI configuration as part of a production deployment before running migrations with `NODE_ENV=production`.

Current application behavior:

- Payments and refunds are not connected to a real payment provider. Admin cancellation preserves earlier simulated payment records.
- All amounts use PKR. No tax or delivery fee is configured.
- Pending orders retain stock and coupon reservations until payment or explicit cancellation; there is no automatic unpaid-order expiry job.
- Password reset requires SMTP. Preview mode covers welcome/order/status notifications only.
- Notification delivery is retried and can be duplicated after an SMTP interruption.
- The local listener is not accessible from another computer/phone through its own `localhost`; public or LAN access needs a deliberate server/proxy deployment configuration.

## 19. Handover checklist and resources

Before handing the installation to a client, confirm:

- [ ] The complete source and matching lockfile are available.
- [ ] The client can start/stop PostgreSQL and ShopNow.
- [ ] `.env` is configured privately and the session secret is generated.
- [ ] All migrations are applied and expected catalogue data is present.
- [ ] The client's own administrator account works after a fresh sign-in.
- [ ] Email mode is agreed and SMTP password reset is tested if required.
- [ ] `npm.cmd run verify` passes and manual acceptance results are recorded.
- [ ] Native backup/recovery and matching uploaded images are checked on the target computer.
- [ ] The client has the matching source, private environment settings and a private data backup through the agreed handover method.
- [ ] No real credentials or customer data are included in a public repository/source ZIP.

Project documents:

- [Final acceptance record and submission notes](docs/FINAL_SUBMISSION.md)
- [Requirements coverage](docs/REQUIREMENTS_COVERAGE.md)
- [Additional backup and recovery notes](docs/BACKUP_RESTORE.md)

Official resources:

- [Node.js installation](https://nodejs.org/en/download/) and [release status](https://nodejs.org/en/about/previous-releases)
- [PostgreSQL Windows installation](https://www.postgresql.org/download/windows/)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) and [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)
- [Sequelize migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Nodemailer SMTP settings](https://nodemailer.com/smtp)
- [GitHub: creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
