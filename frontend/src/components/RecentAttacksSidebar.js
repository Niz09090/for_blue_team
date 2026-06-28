import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RecentAttacksSidebar({ isOpen, onToggle }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCyberNews = async () => {
      try {
        const response = await axios.get('/api/cyber-news');
        setArticles(response.data);
      } catch (err) {
        console.error('Failed to fetch cyber news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCyberNews();
    
    // Poll every 5 minutes for news updates
    const interval = setInterval(fetchCyberNews, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-soc-dark border border-gray-700 border-r-0 rounded-r-lg px-2 py-4 hover:bg-soc-accent/20 transition-colors z-40"
        title="Show Cyber Threat News"
      >
        <svg className="w-5 h-5 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-soc-dark border-r border-gray-800 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Cyber Threat News</h2>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin w-8 h-8 border-2 border-soc-accent border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading news...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p>No news available</p>
          </div>
        ) : (
          articles.map((article, index) => (
            <div
              key={index}
              className="border-l-4 border-l-soc-accent bg-soc-accent/10 p-3 rounded-r hover:bg-soc-accent/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-white leading-tight pr-2">
                  {article.title}
                </h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {article.time_ago}
                </span>
              </div>
              
              <p className="text-xs text-gray-400 mb-2 line-clamp-3">
                {article.summary}
              </p>
              
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-soc-accent hover:text-soc-accent/80 transition-colors"
              >
                Read More →
              </a>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Powered by The Hacker News • Updates every 5m
        </div>
      </div>
    </div>
  );
}

export default RecentAttacksSidebar;
