> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

> Local browser automation with your authenticated sessions

# Manus Browser Operator 

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

## What is Manus Browser Operator?

Manus Browser Operator is a browser extension that enables Manus to operate directly within your local browser environment. Unlike the cloud browser that Manus typically uses, Browser Operator works with your actual browser—complete with your existing logins, sessions, and local IP address.

This transforms your browser from a passive viewing tool into an active workspace where Manus can execute complex tasks using the premium tools and authenticated systems you already access.

<iframe src="https://www.youtube.com/embed/kaDwyZVFDJs" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

## Why Local Browser Matters

### The Authentication Advantage

When Manus works in your local browser, it operates with your trusted credentials and local IP address. This means:

**No Login Barriers**: The system recognizes activity as coming from your trusted machine, eliminating unfamiliar login attempts, CAPTCHA interruptions, and session expiration issues.

**Reliable Access**: Because the activity appears legitimate to websites, it clears standard access barriers automatically and maintains active sessions.

**Premium Tool Access**: Manus can work with subscription services you're already logged into—Crunchbase, PitchBook, SimilarWeb, Financial Times, Semrush, Ahrefs, or any authenticated platform.

### Cloud Browser vs. Local Browser

**Cloud Browser** (Default):

* Sandboxed, isolated environment
* Works across any device without installation
* Ideal for most research, analysis, and content creation tasks
* No local setup required

**Local Browser** (Browser Operator):

* Uses your actual browser with existing sessions
* Access to authenticated systems and premium tools
* Trusted local IP and credentials
* Best for workflows requiring logged-in access

Both work together seamlessly—Manus automatically uses the appropriate environment for each task.

## How It Works

### 3-Step Process

**Step 1: Activate "My Browser" Connector**

Navigate to Connectors and toggle on "My Browser." This tells Manus to use your local browser for tasks requiring web access.

**Step 2: Authorize the Session**

When you assign a task, Manus requests permission to take control. Click "Authorize" to grant one-time access. You remain in command of when and how Manus interacts with your browser.

**Step 3: Monitor in Dedicated Tab**

Manus opens a new tab within a tab group named after your current task. You can:

* Watch the task unfold in real-time
* Take over by clicking into the tab
* Stop instantly by closing the tab

## Real-World Use Cases

### Market Research with Premium Tools

**Scenario**: Analyze 20 competitors using your Crunchbase and PitchBook subscriptions

**Without Browser Operator**: Manual login, navigation, data extraction, and compilation across multiple platforms

**With Browser Operator**:

<CodePrompt>
  "Research these 20 companies using my Crunchbase and PitchBook accounts.
  Extract: funding rounds, key investors, revenue estimates, employee count.
  Create comparison table."
</CodePrompt>

**Result**: Manus accesses both platforms using your authenticated sessions, extracts data systematically, and delivers a comprehensive comparison table.

### SEO Analysis at Scale

**Scenario**: Audit 50 competitor websites using your Semrush and Ahrefs accounts

**Request**:

<CodePrompt>
  "Analyze these 50 competitor domains using Semrush and Ahrefs.
  Extract: domain authority, top keywords, backlink profile, traffic estimates.
  Identify content gaps and opportunities."
</CodePrompt>

**Result**: Automated analysis across both premium SEO tools with your subscription access, delivering actionable insights.

### CRM Data Enrichment

**Scenario**: Enrich 100 leads in your CRM with additional research

**Request**:

<CodePrompt>
  "For each lead in this spreadsheet, use my LinkedIn Sales Navigator
  and Crunchbase accounts to find: company size, recent funding,
  key decision makers, recent news. Update the CRM records."
</CodePrompt>

**Result**: Systematic enrichment using your authenticated access to premium B2B tools.

### Financial Research

**Scenario**: Compile market intelligence from paywalled sources

**Request**:

<CodePrompt>
  "Research these 10 public companies using my Financial Times,
  Bloomberg, and WSJ subscriptions. Extract recent analyst opinions,
  earnings sentiment, and strategic moves. Summarize key themes."
</CodePrompt>

**Result**: Comprehensive research synthesis from premium financial sources you're subscribed to.

## Transparency and Control

### Full Visibility

Every action Manus takes is meticulously logged, providing a clear audit trail. You can see exactly what Manus is doing at each step.

### Instant Stop

If you need to halt a task immediately, simply close the dedicated tab. Manus stops instantly.

### Remote Access

Because Manus operates locally within your desktop browser, you can initiate and monitor tasks from your phone or another device. As long as your primary computer is online, your AI assistant is ready to work from anywhere.

### Review Before Authorization

If a site contains sensitive information, you can review what Manus will access before clicking "Authorize." You always maintain control.

## Availability and Compatibility

**Current Status**: Beta rollout to Pro, Plus, and Team users

**Supported Browsers**:

* Chrome (recommended)
* Edge (recommended)
* Additional browsers coming soon

**Current Limitations**:

* Complex interactions (drag-and-drop, multi-step forms) may not work perfectly
* Some websites with aggressive anti-bot measures may require manual intervention

## Security and Privacy

### Your Control

* **One-time authorization**: Each task requires explicit permission
* **Visible activity**: All actions logged and visible in real-time
* **Instant termination**: Close tab to stop immediately
* **Selective access**: Choose which tasks use local browser

### Your Data

* Manus operates within your browser using your existing sessions
* No credentials are stored or transmitted
* Activity appears as coming from your local machine
* Standard Manus privacy policies apply

## Tips for Best Results

**Be specific about tool usage**:

* ✅ "Use my Crunchbase account to research these companies"
* ❌ "Research these companies"

**Verify logins first**:

* Ensure you're logged into required services before starting task
* Check that sessions are active and not expired

**Review sensitive sites**:

* Before authorizing, confirm which sites Manus will access
* Use caution with financial accounts or sensitive data

**Monitor first few tasks**:

* Watch initial tasks to understand how Browser Operator works
* Adjust prompts based on observed behavior

**Combine with other features**:

* Use Wide Research for parallel processing across multiple items
* Export results to slides, reports, or structured data

## Common Questions

<AccordionGroup>
  <Accordion title="Does Browser Operator work on mobile?">
    You can initiate tasks from mobile, but your desktop browser must be running for Browser Operator to function.
  </Accordion>

  <Accordion title="Is my login information safe">
    Manus doesn't store or transmit your credentials. It operates within your existing browser sessions.
  </Accordion>

  <Accordion title="Can I revoke access mid-task? ">
    Yes. Close the dedicated tab to stop Manus immediately.
  </Accordion>
</AccordionGroup>

***