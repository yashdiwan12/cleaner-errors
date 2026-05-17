export interface EnhancedError {
    source: string;
    type: string;
    what: string;
    fields: string[];
    fix: string;
    docs: string;
}
