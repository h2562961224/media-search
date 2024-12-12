'use client'

import { useState, useEffect, FC, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Source, SearchResponse } from '../api/types/search';
import { searchAPI } from '../api/search';
import { SearchIcon, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm'
import { Spin, Typography } from '@arco-design/web-react';
import 'github-markdown-css/github-markdown.css';

interface SearchComponentProps {
  initialQuery?: string;
}

const SourceItem: FC<{ source: Source }> = ({ source }) => (
  <div className="flex-shrink-0 w-64 max-h-28 p-4 bg-white rounded-lg shadow-md mr-4">
    <h3 className="text-lg font-semibold mb-2 truncate">
      <a href={source.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {source.title}
      </a>
    </h3>
    <p className="text-sm text-gray-600 truncate mb-2">{source.url}</p>
    <Typography.Paragraph
      ellipsis={{ rows: 1, showTooltip: true, wrapper: 'p' }}
    >{source.snippet}
    </Typography.Paragraph>
  </div>
);

const SearchComponent: FC<SearchComponentProps> = ({ initialQuery = '' }) => {
  const [URLSearchParams, setURLSearchParams] = useSearchParams();
  const [query, setQuery] = useState<string>(initialQuery);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearched, setIsSearched] = useState<boolean>(false);
  const [ lastQ, setLastQ ] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setIsSearched(true);

    const eventSource: EventSource = searchAPI(searchQuery);
    eventSource.onmessage = (event) => {
      console.log(event.data);
      const data = event.data;
      if (data === '[DONE]') {
        eventSource.close();
        setIsLoading(false);
        return;
      }
      setSearchResponse(JSON.parse(event.data));
    };
    eventSource.onerror = () => {
      console.error('An error occurred while searching. Please try again.');
      eventSource.close();
      setIsLoading(false);
      setError('An error occurred while searching. Please try again.');
    };
  }, []);

  useEffect(() => {
    const q = URLSearchParams.get('q');
    if (q && q !== lastQ) {
      setQuery(q);
      handleSearch(q);
      setLastQ(q);
    }
  }, [handleSearch, URLSearchParams, lastQ]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setURLSearchParams({ q: query });
  }, [query, setURLSearchParams]
  );

  const handleReset = useCallback(() => {
    setQuery('');
    setSearchResponse(null);
    setIsSearched(false);
    setURLSearchParams({});
  }, [setURLSearchParams]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className={`flex flex-col ${isSearched ? 'justify-start pt-4' : 'flex-grow justify-center'} items-center px-4 sm:px-6 md:px-8`}>
        {!isSearched && (
          <h1 className="text-4xl sm:text-5xl font-bold text-center text-indigo-800 mb-8">
            超级搜索
          </h1>
        )}
        <div className={`w-full max-w-2xl ${isSearched ? 'bg-white shadow-md' : ''}`}>
          <form onSubmit={handleSubmit} className={`flex items-center ${isSearched ? 'border-b border-gray-200' : ''}`}>
            {isSearched && (
              <button
                type="button"
                onClick={handleReset}
                className="p-3 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="想问啥呢?"
              className={`w-full p-4 text-lg focus:outline-none ${isSearched
                ? 'border-none'
                : 'border-2 border-indigo-300 rounded-full focus:border-indigo-500 shadow-md'
                }`}
            />
            <button
              type="submit"
              className={`p-2 ${isSearched
                ? 'text-indigo-600 hover:text-indigo-800'
                : 'bg-indigo-600 text-white rounded-full hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                } transition duration-300 ease-in-out disabled:opacity-50`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-t-2 border-current border-solid rounded-full animate-spin"></div>
              ) : (
                <SearchIcon className="w-6 h-6" />
              )}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-center mt-4 bg-red-100 p-3 rounded-lg">
          {error}
        </p>
      )}

      {searchResponse && (
        <div className="flex-grow overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 relative">
              <h2 className="text-xl font-semibold mb-4">来源{searchResponse.sources.length}</h2>
              <div className="flex items-center">
                <button
                  onClick={() => scroll({ left: -200, behavior: 'smooth' })}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {searchResponse.sources.map((source) => (
                    <SourceItem key={source.id} source={source} />
                  ))}
                </div>
                <button
                  onClick={() => scroll({ left: 200, behavior: 'smooth' })}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8 markdown-body">
              <h2 className="text-2xl font-semibold mb-4">总结</h2>
              <Spin delay={500} loading={isLoading}>
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                  }}
                >
                  {searchResponse.summary}
                </Markdown>
              </Spin>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">相关问题</h2>
              <Spin delay={500} loading={isLoading}>
                <ul className="space-y-2">
                  {searchResponse.relatedQuestions.map((question, index) => (
                    <li key={index}>
                      <button
                        onClick={() => {
                          setQuery(question);
                          handleSearch(question);
                        }}
                        className="text-blue-600 hover:underline focus:outline-none"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </Spin>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;

