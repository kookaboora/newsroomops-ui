import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContentQueuePage } from "./features/content-queue/ContentQueuePage";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ContentQueuePage />
    </QueryClientProvider>
  );
}

