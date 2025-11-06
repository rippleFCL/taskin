import { OneOffTodo, TaskStatus } from '../types';
import { Button } from '../components/ui/button';
import { Check, Circle, CircleDashed, Pencil, Plus, Trash, X, SkipForward } from 'lucide-react';

interface Props {
    oneOffs: OneOffTodo[];
    sortedOneOffs: OneOffTodo[];
    newOneTitle: string;
    newOneDesc: string;
    setNewOneTitle: (v: string) => void;
    setNewOneDesc: (v: string) => void;
    editingId: number | null;
    editTitle: string;
    editDesc: string;
    onCreate: () => Promise<void> | void;
    onStartEdit: (item: OneOffTodo) => void;
    onCancelEdit: () => void;
    onSaveEdit: (id: number) => Promise<void> | void;
    onDelete: (id: number) => Promise<void> | void;
    onStatusChange: (id: number, status: TaskStatus) => Promise<void> | void;
    setEditTitle: (v: string) => void;
    setEditDesc: (v: string) => void;
}

export default function OneOffsPage(props: Props) {
    const {
        oneOffs, sortedOneOffs,
        newOneTitle, newOneDesc, setNewOneTitle, setNewOneDesc,
        editingId, editTitle, editDesc,
        onCreate, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onStatusChange,
        setEditTitle, setEditDesc,
    } = props;

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-2 sm:grid-cols-2">
                    <input
                        className="w-full rounded-md border px-3 py-2 bg-background"
                        placeholder="Title"
                        value={newOneTitle}
                        onChange={e => setNewOneTitle(e.target.value)}
                    />
                    <textarea
                        className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[80px]"
                        placeholder="Description (optional)"
                        value={newOneDesc}
                        onChange={e => setNewOneDesc(e.target.value)}
                        rows={3}
                    />
                </div>
                <Button onClick={() => onCreate()} className="flex items-center gap-2" variant="outline">
                    <Plus className="w-4 h-4" /> Add
                </Button>
            </div>

            {oneOffs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No one-off todos</div>
            ) : (
                <div className="space-y-3">
                    {sortedOneOffs.map(item => (
                        <div key={item.id} className="p-4 bg-muted/50 rounded-lg border">
                            {/* Header row: title/desc (or inputs) on left, edit/delete on right */}
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    {editingId === item.id ? (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <textarea className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[60px]" placeholder="Title" value={editTitle} onChange={e => setEditTitle(e.target.value)} rows={2} />
                                            <textarea className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[80px]" placeholder="Description (optional)" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} />
                                        </div>
                                    ) : (
                                        <>
                                            <h4 className="font-medium flex items-center gap-2">
                                                {item.title}
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-background/40 text-muted-foreground">
                                                    {item.status === 'in-progress' ? 'In Progress' : item.status === 'complete' ? 'Complete' : item.status === 'skipped' ? 'Skipped' : 'Incomplete'}
                                                </span>
                                                <span className="ml-1 inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.status === 'complete' ? '#22c55e' : item.status === 'in-progress' ? '#3b82f6' : item.status === 'skipped' ? '#f97316' : '#64748b' }} />
                                            </h4>
                                            {item.description && (
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editingId === item.id ? (
                                        <>
                                            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => onSaveEdit(item.id)}>
                                                <Check className="w-4 h-4" />
                                                <span className="hidden sm:inline">Save</span>
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => onCancelEdit()}>
                                                <X className="w-4 h-4" />
                                                <span className="hidden sm:inline">Cancel</span>
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => onStartEdit(item)}>
                                            <Pencil className="w-4 h-4" />
                                            <span className="hidden sm:inline">Edit</span>
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => onDelete(item.id)} className="flex items-center gap-2">
                                        <Trash className="w-4 h-4" />
                                        <span className="hidden sm:inline">Delete</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Status buttons row below title/description */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(['incomplete', 'in-progress', 'complete', 'skipped'] as const).filter(s => s !== item.status).map(s => {
                                    if (s === 'incomplete') return (
                                        <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={() => onStatusChange(item.id, 'incomplete')} aria-label="Mark as incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                                    )
                                    if (s === 'in-progress') return (
                                        <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={() => onStatusChange(item.id, 'in-progress')} aria-label="Mark as in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                                    )
                                    if (s === 'complete') return (
                                        <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={() => onStatusChange(item.id, 'complete')} aria-label="Mark as complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                                    )
                                    return (
                                        <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={() => onStatusChange(item.id, 'skipped')} aria-label="Mark as skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
