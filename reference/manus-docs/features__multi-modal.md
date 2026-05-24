> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Multimedia Processing

> Generate and understand images, video, voice, and speech

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

Manus works with multiple media types—generating images, understanding video content, creating voice output, and transcribing speech. Combine text, images, video, and audio in your workflows seamlessly.

<iframe src="https://www.youtube.com/embed/U_prPA93hXA" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

## Capabilities Overview

| Capability              | What It Does                               | Example Use                              |
| :---------------------- | :----------------------------------------- | :--------------------------------------- |
| **Image Generation**    | Create custom images from descriptions     | Product mockups, illustrations, diagrams |
| **Image Understanding** | Analyze and extract info from images       | Document scanning, visual analysis       |
| **Video Understanding** | Analyze video content and extract insights | Meeting transcripts, content analysis    |
| **Voice Output**        | Convert text to natural speech             | Voiceovers, audio content                |
| **Speech to Text**      | Transcribe audio to text                   | Meeting notes, interview transcripts     |

***

## Image Generation

### Quick Start

> "Generate an image of a modern minimalist office workspace
> with natural lighting and plants"

<CodePrompt>
  "Create a product mockup showing our mobile app on an iPhone,
  professional photography style"
</CodePrompt>

<CodePrompt>
  "Generate a diagram showing our customer journey from
  awareness to purchase"
</CodePrompt>

### Common Uses

**Product Visuals**:

* Product mockups and prototypes
* Feature illustrations
* UI/UX concepts

**Marketing Assets**:

* Social media graphics
* Blog post illustrations
* Ad creatives

**Presentations**:

* Custom slide backgrounds
* Concept illustrations
* Visual metaphors

**Diagrams & Charts**:

* Process flows
* System architectures
* Infographics

### Tips for Better Images

**Be specific about style**:

* ✅ "Minimalist, modern, professional photography"
* ✅ "Flat design illustration, bright colors"
* ❌ "Make it look good"

**Describe composition**:

* ✅ "Centered subject, blurred background, natural lighting"
* ❌ "A picture of..."

**Specify use case**:

* ✅ "For Instagram post, square format, bold text overlay"
* ✅ "For presentation slide, wide format, subtle background"

***

## Image Understanding

### Quick Start

<CodePrompt>
  "Analyze this screenshot and extract all the text"
</CodePrompt>

(Upload image)

<CodePrompt>
  "What products are shown in this catalog page?
  Extract names and prices."
</CodePrompt>

(Upload image)

<CodePrompt>
  "Describe what's happening in this image in detail"
</CodePrompt>

(Upload image)

### Common Uses

**Document Processing**:

* Extract text from screenshots
* Read handwritten notes
* Parse receipts and invoices

**Visual Analysis**:

* Identify objects in photos
* Analyze charts and graphs
* Describe image content

**Quality Control**:

* Check product photos for issues
* Verify image content
* Compare visual differences

### Example Tasks

<CodePrompt>
  "Extract all text from these 10 product images and create a spreadsheet"
</CodePrompt>

<CodePrompt>
  "Analyze this chart image and recreate it as an editable chart
  with the same data"
</CodePrompt>

<CodePrompt>
  "Compare these two product photos and list the differences"
</CodePrompt>

***

## Video Understanding

### Quick Start

<CodePrompt>
  "Transcribe this meeting recording and create a summary
  with action items"
</CodePrompt>

(Upload video file or provide URL)

<CodePrompt>
  "Watch this product demo video and extract: key features mentioned,
  pricing information, and target audience"
</CodePrompt>

<CodePrompt>
  "Analyze this tutorial video and create a step-by-step written guide"
</CodePrompt>

### Common Uses

**Meeting Processing**:

* Transcribe meetings
* Extract action items
* Summarize discussions

**Content Analysis**:

* Analyze competitor videos
* Extract key points from tutorials
* Review product demos

**Documentation**:

* Convert video tutorials to text guides
* Create summaries of long videos
* Extract quotes and timestamps

### Example Tasks

<CodePrompt>
  "Transcribe this 1-hour webinar and create:

  * Full transcript
  * Executive summary
  * Key takeaways (bullet points)
  * Q\&A section"
