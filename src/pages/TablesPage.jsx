import React, { useState, useEffect } from 'react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AddFloorModal from '../components/AddFloorModal';
import AddTableModal from '../components/AddTableModal';
import toast from 'react-hot-toast';

const TablesPage = () => {
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [floors, setFloors] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingFloor, setEditingFloor] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '', name: '' });

  // Fetch floors from Firestore
  const fetchFloors = async () => {
    try {
      const q = query(collection(db, 'floors'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const floorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFloors(floorsData);
    } catch (error) {
      console.error('Error fetching floors:', error);
      toast.error('Failed to fetch floors');
    }
  };

  // Fetch tables from Firestore
  const fetchTables = async () => {
    try {
      const q = query(collection(db, 'tables'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tablesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
    fetchTables();
  }, []);

  // Save floor to Firestore
  const handleSaveFloor = async (floorIdOrData, floorData) => {
    try {
      if (typeof floorIdOrData === 'string') {
        // Edit mode
        await updateDoc(doc(db, 'floors', floorIdOrData), floorData);
        toast.success('Floor updated successfully!');
      } else {
        // Add mode
        await addDoc(collection(db, 'floors'), floorIdOrData);
        toast.success('Floor added successfully!');
      }
      fetchFloors();
      setEditingFloor(null);
    } catch (error) {
      console.error('Error saving floor:', error);
      toast.error('Failed to save floor');
    }
  };

  // Delete floor from Firestore
  const handleDeleteFloor = async (floorId) => {
    const floor = floors.find(f => f.id === floorId);
    setDeleteConfirm({
      show: true,
      type: 'floor',
      id: floorId,
      name: floor ? `${floor.shortCode} - ${floor.name}` : 'this floor'
    });
  };

  // Confirm delete floor
  const confirmDeleteFloor = async () => {
    try {
      await deleteDoc(doc(db, 'floors', deleteConfirm.id));
      fetchFloors();
      if (selectedFloor === deleteConfirm.id) {
        setSelectedFloor('all');
      }
      toast.success('Floor deleted successfully!');
    } catch (error) {
      console.error('Error deleting floor:', error);
      toast.error('Failed to delete floor');
    } finally {
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    }
  };

  // Save table to Firestore
  const handleSaveTable = async (tableIdOrData, tableData) => {
    try {
      if (typeof tableIdOrData === 'string') {
        // Edit mode
        await updateDoc(doc(db, 'tables', tableIdOrData), tableData);
        toast.success('Table updated successfully!');
      } else {
        // Add mode
        await addDoc(collection(db, 'tables'), tableIdOrData);
        toast.success('Table added successfully!');
      }
      fetchTables();
      setEditingTable(null);
    } catch (error) {
      console.error('Error saving table:', error);
      toast.error('Failed to save table');
    }
  };

  // Delete table from Firestore
  const handleDeleteTable = async (tableId) => {
    const table = tables.find(t => t.id === tableId);
    setDeleteConfirm({
      show: true,
      type: 'table',
      id: tableId,
      name: table ? `${table.shortCode} - ${table.name}` : 'this table'
    });
  };

  // Confirm delete table
  const confirmDeleteTable = async () => {
    try {
      await deleteDoc(doc(db, 'tables', deleteConfirm.id));
      fetchTables();
      toast.success('Table deleted successfully!');
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    } finally {
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    }
  };

  // Filter tables based on selected floor
  const filteredTables = selectedFloor === 'all' 
    ? tables 
    : tables.filter(table => table.floorId === selectedFloor);

  // Calculate table stats
  const getTableStats = () => {
    const floorStats = floors.map(floor => ({
      id: floor.id,
      name: floor.shortCode,
      count: tables.filter(t => t.floorId === floor.id).length,
      capacity: tables.filter(t => t.floorId === floor.id).reduce((sum, t) => sum + (t.capacity || 0), 0)
    }));
    
    return {
      totalFloors: floors.length,
      totalTables: tables.length,
      totalCapacity: tables.reduce((sum, t) => sum + (t.capacity || 0), 0),
      floorStats
    };
  };

  const tableStats = getTableStats();

  return (
    <div className="space-y-6">
      {/* Tables Stats */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Tables Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <div className="bg-blue-50 border border-blue-200 p-2 md:p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Total Floors</p>
            <p className="text-lg md:text-xl font-bold text-blue-700">{tableStats.totalFloors}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Total Tables</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{tableStats.totalTables}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-2 md:p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Total Capacity</p>
            <p className="text-lg md:text-xl font-bold text-green-700">{tableStats.totalCapacity}</p>
          </div>
          {tableStats.floorStats.slice(0, 3).map(floor => (
            <div key={floor.id} className="bg-purple-50 border border-purple-200 p-2 md:p-3 text-center">
              <p className="text-xs text-purple-600 mb-1">{floor.name} Tables</p>
              <p className="text-lg md:text-xl font-bold text-purple-700">{floor.count}</p>
              <p className="text-[10px] text-purple-500">Cap: {floor.capacity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tables Management</h1>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFloorModal(true)}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>Add Floor</span>
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 border border-[#ec2b25] text-[#ec2b25] hover:bg-[#ec2b25] hover:text-white transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Floors Section */}
      <div className="bg-white p-3 md:p-6 border border-gray-200">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Floors</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm border transition-colors cursor-pointer ${
                selectedFloor === 'all'
                  ? 'bg-[#ec2b25] text-white border-[#ec2b25]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Floors
            </button>
            {floors.map((floor) => (
              <div
                key={floor.id}
                className={`px-2 md:px-4 py-2 text-xs md:text-sm border transition-colors flex items-center justify-between ${
                  selectedFloor === floor.id
                    ? 'bg-[#ec2b25] text-white border-[#ec2b25]'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => setSelectedFloor(floor.id)}
                  className="flex items-center space-x-1 md:space-x-2 cursor-pointer min-w-0"
                >
                  <span className="font-mono text-xs md:text-sm flex-shrink-0">{floor.shortCode}</span>
                  <span className="truncate">{floor.name}</span>
                </button>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className={`h-5 md:h-6 w-px mx-1 md:mx-2 ${
                    selectedFloor === floor.id ? 'bg-white bg-opacity-30' : 'bg-gray-300'
                  }`}></div>
                  <button
                    onClick={() => {
                      setEditingFloor(floor);
                      setShowFloorModal(true);
                    }}
                    className={`p-1 hover:bg-opacity-20 hover:bg-black cursor-pointer ${
                      selectedFloor === floor.id ? 'text-white' : 'text-gray-600'
                    }`}
                    title="Edit floor"
                  >
                    <SquarePen className="w-3 md:w-4 h-3 md:h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFloor(floor.id)}
                    className={`p-1 hover:bg-opacity-20 hover:bg-black cursor-pointer ${
                      selectedFloor === floor.id ? 'text-white' : 'text-red-600'
                    }`}
                    title="Delete floor"
                  >
                    <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && floors.length === 0 && (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
            No floors yet. Click "Add Floor" to create one.
          </div>
        )}
      </div>

      {/* Tables Section */}
      <div className="bg-white p-3 md:p-6 border border-gray-200">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Tables</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
            {selectedFloor === 'all' 
              ? 'No tables yet. Click "Add Table" to create one.'
              : 'No tables on this floor.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredTables.map((table) => {
              const floor = floors.find(f => f.id === table.floorId);
              return (
                <div
                  key={table.id}
                  className="border border-gray-200 p-3 md:p-4 hover:border-gray-300 transition-colors relative"
                >
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingTable(table);
                        setShowTableModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer"
                      title="Edit table"
                    >
                      <SquarePen className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1 hover:bg-red-50 text-red-600 cursor-pointer"
                      title="Delete table"
                    >
                      <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                  </div>
                  <div className="pr-12">
                    <h3 className="font-medium text-sm md:text-base text-gray-900 mb-1 truncate">{table.name}</h3>
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-gray-500">{table.shortCode}</div>
                      {floor && (
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          <span className="font-mono">{floor.shortCode}</span> - {floor.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddFloorModal
        isOpen={showFloorModal}
        onClose={() => {
          setShowFloorModal(false);
          setEditingFloor(null);
        }}
        onSave={handleSaveFloor}
        editData={editingFloor}
      />
      <AddTableModal
        isOpen={showTableModal}
        onClose={() => {
          setShowTableModal(false);
          setEditingTable(null);
        }}
        onSave={handleSaveTable}
        floors={floors}
        editData={editingTable}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Confirm Delete</h2>
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'floor' && ' This will not delete tables on this floor.'}
            </p>
            <div className="flex justify-end space-x-2 md:space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: '', name: '' })}
                className="px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.type === 'floor' ? confirmDeleteFloor : confirmDeleteTable}
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

export default TablesPage;
