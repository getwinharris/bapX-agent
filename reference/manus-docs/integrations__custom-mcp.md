> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Custom MCP Servers

> Build integrations with your internal tools and proprietary systems

## What are Custom MCP Servers?

Custom MCP servers allow you to extend Manus's integration capabilities beyond prebuilt connectors. If your organization uses internal tools, proprietary APIs, or specialized services not covered by standard MCP connectors, you can build a custom server that connects Manus to those systems.

A custom MCP server acts as a bridge between Manus and your internal infrastructure, enabling the same seamless multi-app workflows you get with prebuilt connectors—but tailored to your specific tools and requirements.

## Why Build Custom MCP Servers?

### Internal Systems

Many organizations rely on custom-built tools, internal databases, or proprietary software. Custom MCP servers allow Manus to integrate with these systems, bringing internal data into your AI workflows.

**Examples**:

* Internal CRM or customer database
* Proprietary project management tools
* Custom analytics platforms
* Legacy systems with APIs

### Specialized Services

Some third-party services don't have prebuilt MCP connectors. If you use a specialized tool or niche service, you can build a custom server to connect it to Manus.

**Examples**:

* Industry-specific software
* Regional services not covered by standard connectors
* Emerging platforms without official integrations

### Custom Business Logic

Custom MCP servers can implement business-specific logic, data transformations, or validation rules that go beyond simple API calls. This allows you to enforce organizational policies and workflows within Manus integrations.

**Examples**:

* Approval workflows before data updates
* Data validation against internal standards
* Custom authentication or security requirements
* Multi-step processes specific to your organization

## How Custom MCP Servers Work

A custom MCP server is a lightweight service that implements the Model Context Protocol specification. It exposes endpoints that Manus can call to read data, perform actions, or execute custom logic within your systems.

### Architecture

**Your Internal System** ↔ **Custom MCP Server** ↔ **Manus**

The MCP server sits between Manus and your internal systems, translating Manus requests into actions within your tools and returning results in a format Manus understands.

### Protocol

Custom MCP servers implement a standardized protocol that defines:

* **Tools**: Actions Manus can perform (e.g., "get\_customer\_data", "update\_project\_status")
* **Resources**: Data Manus can read (e.g., documents, records, files)
* **Prompts**: Predefined templates for common operations

## Building a Custom MCP Server

### Prerequisites

* **API access** to the system you want to integrate
* **Development environment** (Node.js, Python, or any language that can run a web server)
* **Understanding of the MCP specification** (available in Manus documentation)

### Basic Implementation

A minimal custom MCP server includes:

1. **Server endpoint**: A web service that responds to MCP protocol requests
2. **Tool definitions**: Descriptions of actions Manus can perform
3. **Authentication**: Secure handling of credentials and API keys
4. **Request handlers**: Logic that executes actions and returns results

### Example: Internal CRM Integration

Here's a conceptual example of a custom MCP server for an internal CRM:

**Tools exposed**:

* `get_customer_info(customer_id)`: Retrieve customer details
* `update_customer_notes(customer_id, notes)`: Add notes to customer record
* `search_customers(query)`: Search customer database
* `create_follow_up_task(customer_id, task_description, due_date)`: Create task

**Authentication**: API key or OAuth token for your internal CRM

**Deployment**: Hosted on your infrastructure or a secure cloud environment

Once deployed, you connect this custom server to Manus, and it appears alongside prebuilt connectors. You can then use natural language prompts like:

* "Get customer information for customer ID 12345"
* "Search for customers in the San Francisco area"
* "Update notes for customer 67890 with our recent conversation"

## Connecting a Custom MCP Server

### Step 1: Deploy Your Server

Host your custom MCP server on infrastructure you control. Ensure it's accessible via HTTPS and has proper security measures in place.

### Step 2: Add to Manus

In Manus, navigate to **Settings → Integrations → Custom MCP Servers** and click **Add Server**.

### Step 3: Provide Server Details

Enter the following information:

* **Server name**: A descriptive name (e.g., "Internal CRM", "Analytics Platform")
* **Server URL**: The HTTPS endpoint where your MCP server is hosted
* **Authentication**: API key, Bearer token, or other credentials required

### Step 4: Test Connection

Manus will verify it can communicate with your server and retrieve the list of available tools.

### Step 5: Start Using

Once connected, your custom tools appear in Manus's available integrations. Reference them in prompts just like prebuilt connectors.

