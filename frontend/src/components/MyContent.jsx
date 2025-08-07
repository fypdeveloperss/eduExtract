import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

const MyContent = () => {
  const { user } = useAuth();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        setError('Please sign in to view your content.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/content`);
        setContentList(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch content.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [user]);

  if (loading) return <div className="text-center mt-8">Loading your content...</div>;
  if (error) return <div className="text-center text-red-500 mt-8">{error}</div>;
  if (!contentList.length) return <div className="text-center mt-8">No content found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">My Content</h2>
      <ul className="space-y-4">
        {contentList.map(item => (
          <li key={item._id} className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <Link to={`/content/${item._id}`} className="text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400">{item.title}</Link>
              <div className="text-sm text-gray-500 dark:text-gray-300 mt-1">Type: {item.type}</div>
            </div>
            <div className="text-sm text-gray-400 mt-2 md:mt-0">{new Date(item.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyContent; 