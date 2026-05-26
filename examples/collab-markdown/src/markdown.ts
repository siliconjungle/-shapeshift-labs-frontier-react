export function renderMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const escaped = inline(escapeHtml(line));
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const list = /^[-*]\s+(.+)$/.exec(line);
    if (list) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(escapeHtml(list[1]))}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
    } else if (line.trim().length === 0) {
      out.push('<br />');
    } else {
      out.push(`<p>${escaped}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
