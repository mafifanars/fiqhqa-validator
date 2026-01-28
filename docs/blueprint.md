# **App Name**: QAFiqih Validator

## Core Features:

- JSONL Upload: Admin uploads JSONL files, parses entries, and previews them for project creation.
- Annotator Management: Admin adds annotators with names, usernames, and passwords, viewing their assigned, completed, and flagged items.
- Entry Assignment: Admin assigns entries to annotators based on ranges or automatically, supporting overlap for agreement calculation.
- Progress Monitoring: Admin monitors project and annotator progress with total entries, annotated counts, and non-fatwa flags via tables/stats.
- Item Viewing: Admin views item content, question, verdicts, and justifications, along with annotation status and annotators.
- Agreement Calculation: The tool automatically calculates inter-annotator agreement, determining if different annotators agreed on article relevancy or on the final verdict label(s) and displays statistics regarding total items overlapped, percentage agreement, etc.
- Verbatim Highlighting: The annotator highlights the appropriate section of text from the left panel to automatically populate text fields in the right panel form with text extracted from the source article. LLM tool determines whether highlighted content from article is sufficient context to be considered 'fatwa' material and suggest that annotator check alternative text from the article if needed.

## Style Guidelines:

- Primary color: Soft blue (#A0D2EB) to convey trust and clarity, inspired by the scholarly nature of the content.
- Background color: Light gray (#F0F4F8), offering a clean and unobtrusive backdrop to focus attention on content.
- Accent color: Warm yellow (#FFDB58) to highlight important actions and information, providing contrast.
- Body and headline font: 'PT Sans', sans-serif for a modern yet approachable reading experience.
- Simple, clear icons to represent different annotation states and actions.
- Split-panel layout with article content on the left and annotation form on the right.
- Subtle animations for form transitions and feedback on actions.