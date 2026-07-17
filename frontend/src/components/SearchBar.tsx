import React, { useState } from 'react';
import axios from 'axios';

type SearchResult = Record<string, any>;

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.get<SearchResult[]>('/api/v1/search', {
        params: { q: query },
      });
      setResults(resp.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Search failed');
    }
  };

  return (
    <div>
      <h3>Search FIRs</h3>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter keywords"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Search
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results.length > 0 && (
        <ul>
          {results.map((r, idx) => (
            <li key={idx}>{JSON.stringify(r)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
