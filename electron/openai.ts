import { buildSummaryPrompt, SUMMARY_INSTRUCTIONS } from '../core/prompt.ts';
import type { Overview, SummaryRecord, SummaryResult } from '../core/types.ts';

export async function summarizeDay(input: {
  overview: Overview;
  apiKey: string;
  model: string;
}): Promise<SummaryResult> {
  if (!input.apiKey) return { ok: false, error: 'Add an OpenAI API key in Settings.' };
  if (input.overview.blocks.length === 0 && input.overview.files.length === 0 && input.overview.sites.length === 0) {
    return { ok: false, error: 'Nothing to summarize for this day yet.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        instructions: SUMMARY_INSTRUCTIONS,
        input: buildSummaryPrompt(input.overview),
        max_output_tokens: 800,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) detail = body.error.message;
      } catch {
        // Keep the HTTP status when the body is not JSON.
      }
      return { ok: false, error: detail };
    }
    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const fromParts = (data.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('\n')
      .trim();
    const text = (data.output_text || fromParts).trim();
    if (!text) return { ok: false, error: 'OpenAI returned an empty summary.' };
    const summary: SummaryRecord = {
      day: input.overview.day,
      content: text,
      createdAt: Date.now(),
      model: input.model,
    };
    return { ok: true, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reach OpenAI.';
    return { ok: false, error: message };
  }
}
