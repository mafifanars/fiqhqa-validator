'use server';
/**
 * @fileOverview This file defines the VerbatimHighlightingAndSuggestion flow, which takes highlighted text
 * from an article and suggests whether it's suitable for fatwa annotation.
 *
 * - verbatimHighlightingAndSuggestion - The main function to process highlighted text and provide suggestions.
 * - VerbatimHighlightingAndSuggestionInput - The input type for the function.
 * - VerbatimHighlightingAndSuggestionOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerbatimHighlightingAndSuggestionInputSchema = z.object({
  highlightedText: z
    .string()
    .describe('The text highlighted by the annotator from the article content.'),
});
export type VerbatimHighlightingAndSuggestionInput = z.infer<typeof VerbatimHighlightingAndSuggestionInputSchema>;

const VerbatimHighlightingAndSuggestionOutputSchema = z.object({
  isFatwaMaterial: z
    .boolean()
    .describe(
      'Whether the highlighted text is likely to be relevant to fatwa (Islamic legal ruling) based on its content.'
    ),
  suggestion: z
    .string()
    .describe(
      'A suggestion for alternative text to highlight if the current selection is not considered fatwa material.'
    )
    .optional(),
});
export type VerbatimHighlightingAndSuggestionOutput = z.infer<typeof VerbatimHighlightingAndSuggestionOutputSchema>;

export async function verbatimHighlightingAndSuggestion(
  input: VerbatimHighlightingAndSuggestionInput
): Promise<VerbatimHighlightingAndSuggestionOutput> {
  return verbatimHighlightingAndSuggestionFlow(input);
}

const verbatimHighlightingPrompt = ai.definePrompt({
  name: 'verbatimHighlightingPrompt',
  input: {schema: VerbatimHighlightingAndSuggestionInputSchema},
  output: {schema: VerbatimHighlightingAndSuggestionOutputSchema},
  prompt: `You are an expert in Islamic jurisprudence (fatwa) analysis.

  An annotator has highlighted the following text from an article:
  """{{{highlightedText}}}"""

  Determine whether the highlighted text is relevant to fatwa, meaning it contains a legal ruling, a religious practice, or a discussion thereof.  If the highlighted text does not appear to be about fatwa, suggest alternative text from the same article that might be more relevant.

  Return a JSON object with two fields:
  - isFatwaMaterial: true if the text is about fatwa, false otherwise.
  - suggestion: If isFatwaMaterial is false, provide a short suggestion (under 50 words) for alternative text to highlight that would be more relevant to fatwa. If isFatwaMaterial is true, this field should not be present.

  Ensure that the response is valid JSON.
  `,
});

const verbatimHighlightingAndSuggestionFlow = ai.defineFlow(
  {
    name: 'verbatimHighlightingAndSuggestionFlow',
    inputSchema: VerbatimHighlightingAndSuggestionInputSchema,
    outputSchema: VerbatimHighlightingAndSuggestionOutputSchema,
  },
  async input => {
    const {output} = await verbatimHighlightingPrompt(input);
    return output!;
  }
);
