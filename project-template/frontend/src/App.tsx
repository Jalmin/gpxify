import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { exampleApi } from '@/services/api';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchExample = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await exampleApi.getExample();
      setMessage(data.message);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <h1 className="text-4xl font-bold mb-4">
            React + FastAPI Template
          </h1>
          <p className="text-muted-foreground mb-8">
            Production-ready starter with TypeScript, Tailwind, and Docker
          </p>

          {/* Example API Call */}
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">API Example</h2>

            <Button
              onClick={handleFetchExample}
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? 'Loading...' : 'Fetch from API'}
            </Button>

            {message && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-primary font-medium">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Quick Start */}
          <div className="mt-8 text-left bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Quick Start:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Update <code className="bg-background px-1 rounded">src/services/api.ts</code> with your endpoints</li>
              <li>Customize theme colors in <code className="bg-background px-1 rounded">src/index.css</code></li>
              <li>Build your components in <code className="bg-background px-1 rounded">src/components/</code></li>
              <li>See <code className="bg-background px-1 rounded">.claude/starter-prompt.md</code> for detailed guide</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
