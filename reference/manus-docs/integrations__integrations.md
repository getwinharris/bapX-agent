> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Integrate Manus with Your Existing Tools

> Connect Manus to your tools and workflows

***

## What are Integrations?

Integrations allow Manus to connect with the tools and services you already use—Gmail, Notion, Stripe, Slack, Google Calendar, and more. Instead of working in isolation, Manus can read data from your connected apps, perform actions across multiple platforms, and deliver results directly into your existing workflows.

Integrations transform Manus from a standalone AI assistant into a central orchestration layer for your digital workspace. A single prompt can trigger actions across multiple apps, eliminating the need to constantly switch between tools and manually transfer information.

## Types of Integrations

Manus offers several integration options to fit different workflows and technical requirements:

### MCP Connectors

**Model Context Protocol (MCP) connectors** are prebuilt integrations with popular tools and services. These connectors allow Manus to access your data and perform actions within connected apps using OAuth authentication.

**Available connectors include**: Gmail, Notion, Stripe, HubSpot, Slack, Google Calendar, Hugging Face, Google Drive, GitHub, and more.

**Use cases**: Multi-app workflows, automated data synchronization, cross-platform task execution.

**Learn more**: [MCP Connectors documentation](/integrations/mcp-connectors)

### Custom MCP Servers

For organizations with internal tools or specialized requirements, Manus supports **custom MCP servers**. This allows you to build integrations with proprietary systems, internal APIs, or third-party services not covered by prebuilt connectors.

**Use cases**: Internal CRM systems, custom databases, proprietary APIs, specialized enterprise tools.

**Learn more**: [Custom MCP Servers documentation](/integrations/custom-mcp)

### Zapier Integration

Connect Manus to thousands of apps through **Zapier**, enabling automated workflows that trigger based on events in your connected tools. Use Zapier to create multi-step automations that involve Manus alongside other services.

**Use cases**: Automated reporting, event-driven task creation, cross-platform notifications.

**Learn more**: [Zapier Integration documentation](/integrations/zapier)

### Slack Integration

Integrate Manus with **Slack** to receive notifications, updates, and results directly in your team channels. Share Manus outputs with your team without leaving Slack.

**Use cases**: Team notifications, collaborative task tracking, shared research results.

**Learn more**: [Slack Integration documentation](/integrations/slack-integration)

### Manus API

Access Manus programmatically through the **Manus API**, allowing you to build custom applications, automate workflows, and integrate Manus into your own software systems.

**Use cases**: Custom applications, workflow automation, embedded AI capabilities.

**Learn more**: [Manus API documentation](https://open.manus.ai/docs)

### Data Sources

Access premium third-party data APIs integrated into Manus, enabling real-time data enrichment for your tasks without managing extra API keys or integrations.

**Use cases**: Market research, financial analysis, social media monitoring, economic data retrieval.

**Learn more**: [Data Sources documentation](/integrations/data-sources)

***

## Why Use Integrations?

### Eliminate App-Switching

Instead of manually copying information between tools, Manus handles data transfer automatically. A single prompt can read from one app, process the information, and write results to another.

### Unified Workflows

Integrations allow you to create workflows that span multiple platforms. Update your CRM, send emails, create calendar events, and log tasks—all from a single Manus prompt.

### Contextual Intelligence

When Manus has access to your connected tools, it can use real data from your workflows to provide more accurate and relevant results. No more generic responses—Manus works with your actual documents, emails, and data.

### Automation at Scale

Combine integrations with features like Wide Research and Scheduled Tasks to automate repetitive workflows across multiple platforms. Process hundreds of items, update multiple systems, and maintain synchronization without manual intervention.

## Getting Started

1. **Choose your integration type** based on your needs (MCP Connectors for common tools, Custom MCP for proprietary systems, Zapier for automation, etc.)
2. **Connect your accounts** using OAuth or API keys (depending on integration type)
3. **Test with a simple workflow** to verify the connection works correctly
4. **Build more complex workflows** combining multiple integrations

## Security and Permissions

All integrations use secure authentication methods (OAuth 2.0 or API keys) and respect the permissions you grant. You can review and revoke access to any integration at any time through your Manus settings.

**Manus only accesses data you explicitly authorize** and uses it solely to complete the tasks you request. Integration connections are personal to your account and not shared with other users unless you explicitly collaborate on a task.

***

**Next steps**: Explore [MCP Connectors](/integrations/mcp-connectors) to see available integrations, or learn how to build [Custom MCP Servers](/integrations/custom-mcp) for specialized needs.