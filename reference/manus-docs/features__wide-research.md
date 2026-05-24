> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Wide Research

> Parallel multi-agent system for large-scale research and processing tasks.

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

<iframe src="https://www.youtube.com/embed/TRZi7EZBNI0" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

## What is Wide Research?

Wide Research is Manus's approach to handling tasks that involve processing many similar items—such as analyzing 100 products, researching 50 companies, or generating 20 pieces of content. Instead of using a single AI agent that processes items sequentially, Wide Research deploys hundreds of independent agents that work in parallel.

Each agent receives its own dedicated context and processes one item independently. This architecture solves the context window limitation that causes traditional AI systems to degrade in quality as the number of items increases.

## The Context Window Problem

Traditional AI systems, including most chatbots, operate with a fixed context window—a limit on how much information they can actively process at once. When asked to analyze many items sequentially:

* **Items 1-5**: Detailed, thorough analysis with full context available
* **Items 10-20**: Descriptions become shorter as context fills up
* **Items 30+**: Generic summaries and increased errors as earlier context is compressed or lost

This degradation occurs because the AI must keep all previous items in memory while processing new ones. Research shows this "fabrication threshold" typically occurs around 8-10 items for most AI systems.

## How Wide Research Works

Wide Research uses a fundamentally different architecture:

**1. Task Decomposition**: The main agent analyzes your request and breaks it into independent sub-tasks (e.g., "research company #1", "research company #2", etc.)

**2. Parallel Agent Deployment**: Each sub-task is assigned to a dedicated agent with its own fresh context window

**3. Independent Processing**: Agents work simultaneously, each conducting thorough research without competing for context space

**4. Result Synthesis**: The main agent collects all completed sub-tasks and assembles them into your requested format (table, report, dataset, etc.)

**Result**: Item #250 receives the same depth of analysis as item #1, because each has its own dedicated agent and full context window.

## Quick Start

### Simple Request

<CodePrompt>
  "Research the top 20 AI researchers and create a table with their
  affiliations, research focus, and recent publications"
</CodePrompt>

### Detailed Request

<CodePrompt>
  "Compare 100 consumer sneaker models. For each, extract: brand, price,
  key features, target audience, and customer rating. Organize in a
  sortable table."
</CodePrompt>

### Creative Request

<CodePrompt>
  "Find 20 famous historical figures. Generate professional headshots
  for each in a consistent artistic style. Include brief biographies."
</CodePrompt>

## Real Examples

### Example 1: Researching 250 AI Researchers

<CodePrompt>
  "Research the top 250 AI researchers from leading institutions. Create
  a comprehensive table with: name, affiliation, research focus, h-index,
  notable publications, and contact information."
</CodePrompt>

**Output**: Complete database with 250 detailed profiles

