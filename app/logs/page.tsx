import LogsClient from './view-client';

export const revalidate = 60;

export default async function LogsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Search Logs</h1>
      <LogsClient />
    </main>
  );
}


