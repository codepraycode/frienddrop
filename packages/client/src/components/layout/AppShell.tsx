import type { ReactNode } from 'react';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900">
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 font-bold text-white shadow-sm">
                            FD
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            FriendDrop
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                            <span className="text-sm font-medium text-emerald-700">
                                LAN Active
                            </span>
                        </div>
                        <button className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 cursor-pointer">
                            Settings
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
