const { useState, useEffect, useCallback } = React;

// Initial data setup
const initialData = {
  barbers: [
    {"id": 1, "name": "Mike Johnson", "is_available": true},
    {"id": 2, "name": "Sarah Wilson", "is_available": true},
    {"id": 3, "name": "Carlos Rodriguez", "is_available": true}
  ],
  services: [
    {"id": 1, "name": "Haircut", "duration_minutes": 30},
    {"id": 2, "name": "Shave", "duration_minutes": 20},
    {"id": 3, "name": "Haircut + Shave", "duration_minutes": 45},
    {"id": 4, "name": "Beard Trim", "duration_minutes": 15},
    {"id": 5, "name": "Hair Wash", "duration_minutes": 10}
  ],
  admin_credentials: {
    "username": "admin",
    "password": "barber123"
  },
  sample_queue: [
    {"id": 1, "customer_name": "John D.", "phone": "555-0101", "barber_id": 1, "service_id": 1, "position": 1, "status": "waiting", "estimated_wait": 15},
    {"id": 2, "customer_name": "Emily R.", "phone": "555-0102", "barber_id": 2, "service_id": 3, "position": 2, "status": "waiting", "estimated_wait": 30},
    {"id": 3, "customer_name": "David M.", "phone": "555-0103", "barber_id": 1, "service_id": 2, "position": 3, "status": "waiting", "estimated_wait": 45}
  ]
};

// Initialize localStorage with sample data if not exists
function initializeData() {
  if (!localStorage.getItem('barbers')) {
    localStorage.setItem('barbers', JSON.stringify(initialData.barbers));
  }
  if (!localStorage.getItem('services')) {
    localStorage.setItem('services', JSON.stringify(initialData.services));
  }
  if (!localStorage.getItem('queue')) {
    localStorage.setItem('queue', JSON.stringify(initialData.sample_queue));
  }
  if (!localStorage.getItem('nextQueueId')) {
    localStorage.setItem('nextQueueId', '4');
  }
}

// Utility functions for data management
const DataManager = {
  getBarbers: () => {
    try {
      return JSON.parse(localStorage.getItem('barbers') || '[]');
    } catch {
      return initialData.barbers;
    }
  },
  
  getServices: () => {
    try {
      return JSON.parse(localStorage.getItem('services') || '[]');
    } catch {
      return initialData.services;
    }
  },
  
  getQueue: () => {
    try {
      return JSON.parse(localStorage.getItem('queue') || '[]');
    } catch {
      return initialData.sample_queue;
    }
  },
  
  addToQueue: (customerData) => {
    const queue = DataManager.getQueue();
    const nextId = parseInt(localStorage.getItem('nextQueueId') || '1');
    const position = queue.filter(c => c.status === 'waiting').length + 1;
    const service = DataManager.getServices().find(s => s.id === customerData.service_id);
    const avgWaitPerPosition = 15;
    const estimated_wait = (position - 1) * avgWaitPerPosition + (service?.duration_minutes || 30);
    
    const newCustomer = {
      id: nextId,
      ...customerData,
      position,
      status: 'waiting',
      estimated_wait,
      created_at: new Date().toISOString()
    };
    
    queue.push(newCustomer);
    localStorage.setItem('queue', JSON.stringify(queue));
    localStorage.setItem('nextQueueId', (nextId + 1).toString());
    
    DataManager.updateQueuePositions();
    return newCustomer;
  },
  
  removeFromQueue: (customerId) => {
    let queue = DataManager.getQueue();
    queue = queue.filter(customer => customer.id !== customerId);
    localStorage.setItem('queue', JSON.stringify(queue));
    DataManager.updateQueuePositions();
  },
  
  markAsServing: (customerId) => {
    const queue = DataManager.getQueue();
    const customer = queue.find(c => c.id === customerId);
    if (customer) {
      customer.status = 'serving';
      localStorage.setItem('queue', JSON.stringify(queue));
    }
  },
  
  updateQueuePositions: () => {
    const queue = DataManager.getQueue();
    const waitingCustomers = queue.filter(c => c.status === 'waiting');
    
    waitingCustomers.forEach((customer, index) => {
      customer.position = index + 1;
      const avgWaitPerPosition = 15;
      const service = DataManager.getServices().find(s => s.id === customer.service_id);
      customer.estimated_wait = index * avgWaitPerPosition + (service?.duration_minutes || 30);
    });
    
    localStorage.setItem('queue', JSON.stringify(queue));
  },
  
  getQueueStats: () => {
    const queue = DataManager.getQueue();
    const waiting = queue.filter(c => c.status === 'waiting').length;
    const serving = queue.filter(c => c.status === 'serving').length;
    const avgWait = queue.length > 0 ? 
      queue.reduce((sum, c) => sum + c.estimated_wait, 0) / queue.length : 0;
    
    return {
      waiting,
      serving,
      total: queue.length,
      avgWait: Math.round(avgWait)
    };
  }
};

