export interface FileNode {
    name: string;
    type: 'file' | 'directory';
    size: number | null; // null for directories
    mimeType: string | null; // null for directories
    children: FileNode[] | null;
}

export interface CachedFileTree {
    id: string; // "{contactId}:{path}"
    contactId: string;
    path: string;
    tree: FileNode[];
    cachedAt: number; // Unix timestamp (ms)
}
