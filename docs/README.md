ShopNow - Complete Setup 
Primary setup platform: Windows with PowerShell
2. Install Dependencies
Run the following command to install the project dependencies:
npm.cmd ci
3. Configure Environment
Create your .env configuration file and generate the session secret:
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}
npm.cmd run auth:setup
Note: Open the .env file and update it with your actual PostgreSQL password.
4. Database Setup & Migration
Create an empty PostgreSQL database named shopnow_db (via pgAdmin or SQL) [cite: 3], then run these commands [cite: 3]:
npm.cmd run check
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:status
npm.cmd run db:seed
npm.cmd run db:summary
5. Start the Application
Start the server in development mode or normal mode [cite: 3]:
npm.cmd run dev
# Or for a normal start:
npm.cmd start
Open your browser and visit: http://localhost:3000 [cite: 3]
6. Create an Administrator
1. Register a new user account on the website [cite: 3].
2. Run this command in a second terminal (replace with your registered email) [cite: 3]:
npm.cmd run admin:promote -- "your-registered-email@example.com"
3. Sign in again to access the admin panel at /admin [cite: 3].
7. Verify Installation
Run the verification script in a second terminal to ensure everything is working correctly [cite: 3]:
npm.cmd run verify -- http://localhost:3000

