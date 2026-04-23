import React from 'react';
import type { ReactElement } from 'react';

/**
 * Parses strings containing `漢字（よみ）` patterns and returns JSX with
 * proper `<ruby>` tags. Multiple patterns in one string are all converted.
 * Example: `練習（れんしゅう）木人（もくじん）`
 * → `<ruby>練習<rt>れんしゅう</rt></ruby><ruby>木人<rt>もくじん</rt></ruby>`
 */
export function renderRuby(text: string): ReactElement {
  const parts: React.ReactNode[] = [];
  const pattern = /([^（]+)（([^）]+)）/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <ruby key={key++}>{match[1]}<rt>{match[2]}</rt></ruby>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
