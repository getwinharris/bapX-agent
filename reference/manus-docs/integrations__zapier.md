> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Zapier 

> Connect Manus to 8,000+ apps with no-code automation

## What is Manus for Zapier?

Manus for Zapier allows you to connect Manus with over 8,000 apps and services using visual, no-code workflows. When something happens in one app (like a new email, form submission, or calendar event), you can automatically trigger a Manus task—no programming required.

This transforms Manus from a tool you use manually into an automation engine that works in the background, handling repetitive tasks across your entire tech stack.

## Why Use Manus with Zapier?

Most automation tools can move data between apps, but they can't think, analyze, or create. Zapier + Manus combines:

* **Zapier's connectivity**: 8,000+ apps, triggers, and actions
* **Manus's intelligence**: Research, analysis, content creation, and decision-making

This enables intelligent automation that goes far beyond simple data transfer.

**Traditional Zapier workflows**: "When X happens, copy data to Y"

**Manus + Zapier workflows**: "When X happens, have Manus research, analyze, create content, and deliver results to Y"

## How It Works

### 1. Choose a Trigger

Select an event in another app that starts the workflow.

**Examples**:

* New email in Gmail
* New form submission in Google Forms
* New meeting scheduled in Calendly
* New lead in Salesforce
* New order in Shopify

### 2. Create a Manus Task

When the trigger fires, automatically create a Manus task with a specific prompt.

**Example**:

```
Trigger: New Calendly meeting scheduled
Action: Create Manus task with prompt:
"Research {{company_name}}. Find: employee count, recent news,
key decision makers, and potential pain points. Create a pre-meeting brief."

```

### 3. Manus Executes the Task

Manus receives the task, plans the approach, gathers information, and delivers results—just like it would for a manual task.

### 4. Use the Results

Manus completes the task and delivers results. You can:

* Receive a notification
* Have results sent to another app (Slack, email, Notion, etc.)
* Access the completed task in Manus

## Popular Workflow Examples

### 1. Email-Triggered Research

**Trigger**: New email in Gmail or Outlook

**Manus Task**: Analyze the email and research any companies or topics mentioned

**Result**: Automated research for every important email

**Example**:

```
When: New email from a potential client arrives
Then: Manus researches the company and creates a brief
Result: You're prepared before you even reply

```

***

### 2. Form Submission Analysis

**Trigger**: New Google Forms response

**Manus Task**: Analyze the submission and create a summary or action plan

**Result**: Automated processing of form data

**Example**:

```
When: Customer submits a feature request form
Then: Manus analyzes the request, categorizes it, and drafts a response
Result: Faster response times and better organization

```

***

### 3. Meeting Preparation

**Trigger**: New Calendly meeting scheduled

**Manus Task**: Research the attendee's company and create a pre-meeting brief

**Result**: Automated meeting preparation

**Example**:

```
When: Sales meeting is booked
Then: Manus researches the prospect's company, finds decision makers, and identifies pain points
Result: You walk into every meeting fully prepared

```

***

### 4. Lead Qualification

**Trigger**: New lead in Salesforce or HubSpot

**Manus Task**: Research the company and qualify the lead

**Result**: Automated lead enrichment and scoring

**Example**:

```
When: New lead enters CRM
Then: Manus researches company size, funding, tech stack, and decision makers
Result: Enriched lead records without manual research

```

***

### 5. E-commerce Post-Purchase Campaigns

**Trigger**: New order in Shopify

**Manus Task**: Create personalized follow-up content

**Result**: Automated, intelligent post-purchase engagement

**Example**:

```
When: Customer makes a purchase
Then: Manus creates personalized thank-you email, product tips, and upsell recommendations
Result: Higher engagement and repeat purchases

```

***

### 6. Support Ticket Analysis

**Trigger**: New ticket in Zendesk

**Manus Task**: Analyze the issue and draft a response

**Result**: Faster support response times

**Example**:

```
When: New support ticket arrives
Then: Manus categorizes the issue, suggests a resolution, and drafts a response
Result: Support team reviews and sends, reducing response time

```

***

### 7. Meeting Transcript Processing

**Trigger**: New Zoom meeting transcript available

**Manus Task**: Summarize the meeting and extract action items

**Result**: Automated meeting notes and follow-ups

**Example**:

```
When: Zoom meeting ends and transcript is ready
Then: Manus creates summary, action items, and key decisions
Result: Everyone gets meeting notes automatically

```

