> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# MCP Connectors

> Connect Manus to your team’s tools and enable context-driven creation — moving from idea to validation to live app faster than ever.

## What are MCP Connectors?

MCP (Model Context Protocol) connectors are prebuilt integrations that connect Manus to popular tools and services in your workflow. When you connect an app through MCP, Manus can read data from that app, perform actions within it, and coordinate workflows across multiple platforms—all from a single natural language prompt.

MCP connectors eliminate the need to manually switch between apps, copy information, or perform repetitive tasks across different tools. Instead of working in isolation, Manus becomes a central orchestration layer that understands your entire digital workspace.

### **Integrate Manus with your tools using MCP servers**

<iframe src="https://www.youtube.com/embed/DwX3awL24W8" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

**MCP (Model Context Protocol)** is an open standard that connects AI Agents, like Manus, to external tools, services, and data sources. By connecting Manus to tools such as Notion, Atlassian, or Linear, the Manus Agent can use real team context to generate more accurate code, prototypes, and documentation.

When you connect an MCP server, Manus can read structured data (like text from docs, issues, or diagrams) and, where supported, perform limited actions such as creating or updating items. Manus includes several prebuilt MCP servers on all plans.

## **Why connect MCP servers**

In Manus, MCP servers unlock two key capabilities:

* **Bring your existing context into Manus.**\
  Manus  can read your team’s documentation, tickets, and design files to build prototypes and flows aligned with your standards.
* **Connect Manus to your workflows.**\
  Manus can take follow-up actions in your connected tools — such as updating ticket statuses, adding prototype links as comments, or creating new items when supported.

Manus becomes more powerful when it understands your team’s world — eliminating guesswork, speeding up iteration, and helping you go from idea to live app faster than ever\*\*.\*\*

## How MCP Connectors Work

Connecting an app to Manus follows a simple three-step process:

1. Select a Connector: Choose from available integrations in your Manus settings. Popular options include Gmail, Notion, Stripe, HubSpot, Slack, Google Calendar, and Hugging Face.
2. Authenticate: Sign in to the service you want to connect and grant Manus the permissions it needs. This uses OAuth 2.0, the same secure authentication method used by major platforms. You control exactly what Manus can access.
3. Start Using: Once connected, simply mention the app in your prompts. Manus automatically uses the appropriate connector to read data or perform actions.[**​**](https://docs.lovable.dev/integrations/mcp-servers#prebuilt-mcp-servers)

## Multi-App Workflow Examples

The real power of MCP connectors emerges when you combine multiple integrations in a single workflow. Here are examples of what becomes possible:

### Notion + Google Calendar

**Prompt**:

```
Here's a link to my Notion event planning document. Write event descriptions for each item and add them to my Google Calendar."
```

**What Manus Does**:

1. Reads the Notion document to understand the event list
2. Generates appropriate descriptions for each event
3. Creates calendar entries in Google Calendar with the details
4. Updates the Notion document to reflect that events have been scheduled

**Why This Works**: Instead of manually copying information between Notion and Calendar, Manus handles the entire workflow. Information stays synchronized, and you save time on repetitive data entry.

### Gmail + Document Analysis

**Prompt**:

```
Check my Gmail for startup pitch emails from this week. Analyze the attached pitch decks and create a summary with key questions for each founder.
```

What Manus Does:

1. Searches Gmail for relevant emails based on your criteria
2. Downloads and analyzes pitch deck attachments
3. Extracts key information (problem, solution, team, metrics, risks)
4. Generates thoughtful questions for each founder
5. Creates a summary document with analysis and questions

Why This Works: Manus processes multiple emails and documents in parallel, extracting insights and preparing you for meetings without requiring you to manually review each pitch.

### Stripe + Data Analysis

**Prompt**:

```
Pull my Stripe revenue data for the past quarter, combine it with this CSV file of expenses, and create a financial projection spreadsheet.
```

What Manus Does:

1. Connects to your Stripe account and retrieves transaction data
2. Processes the uploaded CSV file with expense information
3. Combines both data sources into a unified dataset
4. Generates financial projections based on historical trends
5. Creates a formatted spreadsheet with charts and insights

Why This Works: Manus accesses real financial data from Stripe, eliminating manual export and data entry. The result is an accurate, up-to-date financial analysis based on your actual business metrics.

### HubSpot + Gmail + Notion

**Prompt**:

```
Find my sales call notes from Gmail, update the deal status in HubSpot, and create follow-up tasks in Notion."
```

What Manus Does:

1. Searches Gmail for sales call notes
2. Extracts key information and outcomes from the notes
3. Updates the corresponding deal in HubSpot with new status and notes
4. Creates actionable follow-up tasks in Notion with deadlines
5. Links all three systems so information stays synchronized

Why This Works: A single workflow updates your CRM, task manager, and email system. No manual data entry, no risk of forgetting to update a system, and complete visibility across platforms.

## Available Connectors

Manus offers MCP connectors for a growing list of popular tools and services, organized by category:

| Category           | Connectors                                   |
| :----------------- | :------------------------------------------- |
| **Productivity**   | Gmail, Google Calendar, Google Drive, Notion |
| **Business & CRM** | HubSpot, Stripe                              |
| **Development**    | GitHub, Hugging Face                         |

**Note**: This list represents commonly used connectors. Additional integrations are available, and new connectors are added regularly. Check your Manus settings to see the full list of available integrations.