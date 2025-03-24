import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, Link, useHistory } from 'react-router-dom';
import './App.css';
import { AuthProvider, PrivateRoute, useAuth } from './AuthContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ViewData = lazy(() => import('./components/ViewData'));
const Allocation = lazy(() => import('./pages/Allocation'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));

const Header = () => {
  const { logout } = useAuth();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/admin-login');
  };

  return (
    <header className="App-header">
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/students">Students</Link></li>
          <li><Link to="/staff">Staff</Link></li>
          <li><Link to="/allocation">Allocate/Supervisor</Link></li>
          <li><Link to="/view-data">View Data</Link></li>
          <li><button onClick={handleLogout} className="nav-button">Logout</button></li>
        </ul>
      </nav>
    </header>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {isAuthenticated && <Header />}
      <main>
        <Suspense fallback={<div>Loading...</div>}>
          <Switch>
            <Route path="/" exact component={HomePage} />
            <Route path="/admin-login" component={AdminLogin} />
            <PrivateRoute path="/students" component={StudentsPage} />
            <PrivateRoute path="/staff" component={StaffPage} />
            <PrivateRoute path="/view-data" component={ViewData} />
            <PrivateRoute path="/allocation" component={Allocation} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;