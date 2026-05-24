> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Access Control

> Manage access for your web application 

Manus provides robust access control features to ensure that your application and its content are only accessible to the intended audience. You can secure your entire site or just specific sections, giving you granular control over who sees what.

## Built-in Login System

<img src="https://mintcdn.com/docs-manus/EE36eqTNqZEZbTCr/images/Screenshot2025-12-05at10.43.25AM.png?fit=max&auto=format&n=EE36eqTNqZEZbTCr&q=85&s=56e9ea78a5cb6ac79e59b9de9a71a2f1" alt="Screenshot2025 12 05at10 43 25AM Pn" width="1898" height="730" data-path="images/Screenshot2025-12-05at10.43.25AM.png" />

With a simple command, you can add a complete user authentication system to your application. This is essential for creating member-only areas, personalized content, and any feature that requires users to have an account.

The built-in system includes:

* **User Registration**: Allow users to sign up for an account with their email and a password.
* **Login/Logout**: Securely authenticate users and manage their sessions.
* **User Management**: View and manage your user base from a central dashboard.

**Example Prompt:**

> "Add a user login and registration system to my site. The login button should be in the top-right corner of the navigation bar."

## Role-Based and Individual Permissions

You can restrict access to your entire application or specific pages to certain individuals or teams. This is perfect for building internal tools, client portals, or staging environments.

| Use Case                 | Description                                                                                                                    |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Internal Tools**       | Build applications that are only accessible to your team, such as an internal dashboard or a knowledge base.                   |
| **Client Portals**       | Create private, secure areas for your clients to view their project status, access exclusive content, or manage their account. |
| **Staging Environments** | Share a preview of your application with stakeholders for feedback before making it public.                                    |

**Example Prompt:**

> "Make the ‘/admin’ section of this site accessible only to users with the ‘Admin’ role. All other users should be redirected to the homepage."