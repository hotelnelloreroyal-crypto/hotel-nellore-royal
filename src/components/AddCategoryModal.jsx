import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJIS = ['🍕', '🍔', '🍟', '🌮', '🍜', '🍱', '🍛', '🥗', '🍰', '☕', '🍹', '🥤', '🍩', '🥘', '🍝', '🥪', '🍗', '🥩', '🍖', '🍤', '🍣', '🥙', '🌯', '🥟'];

const AddCategoryModal = ({ isOpen, onClose, onSave, editData }) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍕');
  const [loading, setLoading] = useState(false);

  // Update form when editData changes
  React.useEffect(() => {
    if (editData) {
      setCategoryName(editData.name || '');
      setSelectedEmoji(editData.emoji || '🍕');
    } else {
      setCategoryName('');
      setSelectedEmoji('🍕');
    }
  }, [editData, isOpen]);

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      const categoryData = {
        name: categoryName,
        emoji: selectedEmoji,
      };

      if (editData) {
        // Editing existing category
        await onSave(editData.id, categoryData);
      } else {
        // Adding new category
        categoryData.createdAt = new Date().toISOString();
        await onSave(categoryData);
      }

      // Reset form
      setCategoryName('');
      setSelectedEmoji('🍕');
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white w-full max-w-md p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editData ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
              placeholder="Enter category name"
            />
          </div>

          {/* Emoji Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Emoji
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 hover:bg-gray-100 transition-colors cursor-pointer ${
                    selectedEmoji === emoji ? 'bg-gray-200' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;
