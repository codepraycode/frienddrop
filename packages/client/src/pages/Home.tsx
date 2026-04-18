export function Home() {
    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <h2 className="mb-2 text-2xl font-bold text-gray-800">
                    No files shared yet
                </h2>
                <p className="mx-auto mb-6 max-w-md text-gray-500">
                    Securely share and receive files over your local network.
                    Everything is end-to-end verified and instantaneous.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <button className="cursor-pointer rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-purple-700">
                        Share Files
                    </button>
                    <button className="cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
                        Connect to Host
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
                        <span className="text-purple-500">⬇️</span> Recent
                        Downloads
                    </h3>
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500">
                        Your downloaded files will appear here
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
                        <span className="text-emerald-500">✔️</span> Active
                        Approvals
                    </h3>
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500">
                        No pending permissions
                    </div>
                </div>
            </div>
        </div>
    );
}
