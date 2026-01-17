import React, { useState, useRef } from 'react';
import { X, Loader2, ChevronDown, Search, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImageToImageKit } from '../utils/imagekit';

const FOOD_TYPES = [
  { value: 'veg', label: 'Vegetarian', color: 'bg-green-500', borderColor: 'border-green-600' },
  { value: 'nonveg', label: 'Non-Vegetarian', color: 'bg-red-500', borderColor: 'border-red-600' },
  { value: 'egg', label: 'Egg', color: 'bg-yellow-500', borderColor: 'border-yellow-600' }
];

const AddItemModal = ({ isOpen, onClose, onSave, categories, editData }) => {
  const [itemName, setItemName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [selectedType, setSelectedType] = useState('veg');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Image states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Update form when editData changes
  React.useEffect(() => {
    if (editData) {
      setItemName(editData.name || '');
      setShortCode(editData.shortCode || '');
      setSelectedType(editData.type || 'veg');
      setPrice(editData.price?.toString() || '');
      setSelectedCategory(editData.categoryId || '');
      setExistingImage(editData.image || null);
      setImagePreview(null);
      setImageFile(null);
    } else {
      setItemName('');
      setShortCode('');
      setSelectedType('veg');
      setPrice('');
      setSelectedCategory('');
      setExistingImage(null);
      setImagePreview(null);
      setImageFile(null);
    }
    setSearchQuery('');
  }, [editData, isOpen]);

  // Handle image file selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }
    if (!shortCode.trim()) {
      toast.error('Please enter a short code');
      return;
    }
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = existingImage || null;
      
      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          // Clean item name for file name
          const cleanFileName = itemName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
          const fileName = `${cleanFileName}_${Date.now()}`;
          
          const uploadResult = await uploadImageToImageKit(imageFile, fileName, 'RestaurantItems');
          imageUrl = uploadResult.url;
          toast.success('Image uploaded successfully!');
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          toast.error('Failed to upload image. Saving item without image.');
          imageUrl = existingImage || null;
        } finally {
          setUploadingImage(false);
        }
      }

      const itemData = {
        name: itemName,
        shortCode: shortCode.toUpperCase(),
        type: selectedType,
        price: parseFloat(price),
        categoryId: selectedCategory,
        image: imageUrl,
      };

      if (editData) {
        // Editing existing item
        await onSave(editData.id, itemData);
      } else {
        // Adding new item
        itemData.createdAt = new Date().toISOString();
        await onSave(itemData);
      }

      // Reset form
      setItemName('');
      setShortCode('');
      setSelectedType('veg');
      setPrice('');
      setSelectedCategory('');
      setSearchQuery('');
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter categories based on search query
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white w-full max-w-md p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editData ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Image
            </label>
            <div className="border-2 border-dashed border-gray-300 p-4 text-center hover:border-[#ec2b25] transition-colors">
              {imagePreview || existingImage ? (
                <div className="relative">
                  <img 
                    src={imagePreview || existingImage} 
                    alt="Item preview" 
                    className="w-full h-40 object-cover mx-auto"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-sm text-[#ec2b25] hover:underline cursor-pointer"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer py-6"
                >
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Click to upload image</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
              placeholder="Enter item name"
            />
          </div>

          {/* Item Short Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] font-mono"
              placeholder="e.g., CH01, BRY05"
              maxLength={10}
            />
          </div>

          {/* Category Dropdown with Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full px-4 py-2 border border-gray-200 flex items-center justify-between hover:border-gray-300 cursor-pointer"
              >
                <span className="text-gray-700">
                  {selectedCategoryData 
                    ? `${selectedCategoryData.emoji} ${selectedCategoryData.name}` 
                    : 'Select a category'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {showDropdown && (
                <div className="absolute w-full mt-1 bg-white border border-gray-200 z-10 max-h-64 flex flex-col">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  {/* Category List */}
                  <div className="overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {searchQuery ? 'No categories found' : 'No categories available'}
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer ${
                            selectedCategory === category.id ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span>{category.emoji}</span>
                          <span className="text-sm text-gray-700">{category.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Food Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FOOD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center justify-center space-x-2 px-3 py-2 border-2 transition-all cursor-pointer ${
                    selectedType === type.value 
                      ? `${type.borderColor} bg-gray-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                  <span className="text-sm text-gray-700">{type.label}</span>
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
            disabled={loading || uploadingImage}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || uploadingImage}
          >
            {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{uploadingImage ? 'Uploading...' : loading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
