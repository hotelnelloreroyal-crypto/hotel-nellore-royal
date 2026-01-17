import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Modal from '../components/UI/Modal';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const MenuManagement = () => {
  const { categories, menuItems, addCategory, updateCategory, deleteCategory, addMenuItem, updateMenuItem, deleteMenuItem } = useRestaurant();
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: categories[0]?.id || 1,
    price: '',
    image: '🍽️',
    description: '',
    available: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '🍽️',
    color: '#FF6B6B',
  });

  const filteredItems = menuItems
    .filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory)
    .filter(item => 
      searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm(item);
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        categoryId: categories[0]?.id || 1,
        price: '',
        image: '🍽️',
        description: '',
        available: true,
      });
    }
    setIsItemModalOpen(true);
  };

  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm(category);
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        icon: '🍽️',
        color: '#FF6B6B',
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingItem) {
      updateMenuItem(editingItem.id, itemForm);
    } else {
      addMenuItem(itemForm);
    }
    setIsItemModalOpen(false);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) {
      alert('Please enter category name');
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryForm);
    } else {
      addCategory(categoryForm);
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMenuItem(id);
    }
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('Are you sure you want to delete this category? All items in this category will also be deleted.')) {
      deleteCategory(id);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600 mt-1">Manage your menu categories and items</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleOpenCategoryModal()}>
            <Plus size={20} />
            Add Category
          </Button>
          <Button variant="primary" onClick={() => handleOpenItemModal()} className="bg-gradient-to-r from-orange-500 to-red-600">
            <Plus size={20} />
            Add Item
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <Card variant="elevated">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="relative group p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{category.icon}</div>
                <p className="font-semibold text-gray-900 text-sm">{category.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {menuItems.filter(item => item.categoryId === category.id).length} items
                </p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => handleOpenCategoryModal(category)}
                  className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} variant="elevated" className="hover:shadow-xl transition-shadow">
            <div className="relative">
              <div className="text-center mb-3">
                <div className="text-5xl mb-2">{item.image}</div>
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-orange-600">
                  {formatCurrency(item.price)}
                </span>
                <Badge variant={item.available ? 'available' : 'cancelled'}>
                  {item.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenItemModal(item)}
                  className="flex-1"
                >
                  <Edit size={16} />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveItem} className="bg-gradient-to-r from-orange-500 to-red-600">
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Item Name *</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter item name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Category *</label>
            <select
              value={itemForm.categoryId}
              onChange={(e) => setItemForm({ ...itemForm, categoryId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Price *</label>
            <input
              type="number"
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter price"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Icon/Emoji</label>
            <input
              type="text"
              value={itemForm.image}
              onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter emoji"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter description"
              rows="3"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="available"
              checked={itemForm.available}
              onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="available" className="text-sm font-medium text-gray-900">
              Available for sale
            </label>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCategory} className="bg-gradient-to-r from-orange-500 to-red-600">
              {editingCategory ? 'Update' : 'Add'} Category
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Category Name *</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Icon/Emoji</label>
            <input
              type="text"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter emoji"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Color</label>
            <input
              type="color"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MenuManagement;
