import { Fragment, type ReactNode } from "react";

const BULLET = /^[-*] /;
const BOLD = /\*\*(.+?)\*\*/g;

/** `**x**` pairs become <strong>; an unpaired `**` stays literal. Text is never parsed as HTML. */
function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD)) {
    nodes.push(line.slice(last, match.index));
    nodes.push(<strong key={match.index}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  nodes.push(line.slice(last));
  return nodes;
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split("\n");
  if (lines.every((line) => BULLET.test(line))) {
    return (
      <ul key={key}>
        {lines.map((line, index) => (
          <li key={index}>{renderInline(line.replace(BULLET, ""))}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Small Markdown subset for agent replies: blank-line paragraphs, single line breaks, bold, and
 * `- ` / `* ` bullet lists. Everything else stays literal text.
 */
export function renderReply(text: string): ReactNode[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map(renderBlock);
}
