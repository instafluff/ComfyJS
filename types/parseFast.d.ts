export declare function unescapeIRC(text: string): string;
export type ParsedMessage = {
    raw: string;
    tags: {
        [name: string]: string;
    };
    source: string | null;
    command: string | null;
    parameters: string | null;
};
export declare function parseMessage(message: string): ParsedMessage;
