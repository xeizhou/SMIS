import { useState, useRef, FormEvent } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Lock, FileJson, FileSpreadsheet, Loader2, AlertTriangle, UploadCloud, FolderOpen } from 'lucide-react';

const BRAND = '#612A35';

type BackupType = 'dat' | 'json' | 'excel';

const BACKUP_TYPE_OPTIONS: { value: BackupType; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: 'dat', label: 'Encrypted Backup (.dat)', hint: 'For system restore', icon: <Lock className="size-4" /> },
    { value: 'json', label: 'JSON Backup (.json)', hint: 'For import/export', icon: <FileJson className="size-4" /> },
    { value: 'excel', label: 'Excel Backup (.xlsx)', hint: 'For viewing/reporting', icon: <FileSpreadsheet className="size-4" /> },
];

function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
}

export default function BackupModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [backupType, setBackupType] = useState<BackupType>('dat');
    const [timestamped, setTimestamped] = useState(true);
    const [compress, setCompress] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [dirHandle, setDirHandle] = useState<any>(null); // Holds the chosen local OS directory

    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    function resetAll() {
        setBackupType('dat');
        setTimestamped(true);
        setCompress(false);
        setCreateError(null);
        setRestoreFile(null);
        setRestoreError(null);
        setDirHandle(null);
        if (restoreInputRef.current) restoreInputRef.current.value = '';
    }

    function handleOpenChange(next: boolean) {
        if (!next) resetAll();
        onOpenChange(next);
    }

    async function handlePickLocalFolder() {
        if (!('showDirectoryPicker' in window)) {
            alert('Your browser does not support the folder picker. The file will be saved to your default Downloads folder instead.');
            return;
        }
        try {
            // Request OS folder picker
            const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
            setDirHandle(handle);
        } catch (e) {
            // User cancelled or permissions denied
            console.log('Folder picker cancelled', e);
        }
    }

    async function handleCreateBackup(e: FormEvent) {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);

        const formData = new FormData();
        formData.append('backup_type', backupType);
        formData.append('timestamped_subfolder', timestamped ? '1' : '0');
        formData.append('compress', compress ? '1' : '0');

        try {
            const response = await fetch('/backup/create', {
                method: 'POST',
                headers: { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Backup failed. Please try again.');
            }

            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match ? match[1] : `backup.${backupType === 'excel' ? 'xlsx' : backupType}`;

            // If the user selected a specific local folder, save it there directly
            if (dirHandle) {
                try {
                    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    setCreating(false);
                    handleOpenChange(false); // Close on success
                    return;
                } catch (saveError) {
                    console.error('Could not save to selected folder:', saveError);
                    // Fall through to default browser download if folder write fails
                }
            }

            // Fallback: Standard browser download (goes to Downloads folder)
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            
            handleOpenChange(false);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Backup failed.');
        } finally {
            setCreating(false);
        }
    }

    function handleRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRestoreFile(e.target.files?.[0] ?? null);
        setRestoreError(null);
    }

    function requestRestore() {
        if (!restoreFile) {
            setRestoreError('Please choose an encrypted backup (.zip) file first.');
            return;
        }
        setConfirmRestoreOpen(true);
    }

    function executeRestore() {
        if (!restoreFile) return;
        setConfirmRestoreOpen(false);
        setRestoring(true);
        setRestoreError(null);

        const formData = new FormData();
        formData.append('file', restoreFile);
        formData.append('confirm', '1');

        router.post('/backup/restore', formData, {
            forceFormData: true,
            onSuccess: () => {
                setRestoring(false);
                handleOpenChange(false);
            },
            onError: (errors) => {
                setRestoring(false);
                const firstError = Object.values(errors)[0];
                setRestoreError(typeof firstError === 'string' ? firstError : 'Restore failed.');
            },
        });
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[850px] p-0 gap-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                        
                        {/* LEFT PANE: Create Backup */}
                        <div className="p-6 flex flex-col justify-between space-y-6">
                            <form onSubmit={handleCreateBackup} className="space-y-6 flex-1">
                                <DialogHeader>
                                    <DialogTitle>Create Backup</DialogTitle>
                                    <DialogDescription>Export a snapshot of your system data.</DialogDescription>
                                </DialogHeader>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Backup Type</Label>
                                        <Select value={backupType} onValueChange={(v) => setBackupType(v as BackupType)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BACKUP_TYPE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <span className="flex items-center gap-2">
                                                            {opt.icon}
                                                            <span>
                                                                {opt.label}{' '}
                                                                <span className="text-xs text-muted-foreground">— {opt.hint}</span>
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* OS Native Folder Picker */}
                                    <div className="space-y-2">
                                        <Label className="text-sm">Save Destination (Local PC)</Label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePickLocalFolder}
                                                className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                                            >
                                                <FolderOpen className="size-4 shrink-0 text-blue-600" />
                                                <span className="min-w-0 flex-1 truncate text-foreground font-medium">
                                                    {dirHandle ? dirHandle.name : 'Default Downloads Folder'}
                                                </span>
                                            </button>
                                            {dirHandle && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setDirHandle(null)}>
                                                    Reset
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {dirHandle ? 'The backup file will be saved directly into this folder.' : 'Select a local folder on your computer to save the backup.'}
                                        </p>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className="text-sm">Server-side Options</Label>
                                        <label className="flex cursor-pointer items-start gap-2">
                                            <Checkbox
                                                checked={timestamped}
                                                onCheckedChange={(c) => setTimestamped(c === true)}
                                                className="mt-0.5"
                                            />
                                            <span className="text-sm">
                                                Keep a timestamped copy on the server
                                            </span>
                                        </label>
                                        <label className="flex cursor-pointer items-start gap-2">
                                            <Checkbox
                                                checked={compress}
                                                onCheckedChange={(c) => setCompress(c === true)}
                                                className="mt-0.5"
                                            />
                                            <span className="text-sm">Compress output as ZIP archive</span>
                                        </label>
                                    </div>

                                    {createError && <p className="text-xs text-red-600">{createError}</p>}
                                </div>
                            </form>

                            <Button type="submit" onClick={handleCreateBackup} disabled={creating} style={{ backgroundColor: BRAND }} className="text-white w-full">
                                {creating ? (
                                    <><Loader2 className="mr-2 size-4 animate-spin" /> Generating...</>
                                ) : (
                                    'Create & Download'
                                )}
                            </Button>
                        </div>

                        {/* RIGHT PANE: Restore */}
                        <div className="p-6 bg-muted/30 border-l border-border flex flex-col space-y-6">
                            <DialogHeader>
                                <DialogTitle>Restore System</DialogTitle>
                                <DialogDescription>Recover your data from an encrypted backup.</DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 space-y-4">
                                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <p className="text-xs leading-relaxed">
                                        Restoring will overwrite <strong>ALL</strong> existing system data. This action cannot be undone. Make sure you are using a trusted `.zip` encrypted backup.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">Select Backup File</Label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => restoreInputRef.current?.click()}
                                            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 shadow-sm"
                                        >
                                            <UploadCloud className="size-4 shrink-0" />
                                            <span className="min-w-0 flex-1 truncate">
                                                {restoreFile ? restoreFile.name : 'No file selected'}
                                            </span>
                                        </button>
                                        <input
                                            ref={restoreInputRef}
                                            type="file"
                                            accept=".zip"
                                            onChange={handleRestoreFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                    {restoreError && <p className="text-xs text-red-600 font-medium">{restoreError}</p>}
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                disabled={restoring}
                                onClick={requestRestore}
                            >
                                {restoring ? (
                                    <><Loader2 className="mr-2 size-4 animate-spin" /> Restoring...</>
                                ) : (
                                    'Restore Backup'
                                )}
                            </Button>
                        </div>

                    </div>
                </DialogContent>
            </Dialog>

            {/* Restore Confirmation Dialog */}
            <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="size-5" />
                            Overwrite all existing data?
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently replace every stock item, unit, office, fund cluster, and transaction
                            with the contents of <strong>{restoreFile?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmRestoreOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={executeRestore} className="bg-red-600 text-white hover:bg-red-700">
                            Yes, overwrite everything
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}