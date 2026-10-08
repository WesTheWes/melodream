// Web MIDI input: note-ons from every connected keyboard, with a timestamp on
// the page clock (performance.now()) so they can be lined up with the metronome.

export interface MidiListener {
  inputs: string[];
  stop: () => void;
}

export const midiSupported = () => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;

export async function listenForMidi(onNote: (midi: number, at: number) => void): Promise<MidiListener> {
  const access = await navigator.requestMIDIAccess();
  const inputs: MIDIInput[] = [...access.inputs.values()];
  const handler = (e: MIDIMessageEvent) => {
    const d = e.data;
    if (!d || d.length < 3) return;
    const status = d[0] & 0xf0;
    if (status === 0x90 && d[2] > 0) onNote(d[1], e.timeStamp || performance.now());
  };
  inputs.forEach((i) => i.addEventListener('midimessage', handler));
  return {
    inputs: inputs.map((i) => i.name ?? 'MIDI input'),
    stop: () => inputs.forEach((i) => i.removeEventListener('midimessage', handler)),
  };
}
