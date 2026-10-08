'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkle } from '@phosphor-icons/react';
import { CATEGORY_META, PRIORITY_LABELS, classifyWithRules } from '@fixmycity/shared';
import { CategoryChip, PriorityLabel } from '@/components/common/complaint-meta';
import { Textarea } from '@/components/ui/field';
import { Reveal } from '@/components/motion/reveal';

const EXAMPLES = [
  'Water pipeline burst near our street. Water has been leaking continuously.',
  'Large pothole near MG Road affecting daily commuters.',
  'Streetlight not working and there are exposed wires at the pole.',
  'Garbage has not been collected for 5 days near the market.',
];

/**
 * Runs the same deterministic rule set the server uses as its classifier,
 * directly in the browser. No data is sent anywhere.
 */
export function ClassifierDemo() {
  const [text, setText] = React.useState(EXAMPLES[0]!);
  const result = React.useMemo(() => (text.trim().length >= 10 ? classifyWithRules({ description: text }) : null), [text]);

  return (
    <section className="py-20 lg:py-28">
      <div className="container-page grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal className="grid gap-5">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">Suggestions an official can check.</h2>
          <p className="max-w-[54ch] text-lg leading-relaxed text-fg-muted">
            Each report gets a suggested category, department and priority with the reasons behind it. Administrators accept or override it, and both
            choices are recorded.
          </p>
          <p className="max-w-[54ch] text-sm leading-relaxed text-fg-subtle">
            This preview runs the same transparent keyword rules the server uses. It is not a trained model and shows no confidence scores. When an AI
            provider is configured, results are labeled with their source.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="panel grid gap-5 p-5 sm:p-6">
          <div className="grid gap-2">
            <label htmlFor="classifier-demo" className="text-sm font-semibold text-fg">
              Describe a civic issue
            </label>
            <Textarea id="classifier-demo" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={400} />
            <div className="flex flex-wrap gap-1.5" aria-label="Example complaints">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {ex.split(' ').slice(0, 3).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="min-h-[178px] rounded-[14px] border border-line bg-surface-2 p-4">
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
                  <div className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
                    <Sparkle size={14} weight="fill" className="text-accent" /> Suggested by the local rule-based classifier
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1">
                      <dt className="text-xs text-fg-subtle">Category</dt>
                      <dd>
                        <CategoryChip category={result.suggestedCategory} />
                      </dd>
                      <dd className="text-xs text-fg-subtle">{CATEGORY_META[result.suggestedCategory].group}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="text-xs text-fg-subtle">Department</dt>
                      <dd className="text-[13px] font-semibold text-fg">{result.suggestedDepartmentName}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="text-xs text-fg-subtle">Priority</dt>
                      <dd>
                        <PriorityLabel priority={result.suggestedPriority} />
                      </dd>
                      <dd className="sr-only">{PRIORITY_LABELS[result.suggestedPriority]}</dd>
                    </div>
                  </dl>
                  <p className="text-[13px] leading-relaxed text-fg-muted">{result.explanation}</p>
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
