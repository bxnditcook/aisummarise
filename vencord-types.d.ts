// Type declarations for Vencord
// These are simplified for local development only

declare module '@webpack' {
    export const webpack: {
        getByProps: (...props: string[]) => any;
    };
    
    export function findStoreLazy(name: string): any;
    export function findByPropsLazy(...props: string[]): any;
}

declare module '@webpack/common' {
    export const React: typeof import('react');
    export const FluxDispatcher: {
        subscribe: (event: string, callback: (...args: any[]) => void) => void;
        unsubscribe: (event: string, callback: (...args: any[]) => void) => void;
        dispatch: (event: string, payload: any) => void;
    };
}

declare module '@utils/constants' {
    export const Devs: Record<string, { name: string, id: bigint }>;
}

declare module '@utils/types' {
    export function definePlugin(plugin: any): any;
    export const types: any;
}

declare module '@api/MessageActions' {
    export function addButton(id: string, component: React.ComponentType<any>): void;
    export function removeButton(id: string): void;
}
