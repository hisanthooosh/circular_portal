import React, { useState, useEffect, useMemo } from 'react';

// A simple utility to decode JWT tokens to get user role
const decodeToken = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        localStorage.removeItem('token');
        return null;
    }
};

const API_BASE_URL = 'http://localhost:5000/api';

// --- SVG Icons ---
const IconDashboard = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconNewCircular = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconManageUsers = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconLogout = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const IconDelete = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconSignatories = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>; // New Icon
const IconAdd = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconRemove = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>;
const IconMenu = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

function App() {
    const [page, setPage] = useState('login');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [currentUser, setCurrentUser] = useState(null);

    const [circulars, setCirculars] = useState([]);
    const [users, setUsers] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [signatories, setSignatories] = useState([]); // New state for signatories

    const [allUsersOverview, setAllUsersOverview] = useState([]); // State for the SA overview 
    const [allCircularsOverview, setAllCircularsOverview] = useState([]); // State for SA Circulars Overview
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
    // State for modals and interaction
    const [circularToReview, setCircularToReview] = useState(null);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [circularToView, setCircularToView] = useState(null);
    const [circularToApprove, setCircularToApprove] = useState(null); // For CA review
    const [isApproverModalOpen, setIsApproverModalOpen] = useState(false); // For CA review
    const [circularToEdit, setCircularToEdit] = useState(null); // State to hold circular being edited
    const [circularToAdminReview, setCircularToAdminReview] = useState(null); // For Admin review
    const [isAdminReviewModalOpen, setIsAdminReviewModalOpen] = useState(false); // For Admin review

    const api = useMemo(() => ({

        fetchWithAuth: async (url, options = {}) => {
            // Get the LATEST token from localStorage right before making the call
            const currentToken = localStorage.getItem('token');
            console.log(`FRONTEND: fetchWithAuth called for ${url}. Token being sent: ${currentToken ? currentToken.substring(0, 10) + '...' : 'None'}`); // Log token being used

            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            // Use the currentToken fetched just now
            if (currentToken) {
                headers['x-auth-token'] = currentToken;
            } else {
                console.warn(`FRONTEND: No token found in localStorage for request to ${url}`);
                // Depending on your API design, you might want to throw an error here
                // or let the backend handle the missing token (which it does via authMiddleware)
            }

            const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status} ${response.statusText}` };
                try {
                    // Try to parse detailed error message from backend
                    const backendError = await response.json();
                    errorData.message = backendError.message || errorData.message;
                } catch (e) { /* Ignore if response body is not JSON */ }
                console.error(`FRONTEND: API Error on ${url}:`, errorData.message); // Log the error
                throw new Error(errorData.message);
            }

            // Handle empty responses (like DELETE)
            const contentType = response.headers.get("content-type");
            if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
                // Assume success if status is 204 No Content or response isn't JSON
                return { success: true };
            }
            // Otherwise, parse and return JSON body
            return response.json();
        },
        login: (email, password) => fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err))),
        getCirculars: () => api.fetchWithAuth('/circulars'),
        createCircular: (data) => api.fetchWithAuth('/circulars', { method: 'POST', body: JSON.stringify(data) }),
        updateCircular: (id, data) => api.fetchWithAuth(`/circulars/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        submitCircular: (id) => api.fetchWithAuth(`/circulars/submit/${id}`, { method: 'PATCH' }),
        // ... rest of api functions
        reviewCircular: (id, data) => api.fetchWithAuth(`/circulars/review/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        getUsers: () => api.fetchWithAuth('/users'),
        createUser: (data) => api.fetchWithAuth('/users', { method: 'POST', body: JSON.stringify(data) }),
        deleteUser: (id) => api.fetchWithAuth(`/users/${id}`, { method: 'DELETE' }),
        // New Signatory API functions
        getSignatories: () => api.fetchWithAuth('/signatories'),
        getAllUsers: () => api.fetchWithAuth('/users/all'), // Calls the new backend route

        getAllCirculars: () => api.fetchWithAuth('/circulars/all'), // Calls the new backend route
        createSignatory: (data) => api.fetchWithAuth('/signatories', { method: 'POST', body: JSON.stringify(data) }),
        deleteSignatory: (id) => api.fetchWithAuth(`/signatories/${id}`, { method: 'DELETE' }),
        deleteCircular: (id) => api.fetchWithAuth(`/circulars/${id}`, { method: 'DELETE' }),
        // Add this inside the api object if it's not already there
        higherReviewCircular: (id, data) => api.fetchWithAuth(`/circulars/higher-review/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        adminReviewCircular: (id, data) => api.fetchWithAuth(`/circulars/admin-review/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    }), [token]);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            const decoded = decodeToken(storedToken);
            if (decoded) {
                setCurrentUser(decoded.user);
                setToken(storedToken);
                setPage('dashboard');
            }
        }
        setIsLoading(false);
    }, []);



    // Updated function to load users (for SA and Admin) and approvers (for SA only)
    const loadUsersAndApprovers = async () => {
        // UPDATED CHECK: Allow SA or Admin to load users
        if (!token || !currentUser || (currentUser?.role !== 'Super Admin' && currentUser?.role !== 'Admin')) {
            console.log("loadUsersAndApprovers skipped: User not SA or Admin, or not logged in.");
            // Ensure users list is empty if not authorized or not logged in
            setUsers([]);
            setApprovers([]);
            return;
        }

        // ADDED LOG: Check role before fetch
        console.log(`FRONTEND: Attempting to load users. Current user role: ${currentUser?.role}`);

        setIsLoading(true);
        setError('');
        try {
            // This calls GET /api/users - backend handles filtering based on role
            const userData = await api.getUsers();

            // ADDED LOG: See what data arrived from the backend
            console.log(`FRONTEND: Received ${userData.length} users:`, userData);

            setUsers(userData); // Update the main users list with whatever the backend sent

            // UPDATED: Only Super Admin needs to populate the separate 'approvers' list
            // (This list is used in the SA's review modal)
            if (currentUser?.role === 'Super Admin') {
                setApprovers(userData.filter(u => u.role === 'Circular Approver'));
                console.log("FRONTEND: Filtered approvers for SA:", approvers);
            } else {
                // Admin doesn't need the separate approvers list, ensure it's empty
                setApprovers([]);
            }
        } catch (err) {
            console.error("FRONTEND: Error loading users:", err); // Log error
            setError(err.message);
            setUsers([]); // Clear users on error
            setApprovers([]); // Clear approvers on error
            if (err.message.includes('401')) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    // New function to load signatories
    const loadSignatories = async () => {
        if (!token || currentUser?.role !== 'Super Admin') return; // Only SA manages them
        setIsLoading(true);
        setError('');
        try {
            const signatoryData = await api.getSignatories();
            setSignatories(signatoryData);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('401')) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    // New function to load ALL users for SA overview
    const loadAllUsersData = async () => {
        if (!token || currentUser?.role !== 'Super Admin') return; // Strictly SA only
        console.log("FRONTEND: loadAllUsersData called..."); // <<< ADD LOG
        setIsLoading(true);
        setError('');
        try {
            const allUserData = await api.getAllUsers(); // Calls GET /api/users/all
            // ---> ADD THIS LOG <---
            console.log("FRONTEND: Received data from /api/users/all:", allUserData);
            setAllUsersOverview(allUserData); // Update state
        } catch (err) {
            console.error("FRONTEND: Error in loadAllUsersData:", err); // <<< ADD LOG
            setError(err.message);
            setAllUsersOverview([]); // Ensure state is empty array on error
            if (err.message.includes('401')) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    // New function to load ALL circulars for SA overview
    const loadAllCircularsData = async () => {
        if (!token || currentUser?.role !== 'Super Admin') return; // Strictly SA only
        console.log("FRONTEND: loadAllCircularsData called...");
        setIsLoading(true);
        setError('');
        try {
            const allCircularData = await api.getAllCirculars();
            console.log("FRONTEND: Received data from /api/circulars/all:", allCircularData);
            setAllCircularsOverview(allCircularData);
        } catch (err) {
            console.error("FRONTEND: Error in loadAllCircularsData:", err);
            setError(err.message);
            setAllCircularsOverview([]);
            if (err.message.includes('401')) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    // --- PASTE THIS NEW, CORRECTED useEffect block (replaces lines 274-354) ---
    useEffect(() => {
        // Only run if we have a token and user info (avoids running on initial load/logout)
        if (!token || !currentUser) {
            // Clear data if logged out or token invalid
            setCirculars([]);
            setUsers([]);
            setApprovers([]);
            setSignatories([]);
            setAllUsersOverview([]);
            setAllCircularsOverview([]); // Clear any other data states too
            console.log("useEffect: Skipping data load - No token or currentUser.");
            // If not logged in AND not already on login page, force logout/redirect
            if (page !== 'login') {
                handleLogout(); // Use the existing logout function
            }
            return; // Stop execution
        }

        console.log(`useEffect triggered for page: ${page}. Current User Role: ${currentUser.role}`);
        setError(''); // Clear errors on page change/reload
        setIsLoading(true); // Set loading true for all data fetches triggered by page change

        // Define an async function INSIDE useEffect to fetch data
        const fetchData = async () => {
            try {
                // Use a local copy of currentUser for safety inside async calls
                const userForLoad = currentUser;

                // Fetch data based on page and role
                if (page === 'dashboard') {
                    const circData = await api.getCirculars();
                    setCirculars(circData);
                    // SA might also need approvers list for review modal on dashboard
                    if (userForLoad.role === 'Super Admin') {
                        const userData = await api.getUsers(); // Use the filtered GET /api/users
                        setApprovers(userData.filter(u => u.role === 'Circular Approver'));
                    }
                }
                // Fetch data specific to Super Admin pages
                else if (userForLoad.role === 'Super Admin') {
                    if (page === 'manageUsers') {
                        const userData = await api.getUsers(); // Fetches SA's direct reports + Admins
                        setUsers(userData);
                    } else if (page === 'manageSignatories') {
                        const sigData = await api.getSignatories();
                        setSignatories(sigData);
                    } else if (page === 'allUsersOverview') {
                        const allUserData = await api.getAllUsers(); // Fetches ALL users
                        setAllUsersOverview(allUserData);
                    } else if (page === 'allCircularsOverview') {
                        const allCircData = await api.getAllCirculars();
                        setAllCircularsOverview(allCircData);
                    }
                    else if (page === 'create') {
                        const sigData = await api.getSignatories();
                        setSignatories(sigData);
                    }
                }
                // Fetch data specific to Admin pages
                else if (userForLoad.role === 'Admin') {
                    if (page === 'manageUsers') {
                        const userData = await api.getUsers(); // Fetches Admin's direct reports
                        setUsers(userData);
                    }
                    // Load signatories if Admin navigates to create page
                    else if (page === 'create') {
                        const sigData = await api.getSignatories();
                        setSignatories(sigData);
                    }
                }
                // Fetch data specific to Creator pages
                else if (userForLoad.role === 'Circular Creator') {
                    // Load signatories if Creator navigates to create page
                    if (page === 'create') {
                        const sigData = await api.getSignatories();
                        setSignatories(sigData);
                    }
                }
                // Add logic for Approver/Viewer dashboards later if needed

            } catch (err) {
                console.error(`FRONTEND: Error loading data for page ${page}:`, err);
                setError(err.message || `Failed to load data for ${page}.`);
                if (err.message && (err.message.includes('401') || err.message.includes('authorization denied') || err.message.includes('Token is not valid'))) {
                    handleLogout(); // Force logout on auth errors
                }
            } finally {
                setIsLoading(false); // Set loading false after attempts finish
            }
        };

        fetchData(); // Execute the async data fetching function

        // Dependencies: Re-run when page changes, token changes, or user object changes
    }, [page, token, currentUser, api]); // Added api as dependency
    // --- END OF REPLACEMENT BLOCK ---
    // // --- END CORRECTION ---
    const handleLogin = async (email, password) => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.login(email, password);
            localStorage.setItem('token', data.token);
            const user = decodeToken(data.token).user;
            setCurrentUser(user);
            setToken(data.token);
            setPage('dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CORRECTED handleLogout ---
    const handleLogout = () => {
        console.log("FRONTEND: Logging out..."); // Add log for debugging
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null); // Clear the current user state
        setPage('login');     // Navigate to login page

        // --- IMPORTANT: Clear all fetched data states ---
        setCirculars([]);
        setUsers([]);
        setApprovers([]);
        setSignatories([]);
        setError(''); // Clear any existing errors
    };
    // --- END CORRECTION ---

    // Replace the entire old handleCreateCircular function (around Line 170) with this:
    const handleCreateCircular = async (circularData, andSubmit = false) => {
        setIsLoading(true);
        setError(''); // Clear previous errors
        try {
            // Check if we are updating (circularToEdit has data) or creating (it's null)
            if (circularToEdit) {

                // --- UPDATE LOGIC ---
                console.log("Attempting to UPDATE circular:", circularToEdit._id, "with data:", circularData);
                // Call the new update API function
                const updatedCircular = await api.updateCircular(circularToEdit._id, circularData);
                console.log("Update successful:", updatedCircular);

                // If submitting immediately after edit:
                if (andSubmit) {
                    // Submit the *updated* circular
                    await api.submitCircular(updatedCircular._id);
                    console.log("Submitted updated circular:", updatedCircular._id);
                }
                // --- END UPDATE LOGIC ---

            } else {
                // --- CREATE LOGIC (Existing code) ---
                const newCircular = await api.createCircular(circularData);
                if (andSubmit) {
                    await api.submitCircular(newCircular._id);
                }
            }

            // --- Common actions after SUCCESSFUL Create OR Update ---
            setCircularToEdit(null); // <<< IMPORTANT: Clear the edit state
            setPage('dashboard');    // Navigate back to the dashboard
            // The useEffect hook watching 'page' will automatically trigger data reload

        } catch (err) {
            console.error("Error saving circular:", err); // Log the error
            setError(err.message || "Failed to save circular."); // Show error to user
            setIsLoading(false); // <<< IMPORTANT: Stop loading indicator on error
        }
        // No finally setIsLoading here anymore, loading stops on error or relies on dashboard reload
    };

    const handleSubmitCircular = async (id) => {
        setIsLoading(true);
        try {
            await api.submitCircular(id);
            loadDashboardData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReviewCircular = async (id, decisionData) => {
        setIsLoading(true);
        try {
            await api.reviewCircular(id, decisionData);
            setReviewModalOpen(false);
            setCircularToReview(null);
            loadDashboardData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (userData) => {
        setIsLoading(true);
        setError('');
        try {
            await api.createUser(userData);
            loadUsersAndApprovers(); // Refresh user list
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setIsLoading(true);
            setError('');
            try {
                await api.deleteUser(id);
                setUsers(prev => prev.filter(u => u._id !== id));
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleDeleteCircular = async (id) => {
        if (window.confirm('Are you sure you want to delete this circular? This can only be done for Drafts or Rejected items.')) {
            setIsLoading(true);
            setError('');
            try {
                await api.deleteCircular(id);
                // Refresh the list after successful deletion
                setCirculars(prev => prev.filter(c => c._id !== id));
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };
    // New handlers for Signatories
    const handleCreateSignatory = async (signatoryData) => {
        setIsLoading(true);
        setError('');
        try {
            await api.createSignatory(signatoryData);
            loadSignatories(); // Refresh the list
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSignatory = async (id) => {
        if (window.confirm('Are you sure you want to delete this Signatory Authority?')) {
            setIsLoading(true);
            setError('');
            try {
                await api.deleteSignatory(id);
                setSignatories(prev => prev.filter(s => s._id !== id));
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleAdminReview = async (id, decisionData) => {
        setIsLoading(true);
        setError('');
        try {
            await api.adminReviewCircular(id, decisionData);
            setIsAdminReviewModalOpen(false); // Close modal
            setCircularToAdminReview(null);
            loadDashboardData(); // Refresh dashboard
        } catch (err) {
            setError(err.message || "Failed to submit Admin review.");
            // Keep modal open on error?
        } finally {
            setIsLoading(false);
        }
    };
    const handleEditCircular = (circular) => {
        console.log("Editing circular:", circular); // Debug log
        setCircularToEdit(circular); // Store the circular data
        setPage('create'); // Navigate to the create/edit page
    };

    const handleApproverReview = async (id, decisionData) => {
        setIsLoading(true);
        setError('');
        try {
            await api.higherReviewCircular(id, decisionData);
            setIsApproverModalOpen(false); // Close modal on success
            setCircularToApprove(null);
            loadDashboardData(); // Refresh the dashboard to show updated status
        } catch (err) {
            // Display error within the modal perhaps? Or use the main error state
            setError(err.message || "Failed to submit review.");
            // Keep modal open on error? Optional.
        } finally {
            setIsLoading(false);
        }
    };

    const renderPage = () => {
        if (isLoading && page !== 'login') return <div className="text-center p-10 text-gray-500">Loading...</div>;

        switch (page) {
            case 'dashboard': return <DashboardPage
                circulars={circulars}
                currentUser={currentUser}
                onSubmitForApproval={handleSubmitCircular}
                onReview={(c) => { setCircularToReview(c); setReviewModalOpen(true); }} // SA Review
                onView={(c) => { setCircularToView(c); setPage('view'); }}
                onDeleteCircular={handleDeleteCircular}
                onApproverReview={(c) => { setCircularToApprove(c); setIsApproverModalOpen(true); }} // CA Review
                onEditCircular={handleEditCircular}
                onAdminReview={(c) => { setCircularToAdminReview(c); setIsAdminReviewModalOpen(true); }} // <<< ADD THIS PROP (Admin Review)
            />;
            case 'create': return <CreateCircularPage
                onSubmit={handleCreateCircular}
                onCancel={() => { setCircularToEdit(null); setPage('dashboard'); }} // Clear edit state on cancel
                availableSignatories={signatories} // We added this earlier
                error={error}                     // We added this earlier
                circularToEdit={circularToEdit} // <<< ADD THIS PROP
            />;
            // --- ADD THIS CASE ---
            case 'allUsersOverview': return <AllUsersOverviewPage allUsers={allUsersOverview} currentUser={currentUser} />;
            // --- ADD THIS CASE ---
            case 'allCircularsOverview': return <AllCircularsOverviewPage allCirculars={allCircularsOverview} onView={(c) => { setCircularToView(c); setPage('view'); }} availableSignatories={signatories} />;
            // --- END ADD ---
            // --- END ADD ---
            // Add this case:
            case 'manageUsers': return <ManageUsersPage users={users} onAddUser={handleCreateUser} onDeleteUser={handleDeleteUser} error={error} currentUser={currentUser} />;
            case 'view': return <ViewCircularPage circular={circularToView} onBack={() => setPage('dashboard')} availableSignatories={signatories} />;
            case 'manageSignatories': return <ManageSignatoriesPage signatories={signatories} onAddSignatory={handleCreateSignatory} onDeleteSignatory={handleDeleteSignatory} error={error} />; // New page
            case 'login': default: return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={error} />;

        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            {/* To this: */}
            {currentUser && <Header onLogout={handleLogout} setPage={setPage} currentPage={page} currentUser={currentUser} onOpenSidebar={() => setIsSidebarOpen(true)} />}
            {/* ... rest of the return ... */}
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderPage()}
            </main>
            {/* --- ADD Sidebar Rendering --- */}
            <SidebarMenu
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                setPage={setPage}
                currentUser={currentUser}
            />
            {/* --- END Sidebar Rendering --- */}
            {isReviewModalOpen && (
                <ReviewModal
                    circular={circularToReview}
                    approvers={approvers}
                    onClose={() => setReviewModalOpen(false)}
                    onSubmit={handleReviewCircular}
                    isLoading={isLoading}
                />
            )}
            {isApproverModalOpen && ( // Add this block for the new modal
                <ApproverReviewModal
                    circular={circularToApprove}
                    onClose={() => setIsApproverModalOpen(false)}
                    onSubmit={handleApproverReview}
                    isLoading={isLoading}
                />
            )}
            {/* --- PASTE THE ADMIN MODAL CODE HERE --- */}
            {isAdminReviewModalOpen && (
                <AdminReviewModal
                    circular={circularToAdminReview}
                    onClose={() => setIsAdminReviewModalOpen(false)}
                    onSubmit={handleAdminReview}
                    isLoading={isLoading}
                />
            )}
            {/* --- END PASTE --- */}
        </div>
    );
}

// --- Components (Styled with the light theme) ---

function Header({ onLogout, setPage, currentPage, currentUser, onOpenSidebar }) {
    const navItemBase = "flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200";
    const activeClass = "bg-blue-600 text-white shadow";
    const inactiveClass = "text-gray-600 hover:bg-gray-200";

    return (
        <header className="bg-white shadow-md mb-8">

            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">

                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setPage('dashboard')}>
                    {/* --- ADD THIS MENU BUTTON --- */}
                    <button
                        onClick={onOpenSidebar}
                        className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ml-3" // Added margin-left
                        aria-label="Open menu"
                    >
                        <IconMenu />
                    </button>
                    {/* --- END MENU BUTTON --- */}

                    <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Circular Portal</h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 hidden lg:block">Welcome, {currentUser.name}</span>
                        <button onClick={onLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            <IconLogout /> <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
}

function LoginPage({ onLogin, isLoading, error }) {
    const [email, setEmail] = useState('superadmin@test.com');
    const [password, setPassword] = useState('password123');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Circular Portal Login</h1>
                    <p className="text-gray-500">Please sign in to continue</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center">{error}</p>}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow-sm appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow-sm appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition-transform transform hover:scale-105 disabled:bg-gray-400">
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- FINAL DashboardPage ---
// Replace your existing DashboardPage function (around Line 388) with this entire block:
function DashboardPage({ circulars = [], currentUser, onSubmitForApproval, onReview, onView, onDeleteCircular, onApproverReview, onAdminReview, onEditCircular, onPublishCircular }) {
    const getStatusClass = (status) => {
        switch (status) {
            case 'Approved': case 'Published': return 'bg-green-100 text-green-800';
            case 'Pending Admin': case 'Pending Super Admin': case 'Pending Higher Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800'; // Draft
        }
    };

    // Helper to check if the current CA needs to review this circular
    const isPendingThisApprover = (circular) => {
        if (!circular || !currentUser || currentUser.role !== 'Circular Approver' || circular.status !== 'Pending Higher Approval') {
            return false;
        }
        // Check if this approver is in the list AND their decision is still Pending
        return circular.approvers?.find(appr => appr.user?._id === currentUser.id && appr.decision === 'Pending');
    };

    // Helper to check if the current Admin needs to review this circular
    const isPendingThisAdmin = (circular) => {
        if (!circular || !currentUser || currentUser.role !== 'Admin' || circular.status !== 'Pending Admin') {
            return false;
        }
        // Check if the circular was submitted TO this specific Admin
        return circular.submittedTo?._id === currentUser.id;
    };

    // Helper to check if the current Super Admin needs to review this circular
    const isPendingThisSuperAdmin = (circular) => {
        if (!circular || !currentUser || currentUser.role !== 'Super Admin' || circular.status !== 'Pending Super Admin') {
            return false;
        }
        // Check if the circular was submitted TO this specific Super Admin
        return circular.submittedTo?._id === currentUser.id;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Welcome, {currentUser.name}!</h2>
            <p className="text-gray-500 mb-6">You are logged in as a <span className="font-semibold text-blue-600">{currentUser.role}</span>. Here are the circulars relevant to you.</p>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            {/* Conditionally add CA Decision column */}
                            {currentUser.role === 'Circular Approver' && (
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Decision</th>
                            )}
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {/* Add console log inside map for debugging status/submittedTo */}
                        {circulars.length > 0 ? circulars.map(c => {

                            // --- ENSURE THIS LOG LINE IS HERE ---
                            console.log(`Dashboard Row Render: ID=${c._id}, Status='${c.status}', SubmittedTo=${c.submittedTo?._id}(${c.submittedTo?.name})`);
                            console.log(`Dashboard Row Render: ID=${c._id}, Status='${c.status}', Subject='${c.subject}', SubmittedTo=${c.submittedTo?._id}(${c.submittedTo?.name})`);
                            return (
                                <tr key={c._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">{new Date(c.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">{c.type}</td>
                                    <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate" title={c.subject}>{c.subject}</td>
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600">{c.author?.name || 'N/A'}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(c.status)}`}>
                                            {c.status}
                                        </span>
                                        {/* Show rejection reason if applicable */}
                                        {c.status === 'Rejected' && (c.rejectionReason || c.approvers?.find(a => a.decision === 'Rejected')?.feedback) && (
                                            <p className="text-xs text-red-600 mt-1" title={c.rejectionReason || c.approvers?.find(a => a.decision === 'Rejected')?.feedback}>
                                                Reason: {(c.rejectionReason || c.approvers?.find(a => a.decision === 'Rejected')?.feedback || '').substring(0, 50)}...
                                            </p>
                                        )}
                                        {/* Show who it's pending with */}
                                        {(c.status === 'Pending Admin' || c.status === 'Pending Super Admin') && c.submittedTo?.name && (
                                            <p className="text-xs text-gray-500 mt-1">Pending: {c.submittedTo.name}</p>
                                        )}
                                        {c.status === 'Pending Higher Approval' && (
                                            <p className="text-xs text-gray-500 mt-1">Pending CA ({c.approvers?.filter(a => a.decision === 'Pending').length || 0})</p>
                                        )}
                                    </td>
                                    {/* --- CA's Decision Cell --- */}
                                    {currentUser.role === 'Circular Approver' && (
                                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                                            {c.approvers?.find(appr => appr.user?._id === currentUser.id)?.decision || 'N/A'}
                                        </td>
                                    )}
                                    {/* --- Actions Cell --- */}
                                    <td className="py-3 px-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        {/* View Button - Always available */}
                                        <button onClick={() => onView(c)} className="text-gray-500 hover:text-gray-800" title="View Details">View</button>

                                        {/* --- Circular Creator Actions --- */}
                                        {currentUser.role === 'Circular Creator' && c.author?._id === currentUser.id && (
                                            <>
                                                {(c.status === 'Draft' || c.status === 'Rejected') && (
                                                    <button onClick={() => onSubmitForApproval(c._id)} className="text-indigo-600 hover:text-indigo-900 font-semibold" title="Submit for review">Submit</button>
                                                )}
                                                {(c.status === 'Draft' || c.status === 'Rejected') && (
                                                    <button onClick={() => onEditCircular(c)} className="text-blue-600 hover:text-blue-900" title="Edit Circular">Edit</button>
                                                )}
                                                {(c.status === 'Draft' || c.status === 'Rejected') && (
                                                    <button onClick={() => onDeleteCircular(c._id)} className="text-red-600 hover:text-red-900" title="Delete Circular">Delete</button>
                                                )}
                                            </>
                                        )}

                                        {/* --- Admin Actions --- */}
                                        {currentUser.role === 'Admin' && isPendingThisAdmin(c) && ( // Use helper
                                            <button onClick={() => onAdminReview(c)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs" title="Review this submission">Review</button>
                                        )}
                                        {currentUser.role === 'Admin' && c.author?._id === currentUser.id && (c.status === 'Draft' || c.status === 'Rejected') && (
                                            <>
                                                <button onClick={() => onEditCircular(c)} className="text-blue-600 hover:text-blue-900" title="Edit Your Circular">Edit</button>
                                                <button onClick={() => onDeleteCircular(c._id)} className="text-red-600 hover:text-red-900" title="Delete Your Circular">Delete</button>
                                            </>
                                        )}


                                        {/* --- Super Admin Actions --- */}
                                        {currentUser.role === 'Super Admin' && (
                                            <>
                                                {/* CORRECTED CHECK for SA Review Button */}
                                                {isPendingThisSuperAdmin(c) && ( // Use helper function
                                                    <button onClick={() => onReview(c)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs" title="Review Submission">Review</button>
                                                )}
                                                {/* Edit Button for SA */}
                                                {(c.status === 'Draft' || c.status === 'Rejected') && ( // Allow SA to edit any draft/rejected
                                                    <button onClick={() => onEditCircular(c)} className="text-blue-600 hover:text-blue-900" title="Edit Circular (Admin)">Edit</button>
                                                )}
                                                {/* Publish Button */}
                                                {c.status === 'Approved' && (
                                                    <button onClick={() => onPublishCircular(c._id)} className="bg-teal-500 text-white px-3 py-1 rounded hover:bg-teal-600 text-xs" title="Publish this circular">Publish</button>
                                                )}
                                                {/* Delete Button for SA */}
                                                <button onClick={() => onDeleteCircular(c._id)} className="text-red-600 hover:text-red-900" title="Delete Circular (Admin)">Delete</button>
                                            </>
                                        )}

                                        {/* --- Approver Actions --- */}
                                        {currentUser.role === 'Circular Approver' && isPendingThisApprover(c) && ( // Use helper
                                            <button onClick={() => onApproverReview(c)} className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 text-xs" title="Submit Your Review">Review</button>
                                        )}
                                    </td>
                                </tr>
                            ); // End return for map
                        }) : ( // Else for map (no circulars)
                            // Correctly placed table row for "No circulars"
                            <tr>
                                <td colSpan={currentUser.role === 'Circular Approver' ? 7 : 6} className="text-center py-10 text-gray-500">No circulars found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- UPDATED CreateCircularPage (Handles Editing, Fixed Preview, Better Styling) ---
function CreateCircularPage({ onSubmit, onCancel, availableSignatories = [], error, circularToEdit }) { // Added default for availableSignatories
    const [isPreview, setIsPreview] = useState(false);
    const [formData, setFormData] = useState({
        // Initial empty/default state
        type: 'Circular', subject: '', circularNumber: '',
        date: new Date().toISOString().split('T')[0], body: '',
        signatories: [{ authority: '', order: 1 }],
        agendaPoints: [], copyTo: [],
    });

    const isEditMode = Boolean(circularToEdit);

    useEffect(() => {
        if (isEditMode && circularToEdit) {
            console.log("Edit mode detected. Pre-filling form with:", circularToEdit);
            setFormData({
                type: circularToEdit.type || 'Circular',
                subject: circularToEdit.subject || '',
                circularNumber: circularToEdit.circularNumber || '',
                date: circularToEdit.date ? new Date(circularToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                body: circularToEdit.body || '',
                signatories: circularToEdit.signatories?.map(sig => ({
                    authority: sig.authority?._id || sig.authority || '',
                    order: sig.order || 1
                })) || [{ authority: '', order: 1 }],
                agendaPoints: circularToEdit.agendaPoints || [],
                copyTo: circularToEdit.copyTo || [],
            });
        } else if (!isEditMode) { // Only reset if not in edit mode (prevents flicker on initial edit load)
            setFormData({
                type: 'Circular', subject: '', circularNumber: '',
                date: new Date().toISOString().split('T')[0], body: '',
                signatories: [{ authority: '', order: 1 }],
                agendaPoints: [], copyTo: [],
            });
        }
    }, [circularToEdit, isEditMode]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSignatoryChange = (index, field, value) => {
        const updatedSignatories = [...formData.signatories];
        updatedSignatories[index] = { ...updatedSignatories[index], [field]: value };
        if (field === 'order') {
            updatedSignatories[index][field] = parseInt(value) || 1;
        }
        setFormData({ ...formData, signatories: updatedSignatories });
    };

    const addSignatorySlot = () => {
        setFormData({
            ...formData,
            signatories: [...formData.signatories, { authority: '', order: formData.signatories.length + 1 }]
        });
    };

    const removeSignatorySlot = (indexToRemove) => { // Allow removing specific index
        if (formData.signatories.length > 1) {
            const updatedSignatories = formData.signatories.filter((_, index) => index !== indexToRemove);
            // Re-order if needed? For now, just remove.
            setFormData({ ...formData, signatories: updatedSignatories });
        } else {
            alert("At least one signatory is required.");
        }
    };

    const handleSaveDraft = () => {
        const dataToSend = isEditMode ? { ...formData, _id: circularToEdit._id } : formData;
        onSubmit(dataToSend, false);
    };

    const handleSaveAndSubmit = () => {
        if (!formData.signatories.every(s => s.authority && s.order > 0)) {
            alert("Please select a valid authority for each signatory slot and ensure order is positive.");
            return;
        }
        const dataToSend = isEditMode ? { ...formData, _id: circularToEdit._id } : formData;
        onSubmit(dataToSend, true);
    };

    // --- Preview Data Calculation (Refined) ---
    const previewData = useMemo(() => {
        // Only calculate if isPreview is true AND availableSignatories has loaded
        if (!isPreview || !availableSignatories || availableSignatories.length === 0) {
            console.log("Preview skipped, isPreview:", isPreview, "availableSignatories empty:", !availableSignatories || availableSignatories.length === 0);
            return null;
        }
        console.log("Calculating preview data...");
        try {
            const enrichedSignatories = formData.signatories
                .map(sig => {
                    // Find matching authority from the full list loaded via API
                    const authorityDetails = availableSignatories.find(a => a._id === sig.authority);
                    return {
                        authority: authorityDetails ? { // Simulate populated structure for ViewComponent
                            _id: authorityDetails._id,
                            name: authorityDetails.name,
                            position: authorityDetails.position
                        } : null, // Handle case where selection might be invalid temporarily
                        order: sig.order || 1,
                        // Include raw name/position in case needed as fallback, though lookup is preferred
                        name: authorityDetails?.name || 'N/A - Invalid Selection?',
                        position: authorityDetails?.position || 'N/A'
                    };
                })
                .filter(sig => sig.authority !== null) // Filter out any slots where authority wasn't found
                .sort((a, b) => a.order - b.order); // Ensure sorted for preview

            console.log("Enriched Signatories for Preview:", enrichedSignatories);

            return {
                ...formData, // Include all other form data
                signatories: enrichedSignatories // Use the enriched & sorted list
            };
        } catch (e) {
            console.error("Error calculating previewData:", e);
            alert("An error occurred generating the preview. Please check your selections.");
            setIsPreview(false); // Turn off preview on error
            return null;
        }

    }, [isPreview, formData, availableSignatories]); // Dependencies: preview flag, form data, and the loaded list

    // --- Render Logic ---

    if (isPreview && previewData) {
        // Preview Mode
        return (
            <div>
                <ViewCircularPage circular={previewData} onBack={() => setIsPreview(false)} isPreview={true} />
                <div className="max-w-4xl mx-auto text-center mt-6 no-print">
                    <button onClick={() => setIsPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 mr-4">Back to Edit</button>
                    <button onClick={handleSaveAndSubmit} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                        {isEditMode ? 'Update & Submit for Approval' : 'Save & Submit for Approval'}
                    </button>
                </div>
            </div>
        );
    }

    // Form Mode
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {isEditMode ? 'Edit Circular' : 'Create New Document (Draft)'}
            </h2>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
            <form className="space-y-6">
                {/* Row 1: Type, Date, Number */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Type</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm" required>
                            <option>Circular</option> <option>Order</option> <option>Memo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Date</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Document Number</label>
                        <input type="text" name="circularNumber" value={formData.circularNumber} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm" placeholder="e.g., MBU/REG/2025/01" required />
                    </div>
                </div>
                {/* Row 2: Subject */}
                <div>
                    <label className="block font-bold text-gray-700 mb-1">Subject / Description</label>
                    <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm" required />
                </div>
                {/* Row 3: Body */}
                <div>
                    <label className="block font-bold text-gray-700 mb-1">Body</label>
                    <textarea name="body" value={formData.body} onChange={handleChange} rows="8" className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm" required></textarea>
                </div>

                {/* --- Signatories Section (Improved Styling) --- */}
                <div className="border rounded-lg p-4 bg-gray-50 shadow-sm">
                    <label className="block font-bold text-gray-700 mb-3">Signatory Authorities</label>
                    <div className="space-y-4">
                        {formData.signatories.map((sig, index) => (
                            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-3 border rounded-md bg-white shadow-xs">
                                <span className="font-semibold text-gray-600 mr-2">#{index + 1}</span>
                                <select
                                    value={sig.authority}
                                    onChange={(e) => handleSignatoryChange(index, 'authority', e.target.value)}
                                    className="flex-grow p-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                                    required
                                >
                                    <option value="">-- Select Authority --</option>
                                    {(availableSignatories || []).map(auth => ( // Safety check for availableSignatories
                                        <option key={auth._id} value={auth._id}>
                                            {auth.name} ({auth.position})
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm text-gray-600">Order:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={sig.order}
                                        onChange={(e) => handleSignatoryChange(index, 'order', e.target.value)}
                                        className="w-16 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center"
                                        required
                                    />
                                </div>
                                {formData.signatories.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeSignatorySlot(index)} // Pass index to remove
                                        className="p-1 text-red-500 hover:text-red-700"
                                        title="Remove this signatory"
                                    >
                                        <IconRemove />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={addSignatorySlot}
                            className="flex items-center bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 text-sm shadow transition-colors"
                        >
                            <IconAdd /> <span className="ml-1">Add Signatory Slot</span>
                        </button>
                    </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 shadow transition-colors">Cancel</button>
                    <button type="button" onClick={() => setIsPreview(true)} className="bg-yellow-500 text-white px-6 py-2 rounded-md hover:bg-yellow-600 shadow transition-colors">Preview</button>
                    <button type="button" onClick={handleSaveDraft} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 shadow transition-colors">
                        {isEditMode ? 'Update Draft' : 'Save as Draft'}
                    </button>
                </div>
            </form>
        </div>
    );
}
function ReviewModal({ circular, approvers, onClose, onSubmit, isLoading }) {
    const [decision, setDecision] = useState('Approve');
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedApprovers, setSelectedApprovers] = useState([]);

    const handleApproverChange = (e) => {
        const options = [...e.target.selectedOptions];
        const values = options.map(option => option.value);
        setSelectedApprovers(values);
    }

    const handleSubmit = () => {
        // Basic validation
        if (decision === 'Reject' && !rejectionReason.trim()) {
            alert('A reason is required when rejecting.');
            return;
        }

        const decisionData = { decision }; // 'decision' will be "Approve" or "Reject"
        if (decision === 'Reject') {
            decisionData.rejectionReason = rejectionReason;
        } else if (decision === 'Approve' && selectedApprovers.length > 0) {
            decisionData.higherApproverIds = selectedApprovers;
        }
        onSubmit(circular._id, decisionData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl text-gray-800">
                <h2 className="text-2xl font-bold mb-4">Review Circular</h2>
                <div className="mb-4 p-4 border rounded-md bg-gray-50">
                    {/* Use circular.subject which is the new field */}
                    <p><strong>Subject:</strong> {circular.subject || circular.title}</p>
                    <p><strong>Circular No:</strong> {circular.circularNumber}</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block font-bold mb-2">Decision</label>
                        <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option value="Approve">Approve</option>
                            {/* --- THIS IS THE FIX --- */}
                            <option value="Reject">Reject</option>
                            {/* --- END FIX --- */}
                        </select>
                    </div>
                    {/* This check for 'Reject' will now work */}
                    {decision === 'Reject' && (
                        <div>
                            <label className="block font-bold mb-2">Reason for Rejection <span className="text-red-500">*</span></label>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows="3" className="w-full p-2 border rounded-md" placeholder="Provide a reason..." required></textarea>
                        </div>
                    )}
                    {decision === 'Approve' && (
                        <div>
                            <label className="block font-bold mb-2">Send for Higher Approval (Optional)</label>
                            <p className="text-sm text-gray-500 mb-2">Select one or more approvers if this circular needs a final check from higher authorities.</p>
                            <select multiple value={selectedApprovers} onChange={handleApproverChange} className="w-full p-2 border rounded-md h-32 bg-white">
                                {/* Make sure approvers list is valid before mapping */}
                                {(approvers || []).map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600" disabled={isLoading}>Cancel</button>
                    <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit Decision'}
                    </button>
                </div>
            </div>
        </div>
    );
}
function ManageUsersPage({ users = [], onAddUser, onDeleteUser, error, currentUser }) { // Added default for users
    // --- Log 1: Check props received ---
    console.log("ManageUsersPage: Component rendered. Received props:", { users, currentUser, error });

    // --- State Definition ---
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Circular Creator', department: '' });

    // --- Filter users for Super Admin view ---
    const adminUsers = useMemo(() => {
        if (currentUser?.role !== 'Super Admin' || !users) return [];
        return users.filter(user => user.role === 'Admin');
    }, [users, currentUser]);

    const managedUsersBySA = useMemo(() => {
        if (currentUser?.role !== 'Super Admin' || !users) return [];
        // Filter for non-Admins who are managed by the current SA or have no manager (legacy)
        return users.filter(user => user.role !== 'Admin' && (user.managedBy?._id === currentUser.id || !user.managedBy));
    }, [users, currentUser]);


    // --- Log 2: Check users array ---
    console.log(`ManageUsersPage: About to render. Role: ${currentUser?.role}. Total users received: ${users?.length}. Admins: ${adminUsers.length}. SA Managed: ${managedUsersBySA.length}`);

    // --- Event Handlers ---
    const handleChange = (e) => setNewUser({ ...newUser, [e.target.name]: e.target.value });
    const handleSubmit = (e) => {
        e.preventDefault();
        onAddUser(newUser);
        // Reset role based on who is logged in
        const defaultRole = currentUser?.role === 'Super Admin' ? 'Admin' : 'Circular Creator';
        setNewUser({ name: '', email: '', password: '', role: defaultRole, department: '' });
    };

    // Helper component for rendering the user table (to avoid repetition)
    const UserTable = ({ userList, title }) => (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{title} ({userList ? userList.length : 0})</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            {/* Only show Manager column if SA is viewing managed users */}
                            {currentUser?.role === 'Super Admin' && title.includes("Managed") && (
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                            )}
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {userList && userList.length > 0 ? userList.map(user => (
                            <tr key={user._id} className="hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                                <td className="py-3 px-4 text-gray-500">{user.email}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                         ${user.role === 'Super Admin' ? 'bg-red-100 text-red-800' : ''}
                                         ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : ''}
                                         ${user.role === 'Circular Creator' ? 'bg-blue-100 text-blue-800' : ''}
                                         ${user.role === 'Circular Approver' ? 'bg-yellow-100 text-yellow-800' : ''}
                                         ${user.role === 'Circular Viewer' ? 'bg-green-100 text-green-800' : ''}
                                     `}>{user.role}</span>
                                </td>
                                {/* Only show Manager column if SA is viewing managed users */}
                                {currentUser?.role === 'Super Admin' && title.includes("Managed") && (
                                    <td className="py-3 px-4 text-gray-500 text-sm">{user.managedBy?.name || 'Super Admin (Direct)'}</td>
                                )}
                                <td className="py-3 px-4">
                                    {currentUser?.id !== user._id && ( // Prevent deleting self
                                        <button onClick={() => onDeleteUser(user._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={currentUser?.role === 'Super Admin' && title.includes("Managed") ? 5 : 4} className="text-center py-4 text-gray-500">No users found in this category.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- Render Logic ---
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column (Always Visible) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Add New User</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
                    <div>
                        <label className="block font-bold text-gray-700">Full Name</label>
                        <input type="text" name="name" value={newUser.name} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Email</label>
                        <input type="email" name="email" value={newUser.email} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Password</label>
                        <input type="password" name="password" value={newUser.password} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Role</label>
                        <select name="role" value={newUser.role} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full bg-white">
                            {currentUser?.role === 'Super Admin' && <option value="Admin">Admin</option>}
                            {/* Allow SA/Admin to create CC/CV */}
                            {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && <option value="Circular Creator">Circular Creator</option>}
                            {currentUser?.role === 'Super Admin' && <option value="Circular Approver">Circular Approver</option>}
                            {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && <option value="Circular Viewer">Circular Viewer</option>}
                            {/* SA creating another SA? Generally discouraged. */}
                            {/* {currentUser?.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>} */}
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Department (Optional)</label>
                        <input type="text" name="department" value={newUser.department} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add User</button>
                </form>
            </div>

            {/* List Column(s) */}
            <div className="lg:col-span-2 space-y-8">
                {/* --- Conditional Rendering for Tables --- */}
                {currentUser?.role === 'Super Admin' ? (
                    <>
                        {/* Table 1: Admins */}
                        <UserTable userList={adminUsers} title="Admin Users" />
                        {/* Table 2: SA's Directly Managed Users */}
                        <UserTable userList={managedUsersBySA} title="Directly Managed Users (CC/CA/CV)" />
                    </>
                ) : (
                    <>
                        {/* Table for Regular Admin */}
                        <UserTable userList={users} title="Managed Users" />
                    </>
                )}
            </div>
        </div>
    );
}// --- UPDATED ViewCircularPage ---
function ViewCircularPage({ circular, onBack, isPreview = false, availableSignatories = [] }) {
    if (!circular) { return <div className="text-center text-gray-500">Loading circular...</div>; }

    const handlePrint = () => { window.print(); };

    // UPDATED Helper Function: Correctly looks up signatory details for PREVIEW
    const getSignatoryDetails = (sig) => {
        // Case 1: Data comes fully populated from the backend (GET request)
        if (typeof sig.authority === 'object' && sig.authority !== null && sig.authority.name && sig.authority.position) {
            return { name: sig.authority.name, position: sig.authority.position };
        }
        // Case 2: Data comes directly from formData for PREVIEW (sig already has name/position added by useMemo)
        else if (isPreview && sig.name && sig.position && sig.name !== 'N/A') {
            return { name: sig.name, position: sig.position };
        }
        // Case 3: Data comes from formData for PREVIEW, but lookup failed in useMemo (or wasn't selected)
        else if (isPreview && typeof sig.authority === 'string' && sig.authority === '') {
            return { name: '[No Authority Selected]', position: '' };
        }
        else if (isPreview && typeof sig.authority === 'string') {
            // Attempt lookup again here just in case useMemo enrichment wasn't passed correctly
            const details = availableSignatories.find(a => a._id === sig.authority);
            return { name: details?.name || 'N/A - Lookup Failed', position: details?.position || 'N/A' };
        }
        // Fallback for other unexpected cases
        return { name: 'Error Loading Name', position: 'Error Loading Position' };
    };

    // Sort signatories by order for display
    const sortedSignatories = [...(circular.signatories || [])].sort((a, b) => a.order - b.order);

    return (
        <>
            <div className="bg-white py-8 pr-8 pl-16 rounded-lg shadow-lg max-w-4xl mx-auto print-area text-gray-800 printable-content">
                {/* --- NEW HEADER (Side-by-Side, Balanced Size, Center Aligned Text) --- */}
                <div className="flex justify-between items-center mb-8 border-b-2 pb-4 border-gray-300">

                    {/* 1. Logo on the left (Balanced h-24 size) */}
                    <div className="flex-shrink-0">
                        <img
                            src="/mbulogo.webp"
                            alt="Mohan Babu University Logo"
                            className="h-24"
                        />
                    </div>

                    {/* 2. Text block on the right (font-serif, text-center) */}
                    <div className="text-center flex-grow font-serif"> {/* <-- YOUR REQUEST: text-center */}

                        <h1 className="text-3xl font-bold" style={{ color: '#003366' }}>
                            MOHAN BABU UNIVERSITY
                        </h1>
                        <p className="text-base text-gray-700 mt-1">
                            Sree Sainath Nagar, Tirupati – 517 102, A.P.
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            (Established under Andhra Pradesh Private Universities
                        </p>
                        <p className="text-sm text-gray-600">
                            (Establishment & Regulation) Act 2016 (Act No.3 of 2016))
                        </p>
                    </div>
                </div>
                {/* --- Meta Info (Date & Number) --- */}
                <div className="flex justify-between items-start mb-6">
                    <span className="font-semibold text-sm">No: {circular.circularNumber || '[Number Not Set]'}</span>
                    <div className="text-right">
                        {/* Date is now alone on the right */}
                        <p className="font-semibold text-sm">Date: {circular.date ? new Date(circular.date).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '[Date Not Set]'}</p>
                    </div>
                </div>

                {/* --- Centered Title Block (NEW) --- */}
                <div className="my-8 text-center">
                    {/* 1. The Type (e.g., "CIRCULAR") */}
                    <h3 className="text-xl font-bold mt-1">
                        {(circular.type || 'DOCUMENT').toUpperCase()}
                    </h3>
                    {/* 2. The Subject */}
                    <h3 className="text-lg font-bold underline mt-2">
                        SUB: {circular.subject || '[Subject Not Set]'}
                    </h3>
                </div>
                {/* --- END NEW BLOCK --- */}

                {/* --- Body --- */}
                <p className="text-base leading-relaxed mb-8 whitespace-pre-wrap">{circular.body || '[Body Content Not Set]'}</p>

                {/* --- Optional Agenda Points --- */}
                {/* Add back if needed */}

                {/* --- Signatories Section --- */}
                <div className={`mt-16 grid gap-8 ${sortedSignatories.length > 1 ? 'grid-cols-' + Math.min(sortedSignatories.length, 3) : ''} ${sortedSignatories.length === 1 ? 'flex justify-end' : ''}`}>
                    {sortedSignatories.map((sig, index) => {
                        const details = getSignatoryDetails(sig);
                        // Don't render if authority is empty string in preview
                        if (isPreview && (!sig.authority || sig.authority === '')) return null;
                        return (
                            <div key={sig.authority?._id || sig.authority || index} className={`text-center mt-8 ${sortedSignatories.length > 1 ? '' : 'ml-auto'}`}> {/* Align right if only one */}
                                <div className="h-12"></div> {/* Placeholder for signature space */}
                                <p className="font-bold">{details.name}</p>
                                <p className="text-sm text-gray-600">{details.position}</p>
                            </div>
                        );
                    })}
                </div>


                {/* --- Optional Copy To --- */}
                {/* Add back if needed */}
            </div>

            {/* --- Action Buttons --- */}
            {!isPreview && (
                <div className="max-w-4xl mx-auto text-center mt-6 no-print">
                    <button onClick={onBack} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 mr-4">Back to Dashboard</button>
                    <button onClick={handlePrint} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Print Document</button>
                </div>
            )}
            {/* --- Print Styles --- */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-content, .printable-content * { visibility: visible; }
                    .printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 1cm; /* Adjust padding */}
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </>
    );
}
function ManageSignatoriesPage({ signatories, onAddSignatory, onDeleteSignatory, error }) {
    const [newSignatory, setNewSignatory] = useState({ name: '', position: '' });

    const handleChange = (e) => setNewSignatory({ ...newSignatory, [e.target.name]: e.target.value });
    const handleSubmit = (e) => {
        e.preventDefault();
        onAddSignatory(newSignatory);
        setNewSignatory({ name: '', position: '' }); // Reset form
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Add Signatory Authority</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
                    <div>
                        <label className="block font-bold text-gray-700">Name</label>
                        <input type="text" name="name" value={newSignatory.name} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Position / Designation</label>
                        <input type="text" name="position" value={newSignatory.position} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add Signatory</button>
                </form>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Existing Signatory Authorities ({signatories.length})</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {signatories.map(sig => (
                                <tr key={sig._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{sig.name}</td>
                                    <td className="py-3 px-4 text-gray-500">{sig.position}</td>
                                    <td className="py-3 px-4">
                                        <button onClick={() => onDeleteSignatory(sig._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {signatories.length === 0 && (
                                <tr><td colSpan="3" className="text-center py-4 text-gray-500">No signatories added yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- NEW COMPONENT: ApproverReviewModal ---
function ApproverReviewModal({ circular, onClose, onSubmit, isLoading }) {
    const [decision, setDecision] = useState('Approved'); // Default decision
    const [feedback, setFeedback] = useState('');

    const handleSubmit = () => {
        if ((decision === 'Rejected' || decision === 'Request Meeting') && !feedback.trim()) {
            alert('Feedback is required when rejecting or requesting a meeting.');
            return;
        }
        onSubmit(circular._id, { decision, feedback });
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg text-gray-800">
                <h2 className="text-2xl font-bold mb-4">Submit Your Review</h2>
                <div className="mb-4 p-4 border rounded-md bg-gray-50 text-sm">
                    <p><strong>Type:</strong> {circular.type}</p>
                    <p><strong>Subject:</strong> {circular.subject}</p>
                    <p><strong>Circular No:</strong> {circular.circularNumber}</p>
                    {/* Optionally add View button here? */}
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block font-bold mb-1">Your Decision</label>
                        <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option value="Approved">Approve</option>
                            <option value="Rejected">Reject</option>
                        </select>
                    </div>

                    {(decision === 'Rejected' || decision === 'Request Meeting') && (
                        <div>
                            <label className="block font-bold mb-1">Feedback / Reason <span className="text-red-500">*</span></label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows="4"
                                className="w-full p-2 border rounded-md"
                                placeholder={decision === 'Rejected' ? 'Please provide the reason for rejection...' : 'Please provide details or questions for the meeting...'}
                                required
                            ></textarea>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600" disabled={isLoading}>Cancel</button>
                    <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit Decision'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- NEW COMPONENT: AdminReviewModal ---
function AdminReviewModal({ circular, onClose, onSubmit, isLoading }) {
    const [decision, setDecision] = useState('Forward'); // Default decision
    const [rejectionReason, setRejectionReason] = useState('');

    const handleSubmit = () => {
        if (decision === 'Reject' && !rejectionReason.trim()) {
            alert('A reason is required when rejecting.');
            return;
        }
        onSubmit(circular._id, { decision, rejectionReason });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg text-gray-800">
                <h2 className="text-2xl font-bold mb-4">Admin Review</h2>
                <div className="mb-4 p-4 border rounded-md bg-gray-50 text-sm">
                    <p><strong>Type:</strong> {circular.type}</p>
                    <p><strong>Subject:</strong> {circular.subject}</p>
                    <p><strong>From (Creator):</strong> {circular.author?.name || 'N/A'}</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block font-bold mb-1">Your Decision</label>
                        <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option value="Forward">Forward to Super Admin</option>
                            <option value="Reject">Reject (Back to Creator)</option>
                        </select>
                    </div>

                    {decision === 'Reject' && (
                        <div>
                            <label className="block font-bold mb-1">Reason for Rejection <span className="text-red-500">*</span></label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows="4"
                                className="w-full p-2 border rounded-md"
                                placeholder={'Please provide the reason for rejection...'}
                                required
                            ></textarea>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600" disabled={isLoading}>Cancel</button>
                    <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit Decision'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- NEW COMPONENT: AllUsersOverviewPage (Super Admin Only) ---
function AllUsersOverviewPage({ allUsers = [], currentUser }) {
    console.log("AllUsersOverviewPage: Rendering. Received users:", allUsers);

    // Group users by their manager's ID (or 'unmanaged'/'admins')
    const groupedUsers = useMemo(() => {
        const groups = {
            admins: [], // Store Admin users separately
            directlyManagedBySA: [], // CC/CA/CV managed directly by SA
            // Add keys for each Admin's ID
        };

        if (!allUsers || allUsers.length === 0) return groups;

        allUsers.forEach(user => {
            if (user.role === 'Admin') {
                groups.admins.push(user);
                // Create an empty array for this Admin's managed users if it doesn't exist
                if (!groups[user._id]) {
                    groups[user._id] = [];
                }
            } else if (user.managedBy?._id) {
                const managerId = user.managedBy._id;
                // Check if the manager is an Admin we already tracked
                if (groups[managerId]) {
                    groups[managerId].push(user);
                } else if (managerId === currentUser.id) { // Check if managed directly by current SA
                    groups.directlyManagedBySA.push(user);
                } else {
                    // User managed by someone unexpected? Log or handle.
                    console.warn("User found with unexpected manager:", user);
                }
            } else if (user.role !== 'Super Admin' && user.role !== 'Admin') {
                // Non-admin roles with NO manager are assumed directly managed by SA (legacy or direct creation)
                groups.directlyManagedBySA.push(user);
            }
        });
        console.log("Grouped Users:", groups);
        return groups;
    }, [allUsers, currentUser]);

    const getRoleClass = (role) => {
        switch (role) {
            case 'Super Admin': return 'bg-red-100 text-red-800';
            case 'Admin': return 'bg-purple-100 text-purple-800';
            case 'Circular Creator': return 'bg-blue-100 text-blue-800';
            case 'Circular Approver': return 'bg-yellow-100 text-yellow-800';
            case 'Circular Viewer': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">All Users Overview</h2>

            {/* Section for Admin Users */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Admin Users ({groupedUsers.admins.length})</h3>
                {groupedUsers.admins.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {groupedUsers.admins.map(admin => (
                            <li key={admin._id} className="py-3">
                                <p className="font-medium text-gray-900">{admin.name} <span className="text-sm text-gray-500">({admin.email})</span></p>
                                <p className="text-sm text-gray-500">Created: {formatDate(admin.createdAt)}</p>
                                {/* Link to view their managed users? */}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No Admin users found.</p>
                )}
            </div>

            {/* Section for Users Managed Directly by Super Admin */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Users Directly Managed by You ({groupedUsers.directlyManagedBySA.length})</h3>
                {groupedUsers.directlyManagedBySA.length > 0 ? (
                    <UserListTable users={groupedUsers.directlyManagedBySA} getRoleClass={getRoleClass} formatDate={formatDate} />
                ) : (
                    <p className="text-gray-500">No users directly managed by you.</p>
                )}
            </div>


            {/* Sections for Users Managed by Each Admin */}
            {groupedUsers.admins.map(admin => (
                <div key={admin._id} className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Users Managed by {admin.name} ({groupedUsers[admin._id]?.length || 0})</h3>
                    {groupedUsers[admin._id] && groupedUsers[admin._id].length > 0 ? (
                        <UserListTable users={groupedUsers[admin._id]} getRoleClass={getRoleClass} formatDate={formatDate} />
                    ) : (
                        <p className="text-gray-500">No users managed by this Admin.</p>
                    )}
                </div>
            ))}

        </div>
    );
}

// Helper component for the user list table in overview
const UserListTable = ({ users, getRoleClass, formatDate }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{user.email}</td>
                        <td className="py-3 px-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                                {user.role}
                            </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{formatDate(user.createdAt)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
// --- NEW COMPONENT: AllCircularsOverviewPage (Super Admin Only) ---
function AllCircularsOverviewPage({ allCirculars = [], onView, availableSignatories }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const getStatusClass = (status) => { /* ... (copy from DashboardPage) ... */
        switch (status) {
            case 'Approved': case 'Published': return 'bg-green-100 text-green-800';
            case 'Pending Admin': case 'Pending Super Admin': case 'Pending Higher Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800'; // Draft
        }
    };

    const filteredCirculars = useMemo(() => {
        return (allCirculars || [])
            .filter(c => filterStatus === 'All' || c.status === filterStatus)
            .filter(c =>
                searchTerm === '' ||
                c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.circularNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.author?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.type?.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allCirculars, searchTerm, filterStatus]);

    const formatDate = (dateString) => { /* ... (copy from AllUsersOverviewPage) ... */
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">All Circulars Overview</h2>

            {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    placeholder="Search by Subject, No., Author, Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-2 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending Admin">Pending Admin</option>
                    <option value="Pending Super Admin">Pending Super Admin</option>
                    <option value="Pending Higher Approval">Pending Higher Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Published">Published</option>
                </select>
            </div>

            {/* Circulars Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Reviewer</th>
                            {/* Add more columns if needed e.g., Approvers */}
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredCirculars.length > 0 ? filteredCirculars.map(c => (
                            <tr key={c._id} className="hover:bg-gray-50">
                                <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                                <td className="py-3 px-3 text-sm text-gray-700">{c.type}</td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm font-mono text-gray-500">{c.circularNumber}</td>
                                <td className="py-3 px-3 font-medium text-gray-900">{c.subject}</td>
                                <td className="py-3 px-3 text-sm text-gray-600">{c.author?.name || 'N/A'}</td>
                                <td className="py-3 px-3">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(c.status)}`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td className="py-3 px-3 text-sm text-gray-600">
                                    {/* Show who it's pending with */}
                                    {(c.status === 'Pending Admin' || c.status === 'Pending Super Admin') && (c.submittedTo?.name || 'N/A')}
                                    {c.status === 'Pending Higher Approval' && `CA (${c.approvers?.length || 0})`}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm">
                                    <button onClick={() => onView(c)} className="text-blue-600 hover:text-blue-900">View Details</button>
                                    {/* Add other SA-specific actions if needed, e.g., force delete */}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="text-center py-10 text-gray-500">No circulars match your filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
// --- CORRECTED SidebarMenu Component ---
function SidebarMenu({ isOpen, onClose, setPage, currentUser }) {
    // --- ADDED SAFETY CHECK ---
    // If currentUser is null or undefined, don't render anything inside
    if (!currentUser) {
        // Optionally, you could return a minimal version or just null
        return null;
    }
    // --- END SAFETY CHECK ---


    const navItemBase = "flex items-center w-full py-3 px-4 rounded-lg text-base font-medium transition-colors duration-200";
    const linkClass = "text-gray-700 hover:bg-gray-200 hover:text-gray-900";

    // Function to handle link click and close sidebar
    const handleNavigate = (pageName) => {
        setPage(pageName);
        onClose(); // Close sidebar after navigation
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} // Corrected for left slide-in
                role="dialog"
                aria-modal="true"
                aria-labelledby="sidebar-title"
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 id="sidebar-title" className="text-lg font-semibold text-gray-800">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Close menu"
                    >
                        <IconClose />
                    </button>
                </div>

                {/* Navigation Links - Now safe because we checked currentUser above */}
                <nav className="p-4 space-y-2">
                    {/* Links visible to all logged-in users */}
                    <button onClick={() => handleNavigate('dashboard')} className={`${navItemBase} ${linkClass}`}><IconDashboard /> Dashboard</button>

                    {/* New Circular visible to SA, Admin, and CC */}
                    {(currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Circular Creator') && (
                        <button onClick={() => handleNavigate('create')} className={`${navItemBase} ${linkClass}`}><IconNewCircular /> New Circular</button>
                    )}

                    {/* Manage Users visible to SA and Admin */}
                    {(currentUser.role === 'Super Admin' || currentUser.role === 'Admin') && (
                        <button onClick={() => handleNavigate('manageUsers')} className={`${navItemBase} ${linkClass}`}><IconManageUsers /> Manage Users</button>
                    )}

                    {/* Signatories, All Users, All Circulars visible only to SA */}
                    {currentUser.role === 'Super Admin' && (
                        <>
                            <button onClick={() => handleNavigate('manageSignatories')} className={`${navItemBase} ${linkClass}`}><IconSignatories /> Signatories</button>
                            <button onClick={() => handleNavigate('allUsersOverview')} className={`${navItemBase} ${linkClass}`}><IconManageUsers /> All Users</button>
                            <button onClick={() => handleNavigate('allCircularsOverview')} className={`${navItemBase} ${linkClass}`}><IconDashboard /> All Circulars</button>
                        </>
                    )}
                </nav>
            </div>
        </>
    );
}
// --- END SidebarMenu ---
export default App;

