import React from 'react';

/** **bold** inside a line (other symbols are shown as typed). */
function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={`${key}-${i}`} className="font-semibold text-gym-primary">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

type Block = { kind: 'p' | 'ul' | 'ol'; lines: string[] };

/**
 * Shows the AI trainer's reply neatly: paragraphs, bullet and numbered lists, and bold.
 * Headings become bold lines and table rows become simple list items. Built from React
 * elements only (no HTML from the AI is ever inserted).
 */
export const ChatText: React.FC<{ text: string }> = ({ text }) => {
  const blocks: Block[] = [];
  const push = (kind: Block['kind'], line: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && kind !== 'p') last.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  };

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue;
    if (/^\|?\s*:?-{2,}/.test(line)) continue; // table separator row
    if (line.startsWith('|')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      push('ul', cells.join(' · '));
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      push('p', `**${heading[1].replace(/\*\*/g, '')}**`);
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      push('ul', bullet[1]);
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      push('ol', numbered[1]);
      continue;
    }
    push('p', line);
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>{inline(b.lines[0], `p${i}`)}</p>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="list-disc pl-5 space-y-1 marker:text-gym-primary">
            {b.lines.map((l, j) => (
              <li key={j}>{inline(l, `u${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal pl-5 space-y-1 marker:text-gym-primary">
            {b.lines.map((l, j) => (
              <li key={j}>{inline(l, `o${i}-${j}`)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
};
