> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Manus Slides

> Manus creates complete presentations from a simple description. It conducts research, develops content, designs slides, generates visuals, and writes detailed speaker notes—delivering presentation-ready decks in minutes.

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

## Quick Start

<iframe src="https://www.youtube.com/embed/pFDWPizKNxo" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

**Basic Request**

<CodePrompt>
  "Create a 15-slide pitch deck for our AI customer service platform
  targeting enterprise clients."
</CodePrompt>

**Detailed Request**

<CodePrompt>
  "Create a Q3 business review presentation. Cover: revenue (up 23%),
  customer acquisition (down 15% cost), product launches (mobile app, API v2),
  and Q4 priorities. Make it executive-friendly with clear charts."
</CodePrompt>

**From Existing Content**

<CodePrompt>
  "Turn this research report into a 20-slide conference presentation
  for a technical audience. Include key charts and add speaker notes."
</CodePrompt>

## **Using Themes**

**Pre-Built Templates**

<iframe src="https://www.youtube.com/embed/svWBYYl7Grc" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

**Upload Your Template**

1. Click on Import template
2. Upload your PowerPoint template (.pptx)
3. Manus applies your layouts, colors, and fonts

## What Manus Creates

* Slides: Professional layouts with clear visual hierarchy
* Content: Research-backed, well-structured narrative
* Visuals: Custom charts, diagrams, and generated images
* Speaker Notes: Detailed talking points for every slide
* Branding: Consistent colors, fonts, and styling

## Collaborate with Teams

## Export Formats

* PowerPoint (.pptx): Fully editable in PowerPoint or Google Slides
* PDF: Print-ready for distribution
* Web Slides: Interactive browser-based presentation
* Speaker Notes Document: Separate file with all notes

## Tips for Better Presentations

Be specific about audience:

* ✅ "Technical audience familiar with ML"
* ✅ "Business executives, no technical background"
* ❌ "General audience"

Define the goal:

* ✅ "Convince investors to fund us"
* ✅ "Educate students on the basics"
* ❌ "Present information"

Specify length and timing:

* ✅ "15 slides for 20-minute presentation"
* ✅ "30 slides for 1-hour workshop"
* ❌ "Make some slides"

Let Manus research:

* ✅ "Research current market trends and include them"
* ❌ Providing all content yourself

## Common Questions

**Can I edit slides after creation? Yes. Download the .pptx file and edit in any presentation software.**

How long does it take? 5-15 minutes depending on complexity. Simple 10-slide deck: \~5 min. Complex 40-slide research presentation: \~15 min.

**Can Manus use my company template? Yes. Upload your .pptx template file.**

What if I need changes? Ask Manus to make changes through conversation, or edit the PowerPoint file directly.

**Can Manus create charts from my data? Yes. Upload your data (CSV, Excel), and Manus will create appropriate visualizations.**

What languages are supported? All major languages. Specify in your request: "Create in Spanish..."