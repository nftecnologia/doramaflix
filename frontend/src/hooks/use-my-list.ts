// Custom hook for My List functionality
import { useUser } from '@/contexts/user-context';
import { Show } from '@/types/user';

export function useMyList() {
  const { myList, addToMyList, removeFromMyList, isInMyList } = useUser();

  // Toggle show in my list
  const toggleMyList = (show: Show) => {
    if (isInMyList(show.id)) {
      removeFromMyList(show.id);
    } else {
      addToMyList(show);
    }
  };

  // Get my list sorted by recently added
  const getSortedMyList = () => {
    return [...myList].sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  };

  // Get my list by category
  const getMyListByCategory = (category: string) => {
    return myList.filter(item => 
      category === 'all' || item.show.category === category
    );
  };

  // Get my list statistics
  const getMyListStats = () => {
    const total = myList.length;
    const categories = myList.reduce((acc, item) => {
      acc[item.show.category] = (acc[item.show.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return {
      total,
      categories,
      mostCommonCategory,
    };
  };

  // Search my list
  const searchMyList = (query: string) => {
    if (!query.trim()) return myList;
    
    const lowercaseQuery = query.toLowerCase();
    return myList.filter(item =>
      item.show.title.toLowerCase().includes(lowercaseQuery) ||
      item.show.category.toLowerCase().includes(lowercaseQuery) ||
      item.show.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  return {
    myList,
    addToMyList,
    removeFromMyList,
    isInMyList,
    toggleMyList,
    getSortedMyList,
    getMyListByCategory,
    getMyListStats,
    searchMyList,
  };
}