'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sliders } from '@phosphor-icons/react';
import { CATEGORY_META, PRIORITY_LABELS, classifyWithRules } from '@fixmycity/shared';
import { CategoryChip, PriorityLabel } from '@/components/common/complaint-meta';
import { Textarea } from '@/components/ui/field';
import { Reveal } from '@/components/motion/reveal';

const EXAMPLES = [
  { label: 'Burst pipe', text: 'Water pipeline burst near our street. Water has been leaking continuously.' },
  { label: 'Pothole', text: 'Large pothole near MG Road affecting daily commuters.' },
  { label: 'Exposed wires', text: 'Streetlight not working and there are exposed wires at the pole.' },
  { label: 'Missed pickup', text: 'Garbage has not been collected for 5 days near the market.' },
];

/**
 * Runs the same deterministic rule set the server uses as its classifier,
 * directly in the browser. No data is sent anywhere.
 */
export function ClassifierDemo() {
  const [text, setText] = React.useState(EXAMPLES[0]!.text);
  const result = React.useMemo(() => (text.trim().length >= 10 ? classifyWithRules({ description: text }) : null), [text]);

  return (
    <section className="py-16 md:py-24">
      <div className="container-page grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="grid gap-5 lg:sticky lg:top-24">
          <h2 className="type-section text-fg">Suggestions an official can check.</h2>
          <p className="type-lead max-w-[48ch]">
            Each report gets a suggested category, department and priority, with the reasons behind it. An administrator accepts or overrides it, and both
            choices are recorded.
          </p>
          <p className="max-w-[52ch] text-sm leading-relaxed text-fg-subtle">
            This preview runs the same transparent keyword rules the server uses, in your browser. It is not a trained model and shows no confidence
            scores. When an AI provider is configured, results are labeled with their source.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="panel grid gap-5 p-5 sm:p-6">
          <div className="grid gap-2.5">
            <label htmlFor="classifier-demo" className="text-sm font-semibold text-fg">
              Describe a civic issue
            </label>
            <Textarea id="classifier-demo" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={400} />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-fg-subtle">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setText(ex.text)}
                  aria-pressed={text === ex.text}
                  className="h-8 rounded-chip border border-line px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="min-h-[190px] rounded-control border border-line bg-surface-2 p-4 sm:p-5">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={`${result.suggestedCategory}-${result.suggestedPriority}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-4"
                >
                  <p className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
                    <Sliders size={14} weight="bold" className="text-accent-text" /> Suggested by the local rule-based classifier
                  </p>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div className="grid content-start gap-1.5">
                      <dt className="text-xs text-fg-subtle">Category</dt>
                      <dd>
                        <CategoryChip category={result.suggestedCategory} />
                      </dd>
                      <dd className="text-xs text-fg-subtle">{CATEGORY_META[result.suggestedCategory].group}</dd>
                    </div>
                    <div className="grid content-start gap-1.5">
                      <dt className="text-xs text-fg-subtle">Department</dt>
                      <dd className="text-sm font-semibold text-fg">{result.suggestedDepartmentName}</dd>
                    </div>
                    <div className="grid content-start gap-1.5">
                      <dt className="text-xs text-fg-subtle">Priority</dt>
                      <dd>
                        <PriorityLabel priority={result.suggestedPriority} />
                      </dd>
                      <dd className="sr-only">{PRIORITY_LABELS[result.suggestedPriority]}</dd>
                    </div>
                  </dl>
                  <p className="border-t border-line pt-3 text-[13px] leading-relaxed text-fg-muted">{result.explanation}</p>
                </motion.div>
              ) : (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-fg-subtle">
                  Type at least a few words to see a suggestion.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