**Replay**: [https://manus.im/share/IXdMjxObbFKbIjUUkBk4EH?replay=1](https://manus.im/share/IXdMjxObbFKbIjUUkBk4EH?replay=1)

**Why This Works**:

* No other AI tool can handle this scale
* Each researcher gets independent, thorough research
* Automatic table generation with all fields filled
* Consistent quality from researcher #1 to #250

### Example 2: Comparing 100 Sneaker Models

<CodePrompt>
  "Analyze 100 consumer sneaker models. Extract brand, price range, key
  features, target demographic, and average rating. Create a comparison
  table sorted by price."
</CodePrompt>

**Output**: Comprehensive market research table with 100 products

**Replay**: [https://manus.im/share/3zvs5smekSmn4lS14n9QNg?replay=1](https://manus.im/share/3zvs5smekSmn4lS14n9QNg?replay=1)

**Why This Works**:

* Deep-dive into each product independently
* Structured data extraction at scale
* Automatic organization and sorting
* No quality degradation across 100 items

### Example 3: Analyzing AGI Timelines

<CodePrompt>
  "Research expert predictions on AGI timelines. Analyze 30+ sources
  including research papers, expert interviews, and industry reports.
  Create a visualization showing prediction distribution."
</CodePrompt>

**Output**: Comprehensive analysis with data visualization

**Replay**: [https://manus.im/share/GajPnKzrpM4pEbpcrKDmx0?replay=1](https://manus.im/share/GajPnKzrpM4pEbpcrKDmx0?replay=1)

**Why This Works**:

* Synthesizes information from dozens of sources
* Creates visual representations of findings
* Identifies patterns and outliers
* Provides evidence-based summary

### Example 4: Researching 20 Biographies

<CodePrompt>
  "Research 20 influential entrepreneurs. For each, create a detailed
  biography covering: early life, career milestones, major achievements,
  leadership style, and lasting impact."
</CodePrompt>

**Output**: 20 comprehensive biographies with consistent structure

**Replay**: [https://manus.im/share/ayLBetEJkfSIVuWKo2toPn?replay=1](https://manus.im/share/ayLBetEJkfSIVuWKo2toPn?replay=1)

**Why This Works**:

* Each biography gets thorough, independent research
* Consistent structure across all profiles
* Deep-dive into multiple sources per person
* No shortcuts or generic content

### Example 5: Batch Editing LinkedIn Profile Pics

<CodePrompt>
  "Download profile pictures from these 50 LinkedIn URLs. Apply
  consistent professional editing: remove backgrounds, adjust lighting,
  crop to standard dimensions, and save as high-res PNGs."
</CodePrompt>

**Output**: 50 professionally edited profile pictures

**Replay**: [https://manus.im/share/5iT2464ldyvdf1FMxUOCsW?replay=1](https://manus.im/share/5iT2464ldyvdf1FMxUOCsW?replay=1)

**Why This Works**:

* Replaces micro-SaaS tools for batch image processing
* Consistent editing applied to all images
* Automated download and processing pipeline
* Professional results at scale

### Example 6: Extract GitHub Prompt Library

<CodePrompt>
  "Visit this GitHub awesome-prompts repository. Extract all prompts,
  categorize by use case, and create a structured database with: prompt
  text, category, intended model, and effectiveness rating."
</CodePrompt>

**Output**: Structured database of 100+ prompts

**Replay**: [https://manus.ai/share/wxTg2q4hV6GN4YY4KnQeFx?replay=1](https://manus.ai/share/wxTg2q4hV6GN4YY4KnQeFx?replay=1)

**Why This Works**:

* Extracts and structures information at scale
* Automated categorization and tagging
* Creates searchable, organized database
* Handles complex web scraping tasks

## Use Cases by Category

| Category                     | Example Tasks                                                                    |
| :--------------------------- | :------------------------------------------------------------------------------- |
| **Market Research**          | Compare 100 products, analyze competitor pricing, survey customer reviews        |
| **Academic Research**        | Literature review of 50 papers, analyze research trends, compare methodologies   |
| **Competitive Intelligence** | Profile 30 competitors, analyze feature sets, track pricing changes              |
| **Lead Generation**          | Research 200 prospects, find contact info, qualify leads                         |
| **Content Creation**         | Generate 20 blog outlines, create 50 social posts, write 30 product descriptions |
| **Data Extraction**          | Scrape 100 websites, extract structured data, compile databases                  |
| **Creative Production**      | Generate 20 images, edit 50 photos, create consistent brand assets               |
| **Investment Research**      | Analyze 40 startups, compare 30 funds, research 50 portfolio companie            |

## Why Wide Research vs. Other Tools

| Aspect       | AI Chatbot                            | Manus Wide Research                |
| :----------- | :------------------------------------ | :--------------------------------- |
| **Approach** | Single AI helps you                   | Parallel multi-agent orchestration |
| **Speed**    | Hours until context saturation        | Minutes regardless of scale        |
| **Scale**    | Degrades beyond 8-10 items            | Scales to hundreds seamlessly      |
| **Quality**  | Progressive degradation               | Uniform quality at any scale       |
| **Output**   | Compressed summaries with detail loss | Complete reports and datasets      |

## When to Use Wide Research

**Perfect For**:

* Competitive intelligence (analyze 50+ competitors)
* Market research (compare 100+ products)
* Academic research (review 30+ papers)
* Lead generation (research 200+ prospects)
* Content creation (generate 20+ similar items)
* Data extraction (scrape and structure 100+ pages)
* Batch processing (edit 50+ images/files)

**Not Ideal For**:

* Single deep-dive analysis (use regular agent mode)
* Tasks requiring sequential dependencies
* Real-time interactive research
* Tasks with fewer than 10 items

## Tips for Better Results

**Be specific about structure**:

* ✅ "Create a table with columns: name, company, role, email, LinkedIn"
* ❌ "Research these people"

**Specify the scale upfront**:

* ✅ "Analyze all 100 companies in this list"
* ❌ "Analyze some companies"

**Describe desired output format**:

* ✅ "Organize in a sortable spreadsheet with filters"
* ❌ "Give me the results"

**Include evaluation criteria**:

* ✅ "Rate each product on: price, features, reviews, availability"
* ❌ "Compare these products"

## Common Questions

<AccordionGroup>
  <Accordion title="How many items can Wide Research handle? " icon="sparkles">
    Tested up to 250 items. Theoretically unlimited, but practical limit depends on task complexity.
  </Accordion>

  <Accordion title="How long does it take? " icon="sparkles">
    Depends on task complexity and scale. Typically minutes for 50-100 items, regardless of depth.
  </Accordion>

  <Accordion title="Can I refine results after?">
    Yes. Ask for modifications: "Add a column for pricing" or "Re-research items 20-30 with more detail."
  </Accordion>

  <Accordion title="Does it work for non-research tasks? ">
     Yes. Any task that involves processing multiple independent items: image editing, data extraction, content generation, etc.
  </Accordion>
</AccordionGroup>

##