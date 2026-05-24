> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Cloud browser

> Manus's cloud-based browser that operates like a real person

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

## What is Cloud Browser?

Cloud Browser is Manus's dedicated browser environment that runs in the cloud. Unlike traditional AI assistants that can only read text, Manus can actually operate this browser like a real person—visiting websites, clicking buttons, filling forms, extracting data, and completing multi-step workflows.

More importantly, **you can log into your personal or work accounts** in this browser, authorizing Manus to perform tasks that require authentication—such as checking your email, updating your CRM, posting on social media, or accessing premium research tools.

This transforms Manus from a text-based assistant into an agent that can take action on your behalf across the web.

## Why Cloud Browser Matters

Most AI tools can only work with information you provide. They can't visit websites, interact with web applications, or access content behind logins.

Cloud Browser enables Manus to:

* **Browse the web autonomously** to gather real-time information
* **Log into your accounts** to perform authenticated actions
* **Interact with web applications** like a human would
* **Extract data** from websites that don't have APIs
* **Complete multi-step workflows** across multiple web pages

This is what makes Manus a true AI agent, not just a chatbot.

## How Cloud Browser Works

### 1. Manus Operates the Browser

<img src="https://mintcdn.com/docs-manus/5gZK3I5oeTh8gP_H/images/Screenshot2025-11-24at11.43.41AM.png?fit=max&auto=format&n=5gZK3I5oeTh8gP_H&q=85&s=830bb38915384ae486144dc815f6e9ae" alt="Screenshot2025 11 24at11 43 41AM Pn" width="2534" height="1688" data-path="images/Screenshot2025-11-24at11.43.41AM.png" />

When you give Manus a task that requires web access, Manus automatically opens Cloud Browser and navigates to the relevant websites.

Manus:

* Opens Cloud Browser
* Visits relevant news sites, databases, and startup directories
* Extracts information from multiple sources
* Compiles results into a structured report

You see everything Manus is doing in real-time.

### 2. You Can Log Into Your Accounts

For tasks that require authentication, you can log into your accounts in Cloud Browser. Manus will then use those authenticated sessions to perform actions on your behalf.

**Example**:

<CodePrompt>
  "Check my LinkedIn account for partnership inquiries this week and draft responses"
</CodePrompt>

Manus:

* Opens Cloud Browser
* Accesses your logged-in LinkedIn account
* Drafts personalized responses for your review

### 3. Take Over When Needed

<img src="https://mintcdn.com/docs-manus/5gZK3I5oeTh8gP_H/images/Screenshot2025-11-24at11.46.27AM.png?fit=max&auto=format&n=5gZK3I5oeTh8gP_H&q=85&s=463b525aeaf2997a021247d3761ade80" alt="Screenshot2025 11 24at11 46 27AM Pn" width="2700" height="1328" data-path="images/Screenshot2025-11-24at11.46.27AM.png" />

When Manus encounters complex verifications (SMS codes, CAPTCHA, multi-factor authentication), the system will prompt you to **"Take Over"** the browser.

**How Take Over Works**:

1. Manus encounters a verification challenge
2. You receive a notification to take over
3. You complete the verification (enter code, solve CAPTCHA, etc.)
4. You hand control back to Manus
5. Manus continues the task

This ensures Manus can complete tasks even when human verification is required.

### 4. Security and Privacy

Your login credentials and browsing activity are managed with strict security:

* **Encrypted sessions**: All browser sessions are encrypted
* **Isolated environments**: Each user has a separate, isolated browser instance
* **No credential storage**: Manus doesn't store your passwords
* **Access control**: You control which accounts Manus can access
* **Session management**: You can log out or clear sessions anytime

## Cloud Browser Settings

You can configure Cloud Browser in **Manus Settings → Cloud Browser**.

### Available Settings

| Setting                     | Description                                                  |
| :-------------------------- | :----------------------------------------------------------- |
| **Logged-in Accounts**      | View and manage accounts you've logged into in Cloud Browser |
| **Session Management**      | Log out of specific accounts or clear all sessions           |
| **Take Over Notifications** | Configure how you're notified when take over is needed       |
| **Browser History**         | View recent Cloud Browser activity                           |
| **Security Settings**       | Manage access permissions and security preferences           |

### Managing Logged-in Accounts

To see which accounts you're logged into:

1. Go to **Settings → Cloud Browser → Logged-in Accounts**
2. View all active sessions
3. Log out of specific accounts if needed
4. Clear all sessions to start fresh

## Websites to Log Into for Better Automation

Logging into these types of accounts enables Manus to perform more powerful automation:

### Productivity & Communication

* **Gmail / Outlook**: Read, send, and organize emails
* **Slack**: Send messages, create channels, manage notifications
* **Notion**: Create pages, update databases, organize content
* **Google Calendar**: Schedule meetings, check availability, send invites

### Business & CRM

* **Salesforce / HubSpot**: Update leads, create contacts, log activities
* **LinkedIn**: Send connection requests, post updates, message contacts
* **Stripe**: Check payments, create invoices, manage subscriptions

### Research & Data