</CodePrompt>

<CodePrompt>
  "Watch these 5 competitor product videos and create a comparison
  table of features mentioned"
</CodePrompt>

***

## Voice Output

### Quick Start

<CodePrompt>
  "Convert this blog post to an audio file with natural voice narration"
</CodePrompt>

<CodePrompt>
  "Create a voiceover for this presentation script in a professional,
  friendly tone"
</CodePrompt>

<CodePrompt>
  "Generate audio versions of these 10 product descriptions
  for our website"
</CodePrompt>

### Common Uses

**Content Creation**:

* Podcast scripts to audio
* Blog posts to audio versions
* Video voiceovers

**Accessibility**:

* Audio versions of written content
* Screen reader alternatives
* Audio guides

**Marketing**:

* Ad voiceovers
* Product demo narration
* Social media audio content

### Voice Options

**Tone**: Professional, friendly, casual, energetic, calm **Pace**: Fast, moderate, slow **Style**: Conversational, formal, educational, promotional

***

## Speech to Text

### Quick Start

<CodePrompt>
  "Transcribe this interview recording"
</CodePrompt>

(Upload audio file)

<CodePrompt>
  "Convert this podcast episode to text with speaker labels"
</CodePrompt>

<CodePrompt>
  "Transcribe these 20 customer support calls and identify
  common issues mentioned"
</CodePrompt>

### Common Uses

**Meeting Notes**:

* Transcribe meetings automatically
* Create searchable meeting archives
* Extract action items

**Content Repurposing**:

* Convert podcasts to blog posts
* Create show notes from audio
* Generate social media quotes

**Research**:

* Transcribe interviews
* Analyze customer calls
* Process focus group recordings

### Features

* **Speaker identification**: Distinguish between speakers
* **Timestamps**: Mark when things were said
* **Formatting**: Proper punctuation and paragraphs
* **Accuracy**: High accuracy even with accents or background noise

***

## Combining Multiple Modes

Manus can combine these capabilities in single workflows:

### Example 1: Video to Blog Post

<CodePrompt>
  "Watch this product demo video, transcribe it, extract key features,
  generate screenshots at important moments, and create a blog post
  with images and text"
</CodePrompt>

### Example 2: Presentation with Voiceover

<CodePrompt>
  "Create a 10-slide presentation about our product. Generate custom
  illustrations for each slide. Then create a voiceover script and
  audio narration for the entire presentation."
</CodePrompt>

### Example 3: Image Analysis to Report

<CodePrompt>
  "Analyze these 50 product photos, extract text and product details,
  generate comparison charts, and create a slide deck with findings"
</CodePrompt>

***

## Common Questions

**What image formats are supported?** PNG, JPG, WEBP, GIF, and more. For generation, you can specify format.

**How long can videos be?** Manus can process videos up to several hours long. Longer videos take more time.

**What audio formats work for transcription?** MP3, WAV, M4A, WEBM, and most common audio formats.

**Can I generate images in specific sizes?** Yes. Specify dimensions: "Generate a 1920x1080 image..." or "Square format for Instagram..."

**How accurate is speech transcription?** Very high accuracy, even with accents, multiple speakers, or background noise.

**Can I generate videos?** Yes. Manus can generate short video clips and animations.

**Are there limits on generation?** Generation uses credits. Check your plan for limits.

***

## Quick Use Cases

| Use Case               | Input             | Output               |
| :--------------------- | :---------------- | :------------------- |
| **Product Mockups**    | Description       | Generated images     |
| **Meeting Notes**      | Video recording   | Transcript + summary |
| **Blog Audio**         | Text article      | Audio narration      |
| **Document Scanning**  | Photo of document | Extracted text       |
| **Video Analysis**     | Competitor video  | Feature comparison   |
| **Podcast Show Notes** | Audio file        | Transcript + summary |
| **Social Graphics**    | Description       | Custom images        |

***

**Bottom line**: Manus handles multiple media types seamlessly. Generate images, understand video, create voice output, and transcribe speech—all integrated into your workflows.