> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Scheduled Tasks

> Automate recurring work—run tasks on schedules or at specific times

export const CodePrompt = ({children}) => {
  const [isCopied, setIsCopied] = useState(false);
  const textContent = useMemo(() => {
    const extractText = (children, depth = 0) => {
      const maxDepth = 10;
      if (depth > maxDepth) return '';
      if (children == null) return '';
      if (typeof children === 'string' || typeof children === 'number') {
        return String(children);
      }
      if (Array.isArray(children)) {
        return children.map(child => extractText(child, depth + 1)).join('');
      }
      if (typeof children === 'object' && children.props) {
        return extractText(children.props.children, depth + 1);
      }
      return '';
    };
    return extractText(children);
  }, [children]);
  const handleAskManus = useCallback(() => {
    const url = new URL('https://manus.im');
    if (textContent) {
      url.searchParams.set('q', textContent);
      url.searchParams.set('submit', '1');
    }
    window.open(url.toString(), '_blank');
  }, [textContent]);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = textContent;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error(fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [textContent]);
  return <div className="code-block mt-5 mb-8 not-prose rounded-2xl relative group text-gray-950 dark:text-gray-50 codeblock-light border border-gray-950/10 dark:border-white/10 dark:twoslash-dark bg-transparent dark:bg-transparent">
      <div className="absolute top-3 right-4 flex items-center gap-1.5">
        <div className="z-10 relative">
          <button onClick={handleCopy} className="h-[26px] w-[26px] flex items-center justify-center rounded-md backdrop-blur peer group/copy-button " data-testid="copy-code-button" aria-label="Copy the contents from the code block">
            {isCopied ? <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg" class="fill-primary dark:fill-primary-light">
                <path d="M14.7813 1.21873C15.0751 1.51248 15.0751 1.98748 14.7813 2.2781L6.53135 10.5312C6.2376 10.825 5.7626 10.825 5.47197 10.5312L1.21885 6.28123C0.925098 5.98748 0.925098 5.51248 1.21885 5.22185C1.5126 4.93123 1.9876 4.9281 2.27822 5.22185L5.99697 8.9406L13.7188 1.21873C14.0126 0.924976 14.4876 0.924976 14.7782 1.21873H14.7813Z"></path>
              </svg> : <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 group-hover/copy-button:text-gray-500 dark:text-white/40 dark:group-hover/copy-button:text-white/60">
                <path d="M14.25 5.25H7.25C6.14543 5.25 5.25 6.14543 5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H14.25C15.3546 16.25 16.25 15.3546 16.25 14.25V7.25C16.25 6.14543 15.3546 5.25 14.25 5.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M2.80103 11.998L1.77203 5.07397C1.61003 3.98097 2.36403 2.96397 3.45603 2.80197L10.38 1.77297C11.313 1.63397 12.19 2.16297 12.528 3.00097" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>}
          </button>
          <div aria-hidden="true" className="absolute top-11 left-1/2 transform whitespace-nowrap -translate-x-1/2 -translate-y-1/2 peer-hover:opacity-100 opacity-0 text-white rounded-lg px-1.5 py-0.5 text-xs bg-primary-dark">
            {isCopied ? 'Copied' : 'Copy'}
          </div>
        </div>
        <div className="z-10 relative">
          <button onClick={handleAskManus} className="h-[26px] w-[26px] flex items-center justify-center rounded-md backdrop-blur peer group/ask-manus " id="ask-ai-code-block-button" aria-label="Ask Manus">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4 text-gray-400 group-hover/ask-manus:text-gray-500 dark:text-white/40 dark:group-hover/ask-manus:text-white/60">
              <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
              <path d="M12 8v6" />
              <path d="M9 11h6" />
            </svg>
          </button>
          <div aria-hidden="true" className="absolute top-11 left-1/2 transform whitespace-nowrap -translate-x-1/2 -translate-y-1/2 peer-hover:opacity-100 opacity-0 text-white rounded-lg px-1.5 py-0.5 text-xs bg-primary-dark">
            Ask Manus
          </div>
        </div>
      </div>

      <div className="w-0 min-w-full max-w-full py-3.5 px-4 h-full dark:bg-codeblock relative text-sm leading-6 children:!my-0 children:!shadow-none children:!bg-transparent transition-[height] duration-300 ease-in-out code-block-background [&_*]:ring-0 [&_*]:outline-0 [&_*]:focus:ring-0 [&_*]:focus:outline-0 [&_pre>code]:pr-[3rem] [&_pre>code>span.line-highlight]:min-w-[calc(100%+3rem)] [&_pre>code>span.line-diff]:min-w-[calc(100%+3rem)] rounded-2xl bg-white overflow-x-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-black/15 hover:scrollbar-thumb-black/20 active:scrollbar-thumb-black/20 dark:scrollbar-thumb-white/20 dark:hover:scrollbar-thumb-white/25 dark:active:scrollbar-thumb-white/25" style={{
    fontVariantLigatures: 'none',
    height: 'auto',
    backgroundColor: 'rgb(255, 255, 255)'
  }}>
        <div className="font-mono whitespace-pre leading-6">{children}</div>
      </div>
    </div>;
};

Scheduled Tasks let you automate recurring work by having Manus execute tasks on a schedule. Set it once, and Manus handles it automatically—daily reports, weekly research, monthly analysis, or any recurring workflow.

<iframe src="https://www.youtube.com/embed/X1z7ZgXm1Lo" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

## Quick Start

### One-Time Task