## Security Considerations

### Authentication

Custom MCP servers should implement robust authentication:

* Use API keys, OAuth tokens, or other secure methods
* Never expose credentials in URLs or logs
* Rotate credentials regularly

### Authorization

Implement proper authorization checks:

* Verify that the requesting user has permission to access data
* Enforce role-based access control (RBAC) if applicable
* Log all access attempts for audit purposes

### Data Transmission

* Use HTTPS for all communication
* Encrypt sensitive data at rest and in transit
* Implement rate limiting to prevent abuse

### Network Security

* Deploy MCP servers within your secure network perimeter
* Use firewalls and access controls to restrict who can reach the server
* Consider VPN or private network connections for highly sensitive integrations

## Best Practices

### Tool Design

**Keep tools focused**: Each tool should perform one clear action. Instead of a single "manage\_customer" tool, create separate tools for "get\_customer", "update\_customer", "delete\_customer".

**Provide clear descriptions**: Manus uses tool descriptions to understand when to use each tool. Write clear, specific descriptions that explain what the tool does and when it's appropriate.

**Handle errors gracefully**: Return meaningful error messages that help Manus (and users) understand what went wrong and how to fix it.

### Performance

**Optimize response times**: Manus waits for MCP server responses. Keep operations fast by caching data, using efficient queries, and avoiding unnecessary processing.

**Implement timeouts**: Set reasonable timeouts for API calls to prevent Manus from waiting indefinitely if your internal system is slow or unresponsive.

**Use async operations for long tasks**: If an operation takes more than a few seconds, consider returning immediately with a task ID and providing a separate tool to check status.

### Monitoring

**Log all requests**: Track what Manus is requesting and how your server responds. This helps with debugging and understanding usage patterns.

**Monitor performance**: Track response times, error rates, and usage volume to identify issues before they impact users.

**Set up alerts**: Get notified if your MCP server becomes unresponsive or starts returning errors.

## Example Use Cases

### Internal Knowledge Base

**Scenario**: Your organization has an internal wiki or knowledge base with company policies, procedures, and documentation.

**Custom MCP Server**: Provides tools to search the knowledge base, retrieve specific articles, and find related documents.

**Manus Workflow**: "Search our internal knowledge base for the expense reimbursement policy and summarize the key points."

***

### Custom Analytics Platform

**Scenario**: You have a proprietary analytics platform that tracks business metrics not available in standard tools.

**Custom MCP Server**: Exposes tools to query metrics, generate reports, and retrieve historical data.

**Manus Workflow**: "Pull our customer acquisition cost data for Q4 and create a trend analysis comparing it to Q3."

***

### Legacy System Integration

**Scenario**: Your organization relies on a legacy system that doesn't have modern APIs or integrations.

**Custom MCP Server**: Acts as a wrapper around the legacy system, translating modern API calls into the format the legacy system understands.

**Manus Workflow**: "Check inventory levels in the legacy system for product SKU 98765 and create a reorder request if stock is below 100 units."

***

### Multi-Step Approval Workflows

**Scenario**: Your organization requires approval workflows for certain actions (e.g., budget requests, data access).

**Custom MCP Server**: Implements tools that create approval requests, check approval status, and execute approved actions.

**Manus Workflow**: "Create a budget request for \$50,000 for the marketing campaign and notify the finance team for approval."

## Common Questions

<AccordionGroup>
  <Accordion title="Do I need to be a developer to build custom MCP servers?" icon="sparkles">
    Building custom MCP servers requires development skills. However, the MCP specification is straightforward, and example implementations are available to help you get started.
  </Accordion>

  <Accordion title="Can I use existing APIs without building a custom server?" icon="sparkles">
    If a service has a well-documented REST API, you may be able to use Manus's general API calling capabilities without a custom MCP server. However, a custom server provides better integration, clearer tool definitions, and more reliable workflows.
  </Accordion>

  <Accordion title="Are there performance requirements? ">
    Custom MCP servers should respond within a few seconds for most operations. Longer operations should use async patterns. Manus will time out requests that take too long.
  </Accordion>

  <Accordion title="How do I maintain custom MCP servers?">
    Treat custom MCP servers like any other internal service: version control, automated testing, monitoring, and regular updates. Keep the server in sync with changes to your internal systems' APIs.
  </Accordion>
</AccordionGroup>