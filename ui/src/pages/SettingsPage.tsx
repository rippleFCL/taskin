import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const DEAD_VALUE_MIN = 0;
const DEAD_VALUE_MAX = 10;

export default function SettingsPage() {
    const [deadValue, setDeadValue] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const value = await api.getDeadValue();
                if (!cancelled) {
                    setDeadValue(value);
                    setInputValue(String(value));
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message || 'Failed to load DEAD_VALUE setting');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const handleChange = (v: string) => {
        setInputValue(v);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setError('Value is required');
            return;
        }
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed)) {
            setError('Value must be a whole number');
            return;
        }
        if (parsed < DEAD_VALUE_MIN || parsed > DEAD_VALUE_MAX) {
            setError(`Value must be between ${DEAD_VALUE_MIN} and ${DEAD_VALUE_MAX}`);
            return;
        }
        try {
            setIsSaving(true);
            const updated = await api.updateDeadValue(parsed);
            setDeadValue(updated);
            setInputValue(String(updated));
            setSuccess('Setting saved');
        } catch (e: any) {
            setError(e?.message || 'Failed to save setting');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && deadValue === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Configure Taskin behaviour</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dead Value</CardTitle>
                    <CardDescription>
                        Controls how forgiving the recommendation engine is when deciding which tasks are "ready".
                        Must be between {DEAD_VALUE_MIN} and {DEAD_VALUE_MAX}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-foreground" htmlFor="dead-value-input">
                                DEAD_VALUE
                            </label>
                            <input
                                id="dead-value-input"
                                type="number"
                                min={DEAD_VALUE_MIN}
                                max={DEAD_VALUE_MAX}
                                step={1}
                                value={inputValue}
                                onChange={(e) => handleChange(e.target.value)}
                                className="w-full rounded-md border px-3 py-2 bg-background text-foreground"
                            />
                            <p className="text-xs text-muted-foreground">
                                Current value: <span className="font-mono">{deadValue ?? '–'}</span>
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        {success && !error && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
                        )}

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