<CodePrompt>
  "Run this task tomorrow at 9 AM: Research top AI news from the past 24 hours
  and email me a summary"
</CodePrompt>

### Recurring Task

<CodePrompt>
  "Every Monday at 8 AM, research our top 5 competitors and send me
  a summary of any product updates or news from the past week"
</CodePrompt>

### Complex Schedule

<CodePrompt>
  "On the 1st of every month, analyze our website traffic data,
  create a report with key insights, and post it to our Notion database
</CodePrompt>

## When to Use Scheduled Tasks

Use for:

* **Recurring research** (daily news summaries, weekly competitor updates)
* **Regular reports** (monthly analytics, weekly performance summaries)
* **Periodic data collection** (scraping prices, tracking mentions)
* **Automated monitoring** (checking for updates, tracking changes)

Don't use for:

* One-off tasks you need right now (just run them normally)
* Real-time monitoring (scheduled tasks run at specific times, not continuously)

## Quick Examples

### Example 1: Daily News Digest

<CodePrompt>
  "Every weekday at 7 AM, research AI industry news from the past 24 hours.
  Focus on: funding announcements, product launches, and major partnerships.
  Email me a 5-bullet summary."
</CodePrompt>

**Schedule**: Daily at 7 AM (weekdays only)

**Output**: Email with curated news summary

### Example 2: Weekly Competitor Tracking

<CodePrompt>
  "Every Friday at 5 PM, check these 10 competitors for: new blog posts,
  product updates, pricing changes, and job postings. Create a comparison
  table and save to Google Drive."
</CodePrompt>

**Schedule**: Weekly (Fridays at 5 PM)

**Output**: Comparison table in Google Drive

### Example 3: Monthly Analytics Report

<CodePrompt>
  "On the 1st of each month, analyze last month's website traffic.
  Create a slide deck with: visitor trends, top pages, traffic sources,
  and key insights. Post to Slack #marketing."
</CodePrompt>

**Schedule**: Monthly (1st day at 9 AM)

**Output**: Slide deck posted to Slack

## How to Set Up

**Step 1: Describe the task** Be specific about what you want Manus to do.

**Step 2: Specify the schedule**

* "Every day at 9 AM"
* "Every Monday at 8 AM"
* "On the 1st of every month"
* "Every weekday at 7 AM"
* "Tomorrow at 3 PM" (one-time)

**Step 3: Define the output**

* Email results to you
* Post to Slack channel
* Save to Google Drive
* Update a spreadsheet
* Send via connector

## Schedule Options

| Schedule Type | Example                              | Use Case                            |
| :------------ | :----------------------------------- | :---------------------------------- |
| **Daily**     | "Every day at 9 AM"                  | News summaries, daily metrics       |
| **Weekdays**  | "Every weekday at 8 AM"              | Business reports, work updates      |
| **Weekly**    | "Every Monday at 10 AM"              | Weekly reviews, competitor tracking |
| **Monthly**   | "On the 1st at 9 AM"                 | Monthly reports, billing analysis   |
| **Custom**    | "Every Tuesday and Thursday at 2 PM" | Specific recurring needs            |
| **One-Time**  | "Tomorrow at 3 PM"                   | Delayed execution                   |

## Managing Scheduled Tasks

**View active schedules**: Navigate to Settings → Scheduled Tasks to see all active schedules.

**Pause a schedule**: Toggle off any schedule temporarily without deleting it.

**Edit a schedule**: Modify timing, task description, or output method.

**Delete a schedule**: Remove schedules you no longer need.

**View execution history**: See past runs, results, and any errors.

## Tips for Better Scheduled Tasks

**Be specific about timing**:

* ✅ "Every weekday at 8 AM EST"
* ❌ "In the morning"

**Define clear outputs**:

* ✅ "Email me a 5-bullet summary"
* ✅ "Post to Slack #team channel"
* ❌ "Let me know what you find"

**Include time ranges for research**:

* ✅ "News from the past 24 hours"
* ✅ "Updates since last week"
* ❌ "Recent news" (ambiguous)

**Test before scheduling**:

* Run the task manually first to ensure it works as expected
* Then set up the schedule

## Quick Use Cases

| Use Case                    | Schedule           | Output              |
| :-------------------------- | :----------------- | :------------------ |
| **News Monitoring**         | Daily 7 AM         | Email summary       |
| **Competitor Tracking**     | Weekly Friday 5 PM | Google Drive report |
| **Social Media Monitoring** | Daily 9 AM         | Slack notification  |
| **Analytics Reports**       | Monthly 1st day    | Slide deck          |
| **Price Tracking**          | Daily 6 AM         | Spreadsheet update  |
| **Content Curation**        | Weekdays 8 AM      | Email digest        |

## Common Questions

<AccordionGroup>
  <Accordion title="What happens if a scheduled task fails? ">
    Manus will notify you and log the error. You can review the issue and adjust the task.
  </Accordion>

  <Accordion title="Can I run a task immediately and also schedule it?">
    Yes. Run it now to test, then set up the recurring schedule.
  </Accordion>

  <Accordion title="What timezone are schedules in">
    Your account timezone (set in Settings). You can specify timezone in the schedule: "9 AM EST"
  </Accordion>

  <Accordion title="How many scheduled tasks can I have?">
    Depends on your plan. Check Settings → Scheduled Tasks for your limit.
  </Accordion>

  <Accordion title="Can I schedule Wide Research tasks? ">
    Yes. Any task Manus can do can be scheduled.
  </Accordion>
</AccordionGroup>

***