/**
 * HTTP client for communicating with Fastidious API
 */
interface Note {
    id: string;
    type: string;
    title?: string;
    content?: string;
    fields?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}
interface Collection {
    id: string;
    type: 'collection';
    title?: string;
    items?: string[];
    displayFields?: string[];
    viewMode?: 'grid' | 'list';
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    createdAt: string;
    updatedAt: string;
}
interface CreateNoteParams {
    title: string;
    content: string;
    collectionId?: string;
    fields?: Record<string, string>;
}
interface CreateCollectionParams {
    title: string;
    items?: string[];
    displayFields?: string[];
}
export declare function listNotes(collectionId?: string): Promise<Note[]>;
export declare function getNote(id: string): Promise<Note>;
export declare function createNote(params: CreateNoteParams): Promise<Note>;
export declare function updateNote(id: string, updates: Partial<CreateNoteParams>): Promise<Note>;
export declare function deleteNote(id: string): Promise<void>;
export declare function searchNotes(query: string, collectionId?: string): Promise<Note[]>;
export declare function listCollections(): Promise<Collection[]>;
export declare function getCollection(id: string, includeContents?: boolean): Promise<{
    collection: Collection;
    notes?: Note[];
}>;
export declare function createCollection(params: CreateCollectionParams): Promise<Collection>;
export declare function addToCollection(collectionId: string, noteIds: string[]): Promise<Collection>;
export declare function removeFromCollection(collectionId: string, noteIds: string[]): Promise<Collection>;
export declare function uploadFile(base64Content: string, filename: string, mimeType: string, title?: string, collectionId?: string): Promise<Note>;
export {};
//# sourceMappingURL=client.d.ts.map