// Header Component
function Header({ currentPage, onNavigate, isAdmin, onLogout }) {
  const handleNavClick = (e, page) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate(page);
  };

  return (
    <header className="header">
      <div className="header__content">
        <a 
          href="#" 
          className="logo"
          onClick={(e) => handleNavClick(e, 'home')}
        >
          BarberQueue
        </a>
        <nav className="nav">
          {!isAdmin ? (
            <>
              <a 
                href="#" 
                className={`nav__link ${currentPage === 'home' ? 'nav__link--active' : ''}`}
                onClick={(e) => handleNavClick(e, 'home')}
              >
                Home
              </a>
              <a 
                href="#" 
                className={`nav__link ${currentPage === 'queue' ? 'nav__link--active' : ''}`}
                onClick={(e) => handleNavClick(e, 'queue')}
              >
                Live Queue
              </a>
              <a 
                href="#" 
                className={`nav__link ${currentPage === 'admin' ? 'nav__link--active' : ''}`}
                onClick={(e) => handleNavClick(e, 'admin')}
              >
                Admin
              </a>
            </>
          ) : (
            <>
              <a 
                href="#" 
                className={`nav__link ${currentPage === 'dashboard' ? 'nav__link--active' : ''}`}
                onClick={(e) => handleNavClick(e, 'dashboard')}
              >
                Dashboard
              </a>
              <button className="btn btn--outline btn--sm" onClick={onLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// Home Page Component
function HomePage({ onNavigate }) {
  return (
    <div className="page">
      <div className="hero">
        <h1 className="hero__title">Welcome to BarberQueue</h1>
        <p className="hero__subtitle">
          Skip the wait, join the digital queue. Get real-time updates on your position and estimated wait time.
        </p>
        <button 
          className="btn btn--primary btn--lg"
          onClick={() => onNavigate('join')}
        >
          Join Queue Now
        </button>
      </div>
      
      <div className="features">
        <div className="feature-card">
          <div className="feature-card__icon">⏰</div>
          <h3 className="feature-card__title">Real-time Updates</h3>
          <p className="feature-card__description">
            Get live updates on your queue position and estimated wait time
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-card__icon">📱</div>
          <h3 className="feature-card__title">Mobile Friendly</h3>
          <p className="feature-card__description">
            Join and track your queue position from anywhere on any device
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-card__icon">✂️</div>
          <h3 className="feature-card__title">Choose Your Barber</h3>
          <p className="feature-card__description">
            Select your preferred barber and service for a personalized experience
          </p>
        </div>
      </div>
    </div>
  );
}

// Queue Join Form Component
function QueueJoinForm({ onNavigate }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    barber_id: '',
    service_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const barbers = DataManager.getBarbers().filter(b => b.is_available);
  const services = DataManager.getServices();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const customer = DataManager.addToQueue({
        ...formData,
        barber_id: parseInt(formData.barber_id),
        service_id: parseInt(formData.service_id)
      });
      
      localStorage.setItem('customerQueueId', customer.id.toString());
      setMessage('Successfully joined the queue!');
      
      setTimeout(() => {
        onNavigate('status');
      }, 1500);
      
    } catch (error) {
      setMessage('Error joining queue. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const isFormValid = formData.customer_name && formData.phone && formData.barber_id && formData.service_id;
  
  return (
    <div className="page">
      <form className="queue-form" onSubmit={handleSubmit}>
        <h2 className="queue-form__title">Join the Queue</h2>
        
        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert--error' : 'alert--success'}`}>
            {message}
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="customer_name"
            className="form-control"
            value={formData.customer_name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            name="phone"
            className="form-control"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="555-0123"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Preferred Barber</label>
            <select
              name="barber_id"
              className="form-control"
              value={formData.barber_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Barber</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Service</label>
            <select
              name="service_id"
              className="form-control"
              value={formData.service_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Service</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-12)', marginTop: 'var(--space-24)' }}>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => onNavigate('home')}
          >
            Back
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--full-width"
            disabled={!isFormValid || loading}
          >
            {loading ? 'Joining...' : 'Join Queue'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Queue Status Component  
function QueueStatus({ onNavigate }) {
  const [customer, setCustomer] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const customerQueueId = localStorage.getItem('customerQueueId');
  const barbers = DataManager.getBarbers();
  const services = DataManager.getServices();
  
  useEffect(() => {
    if (!customerQueueId) {
      onNavigate('join');
      return;
    }
    
    const updateStatus = () => {
      const queue = DataManager.getQueue();
      const foundCustomer = queue.find(c => c.id === parseInt(customerQueueId));
      setCustomer(foundCustomer);
      
      if (!foundCustomer) {
        localStorage.removeItem('customerQueueId');
        onNavigate('home');
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [customerQueueId, onNavigate]);
  
  const handleLeaveQueue = () => {
    DataManager.removeFromQueue(parseInt(customerQueueId));
    localStorage.removeItem('customerQueueId');
    setShowLeaveModal(false);
    onNavigate('home');
  };
  
  if (!customer) {
    return (
      <div className="page">
        <div className="loading">Loading your queue status...</div>
      </div>
    );
  }
  
  const barber = barbers.find(b => b.id === customer.barber_id);
  const service = services.find(s => s.id === customer.service_id);
  const isBeingServed = customer.status === 'serving';
  
  return (
    <div className="page">
      <div className="queue-status">
        <div className={`status-card ${isBeingServed ? 'status-card--serving' : ''}`}>
          {isBeingServed ? (
            <>
              <div className="status-card__position">NOW</div>
              <div className="status-card__label">You're being served!</div>
            </>
          ) : (
            <>
              <div className="status-card__position">#{customer.position}</div>
              <div className="status-card__label">Your position in queue</div>
            </>
          )}
        </div>
        
        <div className="status-info">
          <div className="status-info__item">
            <div className="status-info__value">{customer.estimated_wait}min</div>
            <div className="status-info__label">Est. Wait Time</div>
          </div>
          <div className="status-info__item">
            <div className="status-info__value">{barber?.name}</div>
            <div className="status-info__label">Your Barber</div>
          </div>
          <div className="status-info__item">
            <div className="status-info__value">{service?.name}</div>
            <div className="status-info__label">Service</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
          <button
            className="btn btn--outline"
            onClick={() => onNavigate('queue')}
          >
            View Live Queue
          </button>
          {!isBeingServed && (
            <button
              className="btn btn--outline"
              onClick={() => setShowLeaveModal(true)}
              style={{ color: 'var(--color-error)' }}
            >
              Leave Queue
            </button>
          )}
        </div>
      </div>
      
      {showLeaveModal && (
        <div className="modal">
          <div className="modal__content">
            <div className="modal__header">
              <h3 className="modal__title">Leave Queue?</h3>
              <button className="modal__close" onClick={() => setShowLeaveModal(false)}>×</button>
            </div>
            <p>Are you sure you want to leave the queue? You'll lose your current position.</p>
            <div className="modal__actions">
              <button className="btn btn--outline" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleLeaveQueue}>
                Leave Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Live Queue Display Component
function LiveQueue() {
  const [queue, setQueue] = useState([]);
  const [serving, setServing] = useState(null);
  
  const barbers = DataManager.getBarbers();
  const services = DataManager.getServices();
  
  useEffect(() => {
    const updateQueue = () => {
      const currentQueue = DataManager.getQueue();
      const waitingQueue = currentQueue.filter(c => c.status === 'waiting');
      const currentlyServing = currentQueue.find(c => c.status === 'serving');
      
      setQueue(waitingQueue);
      setServing(currentlyServing);
    };
    
    updateQueue();
    const interval = setInterval(updateQueue, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const formatWaitTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };
  
  return (
    <div className="page">
      <div className="queue-display">
        <div className="queue-display__header">
          <h2 className="queue-display__title">Current Queue</h2>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
        
        {serving && (
          <div className="now-serving">
            <div className="now-serving__label">Now Serving</div>
            <div className="now-serving__customer">
              {serving.customer_name} - {services.find(s => s.id === serving.service_id)?.name}
            </div>
          </div>
        )}
        
        <div className="queue-list">
          {queue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">✂️</div>
              <p>No customers in queue</p>
              <p>Walk-ins welcome!</p>
            </div>
          ) : (
            queue.map((customer) => {
              const barber = barbers.find(b => b.id === customer.barber_id);
              const service = services.find(s => s.id === customer.service_id);
              
              return (
                <div key={customer.id} className="queue-item">
                  <div className="queue-item__info">
                    <div className="queue-item__position">{customer.position}</div>
                    <div className="queue-item__details">
                      <div className="queue-item__name">{customer.customer_name}</div>
                      <div className="queue-item__service">
                        {service?.name} with {barber?.name}
                      </div>
                    </div>
                  </div>
                  <div className="queue-item__wait">
                    ~{formatWaitTime(customer.estimated_wait)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      if (credentials.username === initialData.admin_credentials.username && 
          credentials.password === initialData.admin_credentials.password) {
        onLogin();
      } else {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 500);
  };
  
  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };
  
  return (
    <div className="page">
      <form className="admin-login" onSubmit={handleSubmit}>
        <h2 className="admin-login__title">Admin Login</h2>
        
        {error && (
          <div className="alert alert--error">{error}</div>
        )}
        
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            name="username"
            className="form-control"
            value={credentials.username}
            onChange={handleChange}
            required
            placeholder="admin"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            value={credentials.password}
            onChange={handleChange}
            required
            placeholder="barber123"
          />
        </div>
        
        <button
          type="submit"
          className="btn btn--primary btn--full-width"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    phone: '',
    barber_id: '',
    service_id: ''
  });
  
  const barbers = DataManager.getBarbers();
  const services = DataManager.getServices();
  
  const refreshData = useCallback(() => {
    setQueue(DataManager.getQueue());
    setStats(DataManager.getQueueStats());
  }, []);
  
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);
  
  const handleServeCustomer = (customerId) => {
    DataManager.markAsServing(customerId);
    refreshData();
  };
  
  const handleRemoveCustomer = (customerId) => {
    DataManager.removeFromQueue(customerId);
    refreshData();
  };
  
  const handleAddWalkIn = (e) => {
    e.preventDefault();
    DataManager.addToQueue({
      ...newCustomer,
      barber_id: parseInt(newCustomer.barber_id),
      service_id: parseInt(newCustomer.service_id)
    });
    setNewCustomer({ customer_name: '', phone: '', barber_id: '', service_id: '' });
    setShowAddModal(false);
    refreshData();
  };
  
  return (
    <div className="page">
      <div className="dashboard">
        <div className="dashboard__main">
          <div style={{ padding: 'var(--space-20)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Queue Management</h2>
              <button 
                className="btn btn--primary btn--sm"
                onClick={() => setShowAddModal(true)}
              >
                Add Walk-in
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <p>No customers in queue</p>
              </div>
            ) : (
              queue.map((customer) => {
                const barber = barbers.find(b => b.id === customer.barber_id);
                const service = services.find(s => s.id === customer.service_id);
                
                return (
                  <div key={customer.id} className="admin-queue-item">
                    <div className="queue-item__info">
                      <div className="queue-item__position">#{customer.position}</div>
                      <div className="queue-item__details">
                        <div className="queue-item__name">
                          {customer.customer_name} 
                          <span className="status status--info" style={{ marginLeft: 'var(--space-8)' }}>
                            {customer.status}
                          </span>
                        </div>
                        <div className="queue-item__service">
                          {service?.name} with {barber?.name} • {customer.phone}
                        </div>
                      </div>
                    </div>
                    <div className="admin-queue-item__actions">
                      {customer.status === 'waiting' && (
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => handleServeCustomer(customer.id)}
                        >
                          Serve
                        </button>
                      )}
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => handleRemoveCustomer(customer.id)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        <div className="dashboard__sidebar">
          <div className="stats-card">
            <h3 className="stats-card__title">Queue Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-item__value">{stats.waiting || 0}</div>
                <div className="stat-item__label">Waiting</div>
              </div>
              <div className="stat-item">
                <div className="stat-item__value">{stats.serving || 0}</div>
                <div className="stat-item__label">Being Served</div>
              </div>
              <div className="stat-item">
                <div className="stat-item__value">{stats.total || 0}</div>
                <div className="stat-item__label">Total Today</div>
              </div>
              <div className="stat-item">
                <div className="stat-item__value">{stats.avgWait || 0}min</div>
                <div className="stat-item__label">Avg Wait</div>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <h3 className="stats-card__title">Barbers</h3>
            {barbers.map(barber => (
              <div key={barber.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                <span>{barber.name}</span>
                <span className={`status ${barber.is_available ? 'status--success' : 'status--error'}`}>
                  {barber.is_available ? 'Available' : 'Busy'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showAddModal && (
        <div className="modal">
          <div className="modal__content">
            <div className="modal__header">
              <h3 className="modal__title">Add Walk-in Customer</h3>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddWalkIn}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Barber</label>
                  <select
                    className="form-control"
                    value={newCustomer.barber_id}
                    onChange={(e) => setNewCustomer({...newCustomer, barber_id: e.target.value})}
                    required
                  >
                    <option value="">Select Barber</option>
                    {barbers.filter(b => b.is_available).map(barber => (
                      <option key={barber.id} value={barber.id}>{barber.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service</label>
                  <select
                    className="form-control"
                    value={newCustomer.service_id}
                    onChange={(e) => setNewCustomer({...newCustomer, service_id: e.target.value})}
                    required
                  >
                    <option value="">Select Service</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    initializeData();
    
    // Check if user has an active queue position
    const customerQueueId = localStorage.getItem('customerQueueId');
    if (customerQueueId) {
      const queue = DataManager.getQueue();
      const customer = queue.find(c => c.id === parseInt(customerQueueId));
      if (customer) {
        setCurrentPage('status');
      } else {
        localStorage.removeItem('customerQueueId');
      }
    }
  }, []);
  
  const handleNavigation = (page) => {
    setCurrentPage(page);
  };
  
  const handleAdminLogin = () => {
    setIsAdmin(true);
    setCurrentPage('dashboard');
  };
  
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentPage('home');
  };
  
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigation} />;
      case 'join':
        return <QueueJoinForm onNavigate={handleNavigation} />;
      case 'status':
        return <QueueStatus onNavigate={handleNavigation} />;
      case 'queue':
        return <LiveQueue />;
      case 'admin':
        return isAdmin ? <AdminDashboard /> : <AdminLogin onLogin={handleAdminLogin} />;
      case 'dashboard':
        return <AdminDashboard />;
      default:
        return <HomePage onNavigate={handleNavigation} />;
    }
  };
  
  return (
    <div className="app">
      <Header 
        currentPage={currentPage} 
        onNavigate={handleNavigation}
        isAdmin={isAdmin}
        onLogout={handleAdminLogout}
      />
      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}

// Initialize data and render the app
initializeData();
ReactDOM.render(<App />, document.getElementById('root'));