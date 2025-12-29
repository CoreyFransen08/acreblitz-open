import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import { DocsViewer } from '../components/DocsViewer';

export function DocPage() {
  const location = useLocation();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract the path after /docs/
        const pathMatch = location.pathname.match(/^\/docs\/(.+)$/);
        if (!pathMatch) {
          throw new Error('Invalid document path');
        }
        
        const docPath = pathMatch[1];
        
        // Handle README case
        if (docPath === 'README') {
          const response = await fetch('/docs/README.md');
          if (!response.ok) {
            throw new Error(`Failed to load document: ${response.statusText}`);
          }
          const text = await response.text();
          setContent(text);
          return;
        }
        
        // Construct the path to the markdown file
        // The path is like "components/map/data-overlays/soil-overlay"
        // We need to convert it to "/docs/components/map/data-overlays/soil-overlay.md"
        const filePath = `/docs/${docPath}.md`;
        
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }
        
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link to="/docs" className="btn-primary">
              Back to Documentation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2 text-gray-600">
          <li>
            <Link to="/docs" className="hover:text-primary-600">
              Docs
            </Link>
          </li>
          {(() => {
            const pathMatch = location.pathname.match(/^\/docs\/(.+)$/);
            if (!pathMatch) return null;
            
            const docPath = pathMatch[1];
            
            if (docPath === 'README') {
              return (
                <>
                  <li>/</li>
                  <li className="text-gray-900">Overview</li>
                </>
              );
            }
            
            // Split the path and create breadcrumb items
            const segments = docPath.split('/');
            return segments.map((segment, index) => (
              <React.Fragment key={index}>
                <li>/</li>
                <li className="text-gray-900 capitalize">{segment.replace(/-/g, ' ')}</li>
              </React.Fragment>
            ));
          })()}
        </ol>
      </nav>

      {/* Document Content */}
      <div className="card p-8">
        <DocsViewer content={content} />
      </div>

      {/* Back to Docs Link */}
      <div className="mt-6 text-center">
        <Link to="/docs" className="text-primary-600 hover:text-primary-700 underline">
          ← Back to Documentation
        </Link>
      </div>
    </div>
  );
}

