# Database-Backed Authentication System

This application uses a secure, database-backed authentication system built with:

- `iron-session` for encrypted session cookies
- `bcrypt` for industry-standard password hashing
- A local SQLite database for user storage

## Configuration

Your session secret must be set in your `.env` file:

```env
# Local Authentication
SESSION_SECRET="your-very-strong-secret-password-for-cookies-at-least-32-characters-long"
```

## User Management

Users are now stored in the application's SQLite database (`user_data/history/history.db`).

### First-Time Setup & Migration

If you were using the old `APP_USERS_CONFIG` environment variable, the application will automatically perform a **one-time migration** on its next startup.

1. It will read the users from `APP_USERS_CONFIG`.
2. It will securely hash their passwords using `bcrypt`.
3. It will store the username, hashed password, and role in the SQLite database.
4. Once the migration is complete, you can and **should** remove the `APP_USERS_CONFIG` variable from your environment for security.

### Adding/Managing Users (Post-Migration)

Currently, user management must be done by directly interacting with the SQLite database. You can use a tool like `DB Browser for SQLite` to open the `history.db` file and add or edit users in the `users` table.

**Important**: When adding a new user, you must provide a `bcrypt` hash for the password, not a plaintext password. You can use an online bcrypt generator or a simple script to create one.

## Security Notes

- The `SESSION_SECRET` should be a strong, random string (at least 32 characters)
- In production, always use HTTPS for secure cookie transmission
- **Password Security**: Passwords are now securely hashed in the database. The original plaintext passwords are no longer stored anywhere after migration.
- Sessions automatically expire after 7 days

To change the password, simply update the `LOCAL_ADMIN_PASSWORD` value in your `.env` file and restart the development server.
