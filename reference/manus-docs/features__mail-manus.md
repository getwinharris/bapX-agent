> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Mail Manus

> Email-based task interface for Manus AI agent

## What is Mail Manus?

Mail Manus is where you can trigger Manus tasks by forwarding emails to a unique bot address. Instead of switching between your inbox and the Manus app, you can delegate work directly from your email client and receive results back via email.

This approach integrates Manus into existing email workflows, making it particularly useful for processing incoming emails, handling email-based requests, and automating recurring email tasks without leaving your inbox.

## How to set up Mail Manus

<iframe src="https://www.youtube.com/embed/f7cw00S7PpA" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

**1. Unique Bot Address**: Each user receives a personal Manus email address (e.g., `your-name-abc123@mail.manus.ai`)

Navigate to Settings → Mail Manus and copy your unique bot email address.

<img src="https://mintcdn.com/docs-manus/C1PisAhqAuyVufRp/images/mail-manus.png?fit=max&auto=format&n=C1PisAhqAuyVufRp&q=85&s=24f1c355fbef1e604926d35ed6529573" alt="Mail Manus" width="1494" height="1090" data-path="images/mail-manus.png" />

**2. Forward or CC**: Forward emails to this address, or CC it in conversations to trigger tasks

**3. Task Processing**: Manus analyzes the email content, attachments, and any instructions you provide

**4. Email Delivery**: Results are sent back to your inbox as email responses, with attachments when applicable

**5. Security**: Only emails from pre-approved sender addresses can trigger tasks

## Advanced Features: How to setup email workflows

<iframe src="https://www.youtube.com/embed/VU28Afcnm7U" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

### Workflow Automation

For recurring tasks like travel bookings, expense receipts, or invoice processing, you can set up **workflow emails**—dedicated Manus bot addresses that automatically handle specific types of emails.

### What are Workflow Emails?

Workflow emails are specialized Manus bot addresses designed for specific recurring tasks. Instead of using your main Mail Manus address, you create purpose-specific addresses like:

* `travel@manus.bot` - For flight, hotel, and conference bookings
* `expenses@manus.bot` - For receipts and expense tracking
* `invoices@manus.bot` - For invoice processing and logging

### How to Set Up Workflow Automation

**Step 1: Create Your Workflow Email**

In Manus Settings → Mail Manus → Workflow Emails, create a new workflow email:

```
Name: Business Travel
Address: travel@manus.bot
Default Prompt: "Build my itinerary, add check-ins to Calendar, set reminders, and buffer time for travels."
```

**Step 2: Set Up Email Filter**

<img src="https://mintcdn.com/docs-manus/C1PisAhqAuyVufRp/images/mail-manus2.png?fit=max&auto=format&n=C1PisAhqAuyVufRp&q=85&s=4cbaf80c5ed950aa68649e0ea5485954" alt="Mail Manus" width="2196" height="1044" data-path="images/mail-manus2.png" />

In your email client (Gmail/Outlook), create a filter to match specific emails:

**Example: Travel Bookings Filter (Gmail)**

```
From: noreply@trip.com, notifly@notifly.flyscoot.com
Subject: Business travel
Includes words: "booking confirmation," "flight," "hotel"
```

**Example: Expense Receipts Filter (Gmail)**

```
From: no-reply@uber.com
Subject: Uber E-Receipt
```

**Step 3: Connect Filter to Workflow Email**

Set the filter action to auto-forward matching emails to your workflow email:

```
When message matches criteria:
☑ Forward it to: travel@manus.bot
```

**Step 4: Automatic Processing**

Once set up, matching emails are automatically:

1. Forwarded to your workflow email
2. Processed by Manus using the default prompt
3. Results sent back to your inbox

### Real-World Workflow Examples

**Travel Management Workflow**

```
Workflow Email: travel@manus.bot
Filter: From airlines, hotels, conference organizers
Default Prompt: "Extract: dates, locations, confirmation numbers.
                Add to Google Calendar with 1-hour buffer before flights.
                Set reminders 24h and 2h before departure."

Result: Every booking confirmation automatically becomes calendar events
        with appropriate reminders and travel buffers.
```

