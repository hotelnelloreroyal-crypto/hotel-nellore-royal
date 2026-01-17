import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch staff data using email as document ID
          const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.email));
          if (staffDoc.exists()) {
            const data = staffDoc.data();
            setUser(firebaseUser);
            setStaffData({
              id: firebaseUser.email,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name,
              access: data.access || [],
              isAdmin: false,
              ...data
            });
          } else {
            // No staff data = Admin with full access
            setUser(firebaseUser);
            setStaffData({
              id: firebaseUser.email,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: 'Admin',
              access: [], // Empty means all access for admin
              isAdmin: true
            });
          }
        } catch (error) {
          console.error('Error fetching staff data:', error);
          setUser(null);
          setStaffData(null);
        }
      } else {
        setUser(null);
        setStaffData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch staff data using email as document ID
      const staffDoc = await getDoc(doc(db, 'staff', email));
      let staffInfo;
      
      if (staffDoc.exists()) {
        const data = staffDoc.data();
        staffInfo = {
          id: email,
          uid: userCredential.user.uid,
          email: email,
          name: data.name,
          access: data.access || [],
          isAdmin: false,
          ...data
        };
      } else {
        // No staff data = Admin with full access
        staffInfo = {
          id: email,
          uid: userCredential.user.uid,
          email: email,
          name: 'Admin',
          access: [], // Empty means all access for admin
          isAdmin: true
        };
      }
      
      setStaffData(staffInfo);
      toast.success('Login successful!');
      return staffInfo;
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('User not found');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Wrong password');
      } else {
        toast.error('Login failed. Please try again.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setStaffData(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const hasAccess = (menuValue) => {
    // Dashboard is only accessible to admin
    if (menuValue === 'dashboard') {
      return staffData?.isAdmin === true;
    }
    // Admin has access to everything
    if (staffData?.isAdmin === true) return true;
    // Check if user has access to the menu
    return staffData?.access?.includes(menuValue) || false;
  };

  const value = {
    user,
    staffData,
    loading,
    login,
    logout,
    hasAccess,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
