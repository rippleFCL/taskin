import { CalendarClock, Ban } from 'lucide-react';
import { Timeslot } from '../types';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function formatDateTime(iso: string): string {
    // Render as "DD MMM HH:MM" in local time, e.g., "12 Nov 09:30"
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.toLocaleString(undefined, { month: 'short' });
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${pad(day)} ${month} ${hh}:${mm}`;
}

export function TimeslotChip({ slot }: { slot: Timeslot | undefined }) {
    if (!slot) return null;
    const impossible = slot.start === null && slot.end === null;
    if (impossible) {
        return (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-muted/60 text-sm font-mono text-muted-foreground" title="No feasible time today">
                <Ban className="w-3.5 h-3.5" />
                Not today
            </span>
        );
    }
    return (
        <>
            {slot.start && (
                <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-sm font-mono border-green-500 text-green-700 dark:text-green-400 bg-transparent" title="Start no earlier than">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {formatDateTime(slot.start)}
                </span>
            )}
            {slot.end && (
                <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-sm font-mono border-orange-500 text-orange-700 dark:text-orange-400 bg-transparent" title="Finish by">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {formatDateTime(slot.end)}
                </span>
            )}
        </>
    );
}

export default TimeslotChip;
