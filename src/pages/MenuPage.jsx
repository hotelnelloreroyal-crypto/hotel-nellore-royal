import React, { useState, useEffect } from 'react';
import { Plus, SquarePen, Trash2, Loader2, Printer } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AddCategoryModal from '../components/AddCategoryModal';
import AddItemModal from '../components/AddItemModal';
import { printMenuItems, preConnectQZ } from '../utils/qzPrint';
import toast from 'react-hot-toast';

const MenuPage = () => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '', name: '' });

  // Fetch categories from Firestore
  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  // Fetch items from Firestore
  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  // Save category to Firestore
  const handleSaveCategory = async (categoryIdOrData, categoryData) => {
    try {
      if (typeof categoryIdOrData === 'string') {
        // Edit mode: categoryIdOrData is the ID
        await updateDoc(doc(db, 'categories', categoryIdOrData), categoryData);
        toast.success('Category updated successfully!');
      } else {
        // Add mode: categoryIdOrData is the data
        await addDoc(collection(db, 'categories'), categoryIdOrData);
        toast.success('Category added successfully!');
      }
      fetchCategories();
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  // Delete category from Firestore
  const handleDeleteCategory = async (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    setDeleteConfirm({
      show: true,
      type: 'category',
      id: categoryId,
      name: category ? `${category.emoji} ${category.name}` : 'this category'
    });
  };

  // Confirm delete category
  const confirmDeleteCategory = async () => {
    try {
      await deleteDoc(doc(db, 'categories', deleteConfirm.id));
      fetchCategories();
      if (selectedCategory === deleteConfirm.id) {
        setSelectedCategory('all');
      }
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    }
  };

  // Save item to Firestore
  const handleSaveItem = async (itemIdOrData, itemData) => {
    try {
      if (typeof itemIdOrData === 'string') {
        // Edit mode: itemIdOrData is the ID
        await updateDoc(doc(db, 'items', itemIdOrData), itemData);
        toast.success('Item updated successfully!');
      } else {
        // Add mode: itemIdOrData is the data
        await addDoc(collection(db, 'items'), itemIdOrData);
        toast.success('Item added successfully!');
      }
      fetchItems();
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  // Delete item from Firestore
  const handleDeleteItem = async (itemId) => {
    const item = items.find(itm => itm.id === itemId);
    setDeleteConfirm({
      show: true,
      type: 'item',
      id: itemId,
      name: item ? item.name : 'this item'
    });
  };

  // Confirm delete item
  const confirmDeleteItem = async () => {
    try {
      await deleteDoc(doc(db, 'items', deleteConfirm.id));
      fetchItems();
      toast.success('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    }
  };

  // Filter items based on selected category
  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.categoryId === selectedCategory);

  const getFoodTypeColor = (type) => {
    switch(type) {
      case 'veg': return 'bg-green-500';
      case 'nonveg': return 'bg-red-500';
      case 'egg': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate menu stats
  const getMenuStats = () => {
    return {
      totalCategories: categories.length,
      totalItems: items.length,
      vegItems: items.filter(i => i.foodType === 'veg').length,
      nonVegItems: items.filter(i => i.foodType === 'nonveg').length,
      eggItems: items.filter(i => i.foodType === 'egg').length,
      activeItems: items.filter(i => i.status !== 'inactive').length
    };
  };

  const menuStats = getMenuStats();

  // Print menu items
  const handlePrintMenu = async () => {
    try {
      toast.loading('Connecting to printer...');
      await preConnectQZ();
      
      // Filter items based on selected category
      const itemsToPrint = selectedCategory === 'all' 
        ? items 
        : items.filter(item => item.categoryId === selectedCategory);
      
      await printMenuItems(itemsToPrint, categories);
      toast.dismiss();
      toast.success('Menu printed successfully!');
    } catch (error) {
      toast.dismiss();
      console.error('Print menu error:', error);
      toast.error('Failed to print menu: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Menu Stats */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Menu Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <div className="bg-blue-50 border border-blue-200 p-2 md:p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Categories</p>
            <p className="text-lg md:text-xl font-bold text-blue-700">{menuStats.totalCategories}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Total Items</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{menuStats.totalItems}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-2 md:p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Veg Items</p>
            <p className="text-lg md:text-xl font-bold text-green-700">{menuStats.vegItems}</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-2 md:p-3 text-center">
            <p className="text-xs text-red-600 mb-1">Non-Veg Items</p>
            <p className="text-lg md:text-xl font-bold text-red-700">{menuStats.nonVegItems}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">Egg Items</p>
            <p className="text-lg md:text-xl font-bold text-yellow-700">{menuStats.eggItems}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-2 md:p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">Active Items</p>
            <p className="text-lg md:text-xl font-bold text-purple-700">{menuStats.activeItems}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Menu Management</h1>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrintMenu}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-gray-700 text-white hover:bg-gray-800 transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Printer className="w-3 md:w-4 h-3 md:h-4" />
            <span>Print Menu</span>
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => setShowItemModal(true)}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 border border-[#ec2b25] text-[#ec2b25] hover:bg-[#ec2b25] hover:text-white transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white p-3 md:p-6 border border-gray-200">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Categories</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm border transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#ec2b25] text-white border-[#ec2b25]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <div
                key={category.id}
                className={`px-2 md:px-4 py-2 text-xs md:text-sm border transition-colors flex items-center justify-between ${
                  selectedCategory === category.id
                    ? 'bg-[#ec2b25] text-white border-[#ec2b25]'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center space-x-1 md:space-x-2 cursor-pointer min-w-0"
                >
                  <span className="text-sm md:text-base">{category.emoji}</span>
                  <span className="truncate">{category.name}</span>
                </button>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className={`h-5 md:h-6 w-px mx-1 md:mx-2 ${
                    selectedCategory === category.id ? 'bg-white bg-opacity-30' : 'bg-gray-300'
                  }`}></div>
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setShowCategoryModal(true);
                    }}
                    className={`p-1 hover:bg-opacity-20 hover:bg-black cursor-pointer ${
                      selectedCategory === category.id ? 'text-white' : 'text-gray-600'
                    }`}
                    title="Edit category"
                  >
                    <SquarePen className="w-3 md:w-4 h-3 md:h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className={`p-1 hover:bg-opacity-20 hover:bg-black cursor-pointer ${
                      selectedCategory === category.id ? 'text-white' : 'text-red-600'
                    }`}
                    title="Delete category"
                  >
                    <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
            No categories yet. Click "Add Category" to create one.
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white p-3 md:p-6 border border-gray-200">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Menu Items</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
            {selectedCategory === 'all' 
              ? 'No items yet. Click "Add Item" to create one.'
              : 'No items in this category.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredItems.map((item) => {
              const category = categories.find(cat => cat.id === item.categoryId);
              return (
                <div
                  key={item.id}
                  className="border border-gray-200 p-3 md:p-4 hover:border-[#ec2b25] transition-colors relative flex flex-col"
                >
                  {/* Edit/Delete Buttons */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setShowItemModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer"
                      title="Edit item"
                    >
                      <SquarePen className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 hover:bg-red-50 text-red-600 cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className="w-full aspect-square bg-gray-50 flex items-center justify-center text-5xl md:text-6xl mb-3"><img src={item.image} alt="" /></div>
                  
                  {/* Veg/Non-veg Symbol + Name */}
                  <div className="flex items-start gap-1.5 mb-2">
                    <div className={`w-4 h-4 border-2 ${item.type === 'veg' ? 'border-green-600' : item.type === 'egg' ? 'border-yellow-600' : 'border-red-600'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <div className={`w-2 h-2 rounded-full ${getFoodTypeColor(item.type)}`}></div>
                    </div>
                    <h3 className="font-medium text-sm md:text-base text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                  </div>
                  
                  {/* Category */}
                  {category && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <span>{category.emoji}</span>
                      <span className="truncate">{category.name}</span>
                    </div>
                  )}
                  
                  {/* Short Code */}
                  <p className="text-xs font-mono text-gray-400 mb-2">{item.shortCode}</p>
                  
                  {/* Price */}
                  <p className="text-lg md:text-xl font-bold text-[#ec2b25] mt-auto">₹{item.price}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        editData={editingCategory}
      />
      <AddItemModal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        categories={categories}
        editData={editingItem}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Confirm Delete</h2>
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'category' && ' This will not delete items in this category.'}
            </p>
            <div className="flex justify-end space-x-2 md:space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: '', name: '' })}
                className="px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.type === 'category' ? confirmDeleteCategory : confirmDeleteItem}
                className="px-3 md:px-4 py-2 text-sm md:text-base bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