**Expense Tracking Workflow**

```
Workflow Email: expenses@manus.bot
Filter: From Uber, Grab, Lyft (receipt emails)
Default Prompt: "Extract: date, amount, category, merchant.
                Log to Notion Expenses database."

Result: All ride-sharing receipts automatically logged to expense tracker.
```

**Invoice Processing Workflow**

```
Workflow Email: invoices@manus.bot
Filter: Subject contains "Invoice" + has PDF attachment
Default Prompt: "Extract: invoice number, date, amount, vendor, due date.
                Add to Accounting spreadsheet.
                Set reminder 3 days before due date."

Result: Incoming invoices automatically parsed and tracked with payment reminders.
```

**Customer Feedback Workflow**

```
Workflow Email: feedback@manus.bot
Filter: Subject contains "feedback" or "review"
Default Prompt: "Analyze sentiment (positive/negative/neutral).
                Extract key issues and suggestions.
                Post summary to Slack #customer-feedback channel."

Result: Customer feedback automatically analyzed and shared with team.
```

## Security and Privacy

### Approved Senders

Only emails from pre-approved addresses can trigger Manus tasks. Configure approved senders in Settings → Mail Manus → Approved Senders.

**Why**: Prevents unauthorized use of your Manus bot address.

### Email Privacy

Manus processes email content to execute tasks. Emails are handled according to Manus's privacy policy and data handling practices.

## Tips for Better Results

| Tip                  | Good Example                                              | Poor Example               |
| :------------------- | :-------------------------------------------------------- | :------------------------- |
| **Be specific**      | "Create a table with columns: name, company, role, email" | "Organize this"            |
| **Provide context**  | "I'm evaluating CRM vendors for our sales team"           | \[No context provided]     |
| **Specify format**   | "Generate a slide deck with findings"                     | "Give me the results"      |
| **Use subject line** | Subject: "Extract key dates and deadlines"                | \[Blank subject]           |
| **Combine features** | "Use Wide Research to analyze all 50 items"               | \[Single-threaded request] |

## When to Use Mail Manus

**Ideal For**:

* Processing incoming emails that require research or analysis
* Converting email threads into structured outputs
* Automating recurring email-based tasks
* Delegating work without leaving your inbox
* Collaborating with team members via email

**Not Ideal For**:

* Tasks requiring real-time interaction (use Manus app instead)
* Highly sensitive information (use direct app interface)
* Tasks requiring immediate results (email has inherent latency)

## Common Questions

<AccordionGroup>
  <Accordion title="Is my Mail Manus address private? " icon="sparkles">
    Yes. Your bot email address is unique and only processes emails from approved senders.
  </Accordion>

  <Accordion title="What types of attachments can Manus process?">
    PDFs, Word documents, Excel spreadsheets, images, CSVs, and other common formats.
  </Accordion>

  <Accordion title="How long does processing take?">
    Depends on task complexity. Simple summaries take 1-2 minutes; comprehensive research may take 10-15 minutes. Status updates are sent via email.
  </Accordion>

  <Accordion title="How long does processing take? ">
    Depends on task complexity. Simple summaries take 1-2 minutes; comprehensive research may take 10-15 minutes. Status updates are sent via email.
  </Accordion>

  <Accordion title="Can I cancel a task after forwarding?">
    Yes. Reply to the status email with "Cancel" or stop the task from the Manus app.
  </Accordion>

  <Accordion title="Does Mail Manus use credits?">
    Yes. Tasks triggered via email consume credits like any other Manus task.
  </Accordion>

  <Accordion title="Can I share my Mail Manus address? ">
    No. Each user has a unique address. However, you can CC colleagues in emails to Manus for collaboration.
  </Accordion>

  <Accordion title="What happens if I forward something by mistake? ">
    Manus sends a confirmation email before starting complex tasks, allowing you to cancel if needed.

    ##
  </Accordion>
</AccordionGroup>

***