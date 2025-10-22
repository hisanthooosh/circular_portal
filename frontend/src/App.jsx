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

    // State for modals and interaction
    const [circularToReview, setCircularToReview] = useState(null);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [circularToView, setCircularToView] = useState(null);

    const api = useMemo(() => ({
        fetchWithAuth: async (url, options = {}) => {
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (token) headers['x-auth-token'] = token;
            const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        },
        login: (email, password) => fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err))),
        getCirculars: () => api.fetchWithAuth('/circulars'),
        createCircular: (data) => api.fetchWithAuth('/circulars', { method: 'POST', body: JSON.stringify(data) }),
        submitCircular: (id) => api.fetchWithAuth(`/circulars/submit/${id}`, { method: 'PATCH' }),
        reviewCircular: (id, data) => api.fetchWithAuth(`/circulars/review/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        getUsers: () => api.fetchWithAuth('/users'),
        createUser: (data) => api.fetchWithAuth('/users', { method: 'POST', body: JSON.stringify(data) }),
        deleteUser: (id) => api.fetchWithAuth(`/users/${id}`, { method: 'DELETE' }),
        // New Signatory API functions
        getSignatories: () => api.fetchWithAuth('/signatories'),
        createSignatory: (data) => api.fetchWithAuth('/signatories', { method: 'POST', body: JSON.stringify(data) }),
        deleteSignatory: (id) => api.fetchWithAuth(`/signatories/${id}`, { method: 'DELETE' }),
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

    const loadDashboardData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const circs = await api.getCirculars();
            setCirculars(circs);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('401')) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    const loadUsersAndApprovers = async () => {
        if (!token || currentUser?.role !== 'Super Admin') return;
        setIsLoading(true);
        setError('');
        try {
            const userData = await api.getUsers();
            setUsers(userData);
            setApprovers(userData.filter(u => u.role === 'Circular Approver'));
        } catch (err) {
            setError(err.message);
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

    useEffect(() => {
        if (page === 'dashboard') loadDashboardData();
        if (page === 'manageUsers') loadUsersAndApprovers();
        if (page === 'manageSignatories') loadSignatories(); // Load when on the new page
    }, [page, token]); // Ensure 'token' is in the dependency array

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

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
        setPage('login');
    };

    const handleCreateCircular = async (circularData, andSubmit = false) => {
        setIsLoading(true);
        try {
            const newCircular = await api.createCircular(circularData);
            if (andSubmit) {
                await api.submitCircular(newCircular._id);
            }
            // This is the fix: Simply navigate back to the dashboard.
            // The existing useEffect hook that watches 'page' will automatically
            // trigger the loadDashboardData() function when the page changes to 'dashboard'.
            setPage('dashboard');
        } catch (err) {
            setError(err.message);
            setIsLoading(false); // Make sure loading stops on error
        }
        // We don't need setIsLoading(false) here because loadDashboardData sets it
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

    const renderPage = () => {
        if (isLoading && page !== 'login') return <div className="text-center p-10 text-gray-500">Loading...</div>;

        switch (page) {
            case 'dashboard': return <DashboardPage circulars={circulars} currentUser={currentUser} onSubmitForApproval={handleSubmitCircular} onReview={(c) => { setCircularToReview(c); setReviewModalOpen(true); }} onView={(c) => { setCircularToView(c); setPage('view'); }} />;
            case 'create': return <CreateCircularPage onSubmit={handleCreateCircular} onCancel={() => setPage('dashboard')} availableSignatories={signatories} error={error} />;           case 'manageUsers': return <ManageUsersPage users={users} onAddUser={handleCreateUser} onDeleteUser={handleDeleteUser} error={error} />;
            case 'view': return <ViewCircularPage circular={circularToView} onBack={() => setPage('dashboard')} availableSignatories={signatories} />;
            case 'manageSignatories': return <ManageSignatoriesPage signatories={signatories} onAddSignatory={handleCreateSignatory} onDeleteSignatory={handleDeleteSignatory} error={error} />; // New page
            case 'login': default: return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={error} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            {currentUser && <Header onLogout={handleLogout} setPage={setPage} currentPage={page} currentUser={currentUser} />}
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderPage()}
            </main>
            {isReviewModalOpen && (
                <ReviewModal
                    circular={circularToReview}
                    approvers={approvers}
                    onClose={() => setReviewModalOpen(false)}
                    onSubmit={handleReviewCircular}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}

// --- Components (Styled with the light theme) ---

function Header({ onLogout, setPage, currentPage, currentUser }) {
    const navItemBase = "flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200";
    const activeClass = "bg-blue-600 text-white shadow";
    const inactiveClass = "text-gray-600 hover:bg-gray-200";

    return (
        <header className="bg-white shadow-md mb-8">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setPage('dashboard')}>
                    <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Circular Portal</h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <ul className="hidden sm:flex items-center space-x-2">
                        <li><button onClick={() => setPage('dashboard')} className={`${navItemBase} ${currentPage === 'dashboard' ? activeClass : inactiveClass}`}><IconDashboard /> Dashboard</button></li>
                        {(currentUser.role === 'Super Admin' || currentUser.role === 'Circular Creator') && (
                            <li><button onClick={() => setPage('create')} className={`${navItemBase} ${currentPage === 'create' ? activeClass : inactiveClass}`}><IconNewCircular /> New Circular</button></li>
                        )}
                       {currentUser.role === 'Super Admin' && (
                           <>
                             <li><button onClick={() => setPage('manageUsers')} className={`${navItemBase} ${currentPage === 'manageUsers' ? activeClass : inactiveClass}`}><IconManageUsers/> Manage Users</button></li>
                             {/* New Navigation Link correctly placed */}
                             <li><button onClick={() => setPage('manageSignatories')} className={`${navItemBase} ${currentPage === 'manageSignatories' ? activeClass : inactiveClass}`}><IconSignatories/> Signatories</button></li>
                           </>
                        )}
                    </ul>
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

function DashboardPage({ circulars, currentUser, onSubmitForApproval, onReview, onView }) {
    const getStatusClass = (status) => {
        switch (status) {
            case 'Approved': case 'Published': return 'bg-green-100 text-green-800';
            case 'Pending Super Admin': case 'Pending Higher Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {circulars.length > 0 ? circulars.map(c => (
                            <tr key={c._id} className="hover:bg-gray-50">
                                <td className="py-3 px-4 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="py-3 px-4 font-medium text-gray-900">{c.title}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(c.status)}`}>
                                        {c.status}
                                    </span>
                                    {c.status === 'Rejected' && c.rejectionReason && (
                                        <p className="text-xs text-red-600 mt-1">Reason: {c.rejectionReason}</p>
                                    )}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button onClick={() => onView(c)} className="text-gray-500 hover:text-gray-800">View</button>

                                    {currentUser.role === 'Circular Creator' && c.status === 'Draft' && (
                                        <button onClick={() => onSubmitForApproval(c._id)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Submit for Approval</button>
                                    )}
                                    {currentUser.role === 'Circular Creator' && c.status === 'Rejected' && (
                                        <button className="text-blue-600 hover:text-blue-900">Edit</button>
                                    )}
                                    {currentUser.role === 'Super Admin' && c.status === 'Pending Super Admin' && (
                                        <button onClick={() => onReview(c)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs">Review</button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="text-center py-10 text-gray-500">No circulars found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// function CreateCircularPage({ onSubmit, onCancel }) {
//     const [isPreview, setIsPreview] = useState(false);
//     const [formData, setFormData] = useState({
//         circularNumber: 'MBU/NOTICE/2025-26/', title: '', date: new Date().toISOString().split('T')[0],
//         body: '', agendaPoints: [''], issuedBy: '', copyTo: ['']
//     });

//     const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
//     const handleListChange = (e, index, field) => { /* ... */ };
//     const addListItem = (field) => { /* ... */ };
//     const removeListItem = (index, field) => { /* ... */ };

//     const handleSaveDraft = () => {
//         onSubmit(formData, false); // false means do not submit
//     };

//     const handleSaveAndSubmit = () => {
//         onSubmit(formData, true); // true means save and then submit
//     };

//     if (isPreview) {
//         return (
//             <div>
//                 <ViewCircularPage circular={formData} onBack={() => setIsPreview(false)} isPreview={true} />
//                 <div className="max-w-4xl mx-auto text-center mt-6">
//                     <button onClick={() => setIsPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 mr-4">Back to Edit</button>
//                     <button onClick={handleSaveAndSubmit} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Save & Submit for Approval</button>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
//             <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Circular (Draft)</h2>
//             <form className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div className="md:col-span-1">
//                         <label className="block font-bold text-gray-700">Date</label>
//                         <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
//                     </div>
//                     <div className="md:col-span-2">
//                         <label className="block font-bold text-gray-700">Circular Number</label>
//                         <input type="text" name="circularNumber" value={formData.circularNumber} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
//                     </div>
//                 </div>
//                 <div>
//                     <label className="block font-bold text-gray-700">Title</label>
//                     <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
//                 </div>
//                 <div>
//                     <label className="block font-bold text-gray-700">Body</label>
//                     <textarea name="body" value={formData.body} onChange={handleChange} rows="5" className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required></textarea>
//                 </div>
//                 <div>
//                     <label className="block font-bold text-gray-700">Issued By</label>
//                     <input type="text" name="issuedBy" value={formData.issuedBy} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
//                 </div>
//                 {/* Simplified form for brevity. Full form fields can be added here. */}
//                 <div className="flex justify-end space-x-4">
//                     <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">Cancel</button>
//                     <button type="button" onClick={() => setIsPreview(true)} className="bg-yellow-500 text-white px-6 py-2 rounded-md hover:bg-yellow-600">Preview</button>
//                     <button type="button" onClick={handleSaveDraft} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Save as Draft</button>
//                 </div>
//             </form>
//         </div>
//     );
// }

// --- UPDATED CreateCircularPage ---
function CreateCircularPage({ onSubmit, onCancel, availableSignatories, error }) {
    const [isPreview, setIsPreview] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Circular', // Default type
        subject: '',
        circularNumber: '', // Let user enter full number? Or generate part?
        date: new Date().toISOString().split('T')[0],
        body: '',
        signatories: [{ authority: '', order: 1 }], // Start with one signatory slot
        agendaPoints: [], // Keep optional?
        copyTo: [], // Keep optional?
    });

    // Handle normal input changes
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Handle changes within the signatories array
    const handleSignatoryChange = (index, field, value) => {
        const updatedSignatories = [...formData.signatories];
        updatedSignatories[index] = { ...updatedSignatories[index], [field]: value };
        setFormData({ ...formData, signatories: updatedSignatories });
    };

    // Add a new signatory slot
    const addSignatorySlot = () => {
        setFormData({
            ...formData,
            signatories: [...formData.signatories, { authority: '', order: formData.signatories.length + 1 }]
        });
    };

    // Remove the last signatory slot (only if more than one)
    const removeSignatorySlot = () => {
        if (formData.signatories.length > 1) {
            const updatedSignatories = [...formData.signatories];
            updatedSignatories.pop(); // Remove the last item
            setFormData({ ...formData, signatories: updatedSignatories });
        }
    };

    // --- List Item Handlers (Placeholder - Add if needed for Agenda/Copy To) ---
    // const handleListChange = (e, index, field) => { /* ... */ };
    // const addListItem = (field) => { /* ... */ };
    // const removeListItem = (index, field) => { /* ... */ };

    const handleSaveDraft = () => {
        onSubmit(formData, false); // false = save as draft
    };

    const handleSaveAndSubmit = () => {
        // Simple validation before submitting
        if (!formData.signatories.every(s => s.authority && s.order > 0)) {
            alert("Please select a valid authority for each signatory slot and ensure order is positive.");
            return;
        }
        onSubmit(formData, true); // true = save and submit
    };

    // Prepare data for preview, fetching names/positions
    const previewData = useMemo(() => {
        if (!isPreview) return null;
        return {
            ...formData,
            signatories: formData.signatories
                .map(sig => {
                    const authorityDetails = availableSignatories.find(a => a._id === sig.authority);
                    return {
                        ...sig,
                        // Include name and position for display in preview
                        name: authorityDetails?.name || 'N/A',
                        position: authorityDetails?.position || 'N/A',
                    };
                })
                .sort((a, b) => a.order - b.order) // Ensure sorted for preview
        };
    }, [isPreview, formData, availableSignatories]);

    if (isPreview && previewData) {
        return (
            <div>
                {/* Pass the enriched previewData to ViewCircularPage */}
                <ViewCircularPage circular={previewData} onBack={() => setIsPreview(false)} isPreview={true} />
                <div className="max-w-4xl mx-auto text-center mt-6 no-print">
                    <button onClick={() => setIsPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 mr-4">Back to Edit</button>
                    <button onClick={handleSaveAndSubmit} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Save & Submit for Approval</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Document (Draft)</h2>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
            <form className="space-y-6">
                 {/* Row 1: Type, Date, Number */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block font-bold text-gray-700">Type</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full bg-white focus:ring-blue-500 focus:border-blue-500" required>
                            <option>Circular</option>
                            <option>Order</option>
                            <option>Memo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Date</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Document Number</label>
                        <input type="text" name="circularNumber" value={formData.circularNumber} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., MBU/REG/2025/01" required />
                    </div>
                </div>
                {/* Row 2: Subject */}
                <div>
                    <label className="block font-bold text-gray-700">Subject / Description</label>
                    <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                {/* Row 3: Body */}
                <div>
                    <label className="block font-bold text-gray-700">Body</label>
                    <textarea name="body" value={formData.body} onChange={handleChange} rows="8" className="mt-1 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500" required></textarea>
                </div>

                {/* --- Signatories Section --- */}
                <div>
                    <label className="block font-bold text-gray-700 mb-2">Signatory Authorities</label>
                    <div className="space-y-3">
                        {formData.signatories.map((sig, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 border rounded-md bg-gray-50">
                                <span className="font-semibold text-gray-500">#{index + 1}</span>
                                <select
                                    value={sig.authority}
                                    onChange={(e) => handleSignatoryChange(index, 'authority', e.target.value)}
                                    className="flex-grow p-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">-- Select Authority --</option>
                                    {availableSignatories.map(auth => (
                                        <option key={auth._id} value={auth._id}>
                                            {auth.name} ({auth.position})
                                        </option>
                                    ))}
                                </select>
                                <div>
                                    <label className="text-sm text-gray-600 mr-1">Order:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={sig.order}
                                        onChange={(e) => handleSignatoryChange(index, 'order', parseInt(e.target.value) || 1)}
                                        className="w-16 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex space-x-2">
                        <button
                            type="button"
                            onClick={addSignatorySlot}
                            className="flex items-center bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
                        >
                           <IconAdd /> Add Signatory
                        </button>
                        {formData.signatories.length > 1 && (
                            <button
                                type="button"
                                onClick={removeSignatorySlot}
                                className="flex items-center bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm"
                            >
                               <IconRemove/> Remove Last
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Optional Fields (Agenda Points, Copy To) --- */}
                {/* Add back if needed */}

                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">Cancel</button>
                    <button type="button" onClick={() => setIsPreview(true)} className="bg-yellow-500 text-white px-6 py-2 rounded-md hover:bg-yellow-600">Preview</button>
                    <button type="button" onClick={handleSaveDraft} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Save as Draft</button>
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
        const decisionData = { decision };
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
                    <p><strong>Title:</strong> {circular.title}</p>
                    <p><strong>Circular No:</strong> {circular.circularNumber}</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block font-bold mb-2">Decision</label>
                        <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option>Approve</option>
                            <option>Reject</option>
                        </select>
                    </div>
                    {decision === 'Reject' && (
                        <div>
                            <label className="block font-bold mb-2">Reason for Rejection</label>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows="3" className="w-full p-2 border rounded-md"></textarea>
                        </div>
                    )}
                    {decision === 'Approve' && (
                        <div>
                            <label className="block font-bold mb-2">Send for Higher Approval (Optional)</label>
                            <p className="text-sm text-gray-500 mb-2">Select one or more approvers if this circular needs a final check from higher authorities.</p>
                            <select multiple value={selectedApprovers} onChange={handleApproverChange} className="w-full p-2 border rounded-md h-32 bg-white">
                                {approvers.map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
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

function ManageUsersPage({ users, onAddUser, onDeleteUser, error }) {
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Circular Creator', department: '' });

    const handleChange = (e) => setNewUser({ ...newUser, [e.target.name]: e.target.value });
    const handleSubmit = (e) => {
        e.preventDefault();
        onAddUser(newUser);
        setNewUser({ name: '', email: '', password: '', role: 'Circular Creator', department: '' });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                            <option>Circular Creator</option>
                            <option>Circular Approver</option>
                            <option>Circular Viewer</option>
                            <option>Super Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700">Department (Optional)</label>
                        <input type="text" name="department" value={newUser.department} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add User</button>
                </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Existing Users ({users.length})</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                                    <td className="py-3 px-4 text-gray-500">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role === 'Super Admin' ? 'bg-red-100 text-red-800' : ''}
                                            ${user.role === 'Circular Creator' ? 'bg-blue-100 text-blue-800' : ''}
                                            ${user.role === 'Circular Approver' ? 'bg-yellow-100 text-yellow-800' : ''}
                                            ${user.role === 'Circular Viewer' ? 'bg-green-100 text-green-800' : ''}
                                        `}>{user.role}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button onClick={() => onDeleteUser(user._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// function ViewCircularPage({ circular, onBack, isPreview = false }) {
//     if (!circular) {
//         return <div className="text-center text-gray-500">Loading circular...</div>;
//     }

//     const handlePrint = () => {
//         window.print();
//     };

//     return (
//         <>
//             <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto print-area text-gray-800">
//                 <div className="text-center mb-8 border-b-2 pb-4 border-gray-300">
//                     <h1 className="text-3xl font-bold text-red-700">MOHAN BABU UNIVERSITY</h1>
//                     <p className="text-gray-600">Sree Sainath Nagar, Tirupati - 517 102, A.P.</p>
//                 </div>
//                 <div className="flex justify-between items-center mb-6">
//                     <span className="font-semibold">No: {circular.circularNumber}</span>
//                     <span className="font-semibold">Date: {new Date(circular.date).toLocaleDateString('en-GB')}</span>
//                 </div>
//                 <div className="text-center my-8">
//                     <h2 className="text-xl font-bold underline">{(circular.title || 'YOUR TITLE HERE').toUpperCase()}</h2>
//                     <h3 className="text-lg font-semibold mt-1">CIRCULAR</h3>
//                 </div>
//                 <p className="text-base leading-relaxed mb-8 whitespace-pre-wrap">{circular.body || 'Your main circular body text will appear here.'}</p>

//                 {circular.agendaPoints && circular.agendaPoints.length > 0 && circular.agendaPoints.some(p => p) && (
//                     <div className="mb-8">
//                         <h3 className="text-lg font-bold underline mb-4 text-center">Agenda Points</h3>
//                         <ul className="list-disc list-inside space-y-2 ml-4">
//                             {circular.agendaPoints.map((point, i) => point && <li key={i}>{point}</li>)}
//                         </ul>
//                     </div>
//                 )}
//                 <div className="mt-16 flex justify-end">
//                     <div className="text-center">
//                         <p className="font-bold">{circular.issuedBy || 'Issued By Name'}</p>
//                         <p>MBU, Tirupati</p>
//                     </div>
//                 </div>
//                 {circular.copyTo && circular.copyTo.length > 0 && circular.copyTo.some(c => c) && (
//                     <div className="mt-12 text-sm">
//                         <h4 className="font-bold">Copy to:</h4>
//                         <ul className="list-decimal list-inside ml-4">
//                             {circular.copyTo.map((item, i) => item && <li key={i}>{item}</li>)}
//                         </ul>
//                     </div>
//                 )}
//             </div>

//             {!isPreview && (
//                 <div className="max-w-4xl mx-auto text-center mt-6 no-print">
//                     <button onClick={onBack} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 mr-4">Back to Dashboard</button>
//                     <button onClick={handlePrint} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Print Circular</button>
//                 </div>
//             )}
//             <style>{`
//                 @media print {
//                     body * { visibility: hidden; }
//                     .print-area, .print-area * { visibility: visible; }
//                     .print-area { position: absolute; left: 0; top: 0; width: 100%; }
//                     .no-print { display: none; }
//                 }
//             `}</style>
//         </>
//     );
// }

// --- UPDATED ViewCircularPage ---
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
             return { name: '[No Authority Selected]', position: ''};
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
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto print-area text-gray-800 printable-content">
                {/* --- Header --- */}
                <div className="text-center mb-8 border-b-2 pb-4 border-gray-300">
                    <h1 className="text-3xl font-bold text-red-700">MOHAN BABU UNIVERSITY</h1>
                    <p className="text-gray-600">Sree Sainath Nagar, Tirupati - 517 102, A.P.</p>
                </div>

                {/* --- Meta Info --- */}
                <div className="flex justify-between items-start mb-6">
                    <span className="font-semibold text-sm">No: {circular.circularNumber || '[Number Not Set]'}</span>
                    <div className="text-right">
                        <p className="font-semibold text-sm">{circular.type ? circular.type.toUpperCase() : 'DOCUMENT'}</p>
                        <p className="font-semibold text-sm">Date: {circular.date ? new Date(circular.date).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '[Date Not Set]'}</p>
                    </div>
                </div>

                {/* --- Subject --- */}
                 <div className="my-8 text-center">
                    <h3 className="text-lg font-bold underline">SUB: {circular.subject || '[Subject Not Set]'}</h3>
                 </div>

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

export default App;