***

### 8. Scheduled Research Tasks

**Trigger**: Schedule by Zapier (daily, weekly, monthly)

**Manus Task**: Perform recurring research or analysis

**Result**: Automated competitive intelligence, market monitoring, etc.

**Example**:

```
When: Every Monday at 9 AM
Then: Manus researches competitors' latest blog posts, product updates, and pricing changes
Result: Weekly competitive intelligence report

```

## Available Manus Actions in Zapier

| Action          | Description                                                | Use Case                                      |
| :-------------- | :--------------------------------------------------------- | :-------------------------------------------- |
| **Create Task** | Create a new Manus task with a custom prompt               | Trigger any Manus capability from another app |
| **Get Task**    | Retrieve details of a specific task                        | Check task status or get results              |
| **Update Task** | Modify task properties (title, visibility, shareable link) | Change task settings after creation           |
| **Delete Task** | Remove a task                                              | Clean up completed or unnecessary tasks       |

## Setting Up Manus on Zapier

### 1. Create a Zapier Account

Go to [zapier.com](http://zapier.com) and sign up (free plan available).

### 2. Create a New Zap

Click "Create Zap" in Zapier.

### 3. Choose Your Trigger

Select the app and event that will start the workflow.

**Example**: Gmail → New Email

### 4. Add Manus Action

Search for "Manus" and select "Create Task".

### 5. Connect Your Manus Account

Authorize Zapier to access your Manus account.

### 6. Configure the Task

Set up the Manus task:

* **Prompt**: What you want Manus to do (can include data from the trigger)
* **Mode**: Agent, Chat, or Adaptive
* **Connectors**: Which integrations to enable (optional)

**Example**:

```
Prompt: Research {{company_name}} from the email. Find employee count,
recent funding, and key decision makers. Create a brief.
Mode: Agent

```

### 7. Test and Activate

Test the workflow to make sure it works, then turn it on.

## Tips for Effective Zapier Workflows

### Use Dynamic Data from Triggers

Zapier lets you insert data from the trigger into your Manus prompt.

**Example**:

```
Trigger: New Calendly meeting with {{attendee_name}} from {{company_name}}
Prompt: Research {{company_name}}. Find: employee count, recent news,
and {{attendee_name}}'s role. Create a pre-meeting brief.

```

This makes every task personalized and relevant.

***

### Be Specific in Prompts

**✅ Good**: "Research this company. Find: employee count, recent funding, headquarters location, and key products. Return as a structured brief."

**❌ Vague**: "Research this company"

Specific prompts ensure consistent, useful results.

***

### Combine Multiple Actions

You can chain multiple actions together:

1. Trigger: New form submission
2. Action 1: Manus creates analysis
3. Action 2: Send results to Slack
4. Action 3: Save to Google Sheets

This creates complete, end-to-end automation.

***

### Use Filters for Precision

Add Zapier filters to only trigger Manus for specific conditions.

**Example**:

```
Trigger: New email in Gmail
Filter: Only if subject contains "partnership inquiry"
Action: Manus researches the sender's company

```

This prevents unnecessary tasks and saves credits.

***

### Schedule Recurring Tasks

Use "Schedule by Zapier" to trigger Manus tasks on a schedule:

* Daily competitive research
* Weekly market analysis
* Monthly performance reports

**Example**:

```
Trigger: Every Monday at 9 AM
Action: Manus researches competitors and creates a weekly report

```

## Common Questions

<AccordionGroup>
  <Accordion title="Do I need a paid Zapier plan to use Manus?" icon="sparkles">
    No. Manus works with Zapier's free plan, though paid plans offer more tasks and features.
  </Accordion>

  <Accordion title="Can I use Manus with multiple apps in one workflow?" icon="sparkles">
    Yes. You can create multi-step Zaps that involve Manus and multiple other apps.
  </Accordion>

  <Accordion title="How do I get the results from a Manus task in Zapier? ">
    Use the "Get Task" action to retrieve task details and results. You can then send those results to other apps.
  </Accordion>

  <Accordion title="What's the difference between using Zapier and the Manus API? ">
    Zapier is no-code and visual—great for non-developers. The Manus API requires programming but offers more flexibility and control.
  </Accordion>
</AccordionGroup>

**Next steps**: [Connect Manus on Zapier](https://zapier.com/apps/manus/integrations) and build your first intelligent workflow.