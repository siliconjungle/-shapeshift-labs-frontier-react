import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view';
import type { PresencePeer } from './presence';

export const setRemotePresenceEffect = StateEffect.define<PresencePeer[]>();

export const remotePresenceField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, transaction) {
    let next = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setRemotePresenceEffect)) next = buildPresenceDecorations(transaction.state.doc.length, effect.value);
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field)
});

function buildPresenceDecorations(length: number, peers: PresencePeer[]): DecorationSet {
  const ranges = [];
  for (const peer of peers) {
    if (!peer.focus) continue;
    const anchor = clamp(peer.selection.anchor, 0, length);
    const head = clamp(peer.selection.head, 0, length);
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);
    if (from !== to) {
      ranges.push({
        from,
        to,
        decoration: Decoration.mark({
          class: 'cm-frontier-remote-selection',
          attributes: { style: `--frontier-peer-color: ${peer.color}` }
        })
      });
    }
    ranges.push({
      from: head,
      to: head,
      decoration: Decoration.widget({
        widget: new RemoteCursorWidget(peer),
        side: 1
      })
    });
  }
  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of ranges) builder.add(range.from, range.to, range.decoration);
  return builder.finish();
}

class RemoteCursorWidget extends WidgetType {
  constructor(private readonly peer: PresencePeer) {
    super();
  }

  eq(other: RemoteCursorWidget): boolean {
    return (
      other.peer.peerId === this.peer.peerId &&
      other.peer.name === this.peer.name &&
      other.peer.color === this.peer.color
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-frontier-remote-cursor';
    wrap.style.setProperty('--frontier-peer-color', this.peer.color);
    const label = document.createElement('span');
    label.className = 'cm-frontier-remote-cursor-label';
    label.textContent = this.peer.name;
    wrap.appendChild(label);
    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
