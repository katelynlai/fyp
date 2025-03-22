import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ViewData = lazy(() => import('./components/ViewData'));
const Allocation = lazy(() => import('./pages/Allocation'));

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/students">Students</Link></li>
              <li><Link to="/staff">Staff</Link></li>
              <li><Link to="/admin">Admin Dashboard</Link></li>
              <li><Link to="/view-data">View Data</Link></li>
            </ul>
          </nav>
        </header>
        <main>
          <Suspense fallback={<div>Loading...</div>}>
            <Switch>
              <Route path="/" exact component={HomePage} />
              <Route path="/students" component={StudentsPage} />
              <Route path="/staff" component={StaffPage} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/view-data" component={ViewData} />
              <Route path="/allocation" component={Allocation} />
            </Switch>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;