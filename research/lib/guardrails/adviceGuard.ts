/**
 * Answer check for questions that ask for a personal recommendation
 * ("Should I sell…?", "Which ETF is best for me?").
 *
 * For these questions only, the answer TEXT is held back until it is complete,
 * checked for advice-style wording, rewritten once if needed, and replaced with
 * a safe fallback if the rewrite still fails. Tool activity (library searches
 * and projections) streams through straight away, so sources and charts still
 * appear while the answer is being checked. Other questions stream normally.
 */
import type { StreamTextTransform, TextStreamPart, ToolSet } from 'ai';
import { outputRedFlags, SAFE_FALLBACK } from './advice';

export type GuardEvent =
  | { stage: 'passed' }
  | { stage: 'rewritten'; reasons: string[] }
  | { stage: 'fallback'; reasons: string[] };

export function adviceGuardTransform<TOOLS extends ToolSet>(opts: {
  /** Rewrite an answer that failed the check. Should not throw; errors fall back. */
  rewrite: (draft: string) => Promise<string>;
  onResult?: (event: GuardEvent) => void;
}): StreamTextTransform<TOOLS> {
  return () => {
    let draft = '';
    let released = false;

    async function checkedText(): Promise<string> {
      const reasons = outputRedFlags(draft);
      if (reasons.length === 0) {
        opts.onResult?.({ stage: 'passed' });
        return draft;
      }
      try {
        const rewritten = (await opts.rewrite(draft)).trim();
        if (rewritten && outputRedFlags(rewritten).length === 0) {
          opts.onResult?.({ stage: 'rewritten', reasons });
          return rewritten;
        }
      } catch {
        /* fall through to the safe fallback */
      }
      opts.onResult?.({ stage: 'fallback', reasons });
      return SAFE_FALLBACK;
    }

    const release = async (controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) => {
      if (released) return;
      released = true;
      const text = await checkedText();
      if (!text) return;
      const id = 'checked-answer';
      controller.enqueue({ type: 'text-start', id } as TextStreamPart<TOOLS>);
      controller.enqueue({ type: 'text-delta', id, text } as TextStreamPart<TOOLS>);
      controller.enqueue({ type: 'text-end', id } as TextStreamPart<TOOLS>);
    };

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      async transform(part, controller) {
        // Hold back all answer text (its start, pieces and end markers).
        if (part.type === 'text-delta') {
          draft += part.text;
          return;
        }
        if (part.type === 'text-start' || part.type === 'text-end') return;
        // The last step is the one that doesn't end in tool calls. Release the
        // checked text inside it, so the SDK records it as the answer.
        if (part.type === 'finish-step' && part.finishReason !== 'tool-calls') await release(controller);
        // Safety net: the step limit was reached while still calling tools.
        if (part.type === 'finish') await release(controller);
        controller.enqueue(part); // tool calls, results, step markers, errors, finish
      },
      // If the stream ends without a normal finish (an error), unchecked text is
      // never released.
    });
  };
}