* **Crunchbase**: Research companies, funding data, and investors
* **PitchBook**: Access private company data and market research
* **SimilarWeb**: Analyze website traffic and competitor data
* **Financial Times / WSJ**: Access premium news and analysis

### Development & Tools

* **GitHub**: Create issues, review pull requests, manage repositories
* **Jira**: Update tickets, track progress, manage sprints
* **Figma**: View designs, leave comments, export assets

### Social Media

* **Twitter / X**: Post updates, schedule tweets, monitor mentions
* **Instagram**: Post content, respond to comments, analyze engagement
* **Facebook**: Manage pages, post updates, respond to messages

**Example Workflows**:

* "Check my LinkedIn messages and draft responses to connection requests"
* "Update our Notion project tracker with this week's completed tasks"
* "Research these 20 companies on Crunchbase and create a funding summary"
* "Post this announcement to our company Twitter and LinkedIn accounts"

## Important: Data Center IP Considerations

### Cloud Browser Uses Data Center IPs

Cloud Browser operates from data center IP addresses, not residential IPs. This means:

* Some websites may trigger additional verification (CAPTCHA, security checks)
* Certain services may flag the activity as automated
* You may encounter more frequent authentication challenges

### When to Use My Browser Instead

For tasks that require residential IP addresses or encounter frequent verification challenges, consider using [**My Browser (Browser Operator)**](https://www.notion.so/Cloud-Browser-2b27ff657cfa8049ad05dba0e33d9dc5?pvs=21) instead.

**My Browser** uses your local browser with your actual IP address, which:

* Avoids data center IP detection
* Reduces CAPTCHA and verification prompts
* Works better with security-sensitive websites
* Maintains your existing logged-in sessions

### Choosing Between Cloud Browser and My Browser

| Use Cloud Browser When                 | Use My Browser When                           |
| :------------------------------------- | :-------------------------------------------- |
| Researching public websites            | Logging into security-sensitive accounts      |
| Extracting data at scale               | Performing actions on banking/financial sites |
| Running long-running tasks             | Avoiding CAPTCHA challenges                   |
| You don't mind occasional verification | You need residential IP address               |
| Task doesn't require login             | Website blocks data center IPs                |

**Example**:

* ✅ Cloud Browser: "Research 50 competitors and extract their pricing"
* ✅ My Browser: "Log into my bank and download last month's statements"

## Tips for Effective Cloud Browser Use

### Log Into Accounts in Advance

**✅ Good**: Log into frequently used accounts (Gmail, Notion, LinkedIn) before assigning tasks

**Why**: Manus can immediately access these accounts without interrupting your workflow for login

***

### Be Specific About Actions

**✅ Good**: "Check my Gmail for emails from potential clients this week. Draft responses highlighting our Q4 availability."

**❌ Vague**: "Check my email"

Specific instructions help Manus perform exactly the right actions.

***

### Use Take Over for Complex Verifications

When Manus prompts for take over:

* Respond quickly to keep the task moving
* Complete only the verification step
* Hand control back to Manus immediately

***

### Monitor First-Time Logins

The first time you log into an account in Cloud Browser:

* Watch the process to ensure it works correctly
* Complete any first-time verifications
* Confirm Manus can access the account properly

***

### Consider My Browser for Sensitive Sites

For banking, financial accounts, or sites that frequently trigger CAPTCHA:

* Use **My Browser** instead of Cloud Browser
* This avoids data center IP detection
* Reduces verification challenges

***

### Manage Sessions Regularly

Periodically review and clear logged-in sessions:

* Go to **Settings → Cloud Browser → Logged-in Accounts**
* Log out of accounts you no longer need Manus to access
* Clear all sessions if you're changing workflows

## Common Questions

<AccordionGroup>
  <Accordion title="Is Cloud Browser secure for logging into my accounts?" icon="sparkles">
    Yes. Cloud Browser uses encrypted sessions, isolated environments, and doesn't store your passwords. You control which accounts Manus can access.
  </Accordion>

  <Accordion title="What happens if I log into my account in Cloud Browser?" icon="sparkles">
    Manus can then perform authenticated actions on your behalf (reading emails, updating CRM, posting content, etc.). You remain in control and can log out anytime.
  </Accordion>

  <Accordion title="Can I see what Manus is doing in Cloud Browser?">
    Yes. You can watch Manus navigate websites in real-time, just like watching someone use a browser
  </Accordion>

  <Accordion title="What is &#x22;Take Over&#x22; and when do I need it? ">
    Take Over lets you temporarily control the browser when Manus encounters verifications (CAPTCHA, SMS codes, etc.). You complete the verification, then hand control back to Manus.
  </Accordion>

  <Accordion title="What's the difference between Cloud Browser and My Browser?">
    Cloud Browser runs in the cloud with data center IPs. My Browser uses your local browser with your residential IP. Use My Browser for security-sensitive sites or to avoid CAPTCHA.
  </Accordion>

  <Accordion title="How do I log out of an account in Cloud Browser?">
    Go to **Settings → Cloud Browser → Logged-in Accounts** and log out of specific accounts.
  </Accordion>
</AccordionGroup>

***