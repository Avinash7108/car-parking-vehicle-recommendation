// AI CAR PARKING – Vehicle Recommendation & Detection System
const { useState, useEffect, useRef } = React;

// --- API Service Utilities ---
const API = {
  getToken: () => localStorage.getItem("sp_token"),
  setToken: (token) => localStorage.setItem("sp_token", token),
  removeToken: () => localStorage.removeItem("sp_token"),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("sp_user") || "null");
    } catch {
      return null;
    }
  },
  setUser: (u) => localStorage.setItem("sp_user", JSON.stringify(u)),
  removeUser: () => localStorage.removeItem("sp_user"),

  request: async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = API.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(endpoint, { ...options, headers });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data && data.detail ? data.detail : `Server error (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }
};

// --- Toast Notification Component ---
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const isErr = type === "error";
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 ${
      isErr ? "bg-red-950/95 border-red-500/50 text-red-200" : "bg-cyan-950/95 border-cyan-400/50 text-cyan-200"
    }`}>
      <i className={`fa-solid ${isErr ? "fa-circle-exclamation text-red-400" : "fa-circle-check text-cyan-400"} text-xl`}></i>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-3 text-gray-400 hover:text-white">
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}

// --- Main Application Component ---
function App() {
  const [currentUser, setCurrentUser] = useState(API.getUser());
  const [currentView, setCurrentView] = useState(currentUser ? "dashboard" : "landing");
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [liveOccupancy, setLiveOccupancy] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedBookingForPass, setSelectedBookingForPass] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  };

  const logout = () => {
    API.removeToken();
    API.removeUser();
    setCurrentUser(null);
    setCurrentView("landing");
    showToast("Logged out successfully.", "info");
  };

  // Fetch Live Occupancy on Mount & Periodic Interval
  const fetchOccupancy = async () => {
    try {
      const data = await API.request("/api/parking/occupancy");
      setLiveOccupancy(data);
    } catch (err) {
      console.warn("Occupancy poll error:", err);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await API.request("/api/notifications");
      setNotifications(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchOccupancy();
    const interval = setInterval(fetchOccupancy, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#070D1E] text-white">
      {/* Toast Alert */}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(currentUser ? "dashboard" : "landing")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <i className="fa-solid fa-car text-xl text-white"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-white">AI CAR PARKING</span>
            </div>
            <span className="text-[10px] text-cyan-300/80 tracking-tight block">Vehicle Recommendation & Detection System</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm">
          {currentUser ? (
            <>
              <button onClick={() => setCurrentView("dashboard")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "dashboard" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-chart-line mr-2 text-cyan-400"></i>Dashboard
              </button>
              <button onClick={() => setCurrentView("booking")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "booking" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-car mr-2 text-emerald-400"></i>Book Parking (Free)
              </button>
              <button onClick={() => setCurrentView("live-occupancy")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "live-occupancy" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-satellite-dish mr-2 text-blue-400"></i>Live Occupancy
              </button>
              <button onClick={() => setCurrentView("qr-scanner")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "qr-scanner" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-qrcode mr-2 text-yellow-400"></i>Gate Scanner
              </button>
              <button onClick={() => setCurrentView("ai-vision")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "ai-vision" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-eye mr-2 text-purple-400"></i>AI Vehicle CV
              </button>
              <button onClick={() => setCurrentView("my-bookings")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "my-bookings" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}>
                <i className="fa-solid fa-ticket mr-2 text-indigo-400"></i>My Bookings
              </button>
              {currentUser.role === "admin" && (
                <button onClick={() => setCurrentView("admin")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "admin" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "text-red-400 hover:bg-red-500/10"}`}>
                  <i className="fa-solid fa-shield-halved mr-2 text-red-400"></i>Admin Portal
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setCurrentView("landing")} className={`px-3.5 py-2 rounded-lg font-medium transition ${currentView === "landing" ? "text-cyan-300" : "text-gray-300 hover:text-white"}`}>Home</button>
              <button onClick={() => setCurrentView("live-occupancy")} className="px-3.5 py-2 text-gray-300 hover:text-white">Live Bays</button>
              <button onClick={() => setCurrentView("qr-scanner")} className="px-3.5 py-2 text-gray-300 hover:text-white">Gate Scanner</button>
              <button onClick={() => setCurrentView("ai-vision")} className="px-3.5 py-2 text-gray-300 hover:text-white">AI Vision Demo</button>
            </>
          )}
        </nav>

        {/* Right Action Section */}
        <div className="flex items-center gap-3">
          {/* Live Occupancy Badge */}
          {liveOccupancy && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800/80 border border-white/10 text-xs font-mono-code">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-gray-300">Live Bays:</span>
              <span className="font-bold text-emerald-400">{liveOccupancy.available_slots} / {liveOccupancy.total_slots} Free</span>
            </div>
          )}

          {/* Quick Demo Switcher */}
          <div className="hidden sm:flex items-center bg-navy-900 border border-cyan-500/30 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => {
                API.request("/api/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email: "customer@smartpark.ai", password: "Customer@123" })
                }).then(res => {
                  API.setToken(res.access_token);
                  API.setUser(res.user);
                  setCurrentUser(res.user);
                  setCurrentView("dashboard");
                  showToast("Switched to Demo Customer Account (Avinash)", "info");
                });
              }}
              className="px-2.5 py-1 text-cyan-300 hover:bg-cyan-500/20 rounded transition"
              title="Quick Customer Login"
            >
              👤 Customer
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={() => {
                API.request("/api/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email: "admin@smartpark.ai", password: "Admin@123" })
                }).then(res => {
                  API.setToken(res.access_token);
                  API.setUser(res.user);
                  setCurrentUser(res.user);
                  setCurrentView("admin");
                  showToast("Switched to Administrator Account", "info");
                });
              }}
              className="px-2.5 py-1 text-red-300 hover:bg-red-500/20 rounded transition"
              title="Quick Admin Login"
            >
              🛡️ Admin
            </button>
          </div>

          {/* Notification Bell */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-lg bg-navy-800 hover:bg-navy-700 flex items-center justify-center text-gray-300 hover:text-white transition relative"
                title="Notifications"
              >
                <i className="fa-regular fa-bell"></i>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="font-bold text-sm text-white">System Notifications</span>
                    <button
                      onClick={async () => {
                        await API.request("/api/notifications/read-all", { method: "PATCH" });
                        fetchNotifications();
                        showToast("All notifications marked as read", "info");
                      }}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl border text-xs ${n.is_read ? "bg-navy-900/60 border-white/5 text-gray-400" : "bg-cyan-950/40 border-cyan-500/30 text-gray-200"}`}>
                          <div className="font-semibold text-white mb-0.5">{n.title}</div>
                          <p className="leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-gray-500 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account / Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">{currentUser.full_name}</span>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider">{currentUser.role}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30 transition flex items-center gap-1.5"
                title="Log Out"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView("login")}
                className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition shadow-lg shadow-cyan-400/20"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentView("register")}
                className="hidden sm:inline-block px-3.5 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-medium text-xs transition"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === "landing" && (
          <LandingPage
            onExplore={() => setCurrentView(currentUser ? "booking" : "login")}
            onViewOccupancy={() => setCurrentView("live-occupancy")}
            onViewVision={() => setCurrentView("ai-vision")}
            liveOccupancy={liveOccupancy}
          />
        )}
        {currentView === "login" && (
          <LoginPage
            onSuccess={(user) => {
              setCurrentUser(user);
              setCurrentView(user.role === "admin" ? "admin" : "dashboard");
              showToast(`Welcome back, ${user.full_name}!`, "info");
            }}
            onSwitchToRegister={() => setCurrentView("register")}
            showToast={showToast}
          />
        )}
        {currentView === "register" && (
          <RegisterPage
            onSuccess={(user) => {
              setCurrentUser(user);
              setCurrentView("dashboard");
              showToast("Registration successful! Welcome to AI CAR PARKING.", "info");
            }}
            onSwitchToLogin={() => setCurrentView("login")}
            showToast={showToast}
          />
        )}
        {currentView === "dashboard" && currentUser && (
          <CustomerDashboard
            user={currentUser}
            onBookSlot={() => setCurrentView("booking")}
            onViewBookings={() => setCurrentView("my-bookings")}
            onViewPass={(b) => setSelectedBookingForPass(b)}
            showToast={showToast}
          />
        )}
        {currentView === "booking" && (
          <SlotBookingPage
            user={currentUser}
            onBookingSuccess={(booking) => {
              setSelectedBookingForPass(booking);
              setCurrentView("confirmation");
              fetchOccupancy();
              showToast("Free parking slot reserved successfully!", "info");
            }}
            onRequireLogin={() => setCurrentView("login")}
            onViewPass={(b) => setSelectedBookingForPass(b)}
            showToast={showToast}
          />
        )}
        {currentView === "confirmation" && selectedBookingForPass && (
          <BookingConfirmationPage
            booking={selectedBookingForPass}
            onViewAll={() => setCurrentView("my-bookings")}
            onCancel={() => {
              fetchOccupancy();
              setCurrentView("dashboard");
            }}
            showToast={showToast}
          />
        )}
        {currentView === "my-bookings" && (
          <MyBookingsPage
            onViewPass={(b) => setSelectedBookingForPass(b)}
            onBookMore={() => setCurrentView("booking")}
            showToast={showToast}
          />
        )}
        {currentView === "live-occupancy" && (
          <LiveOccupancyPage
            data={liveOccupancy}
            onRefresh={fetchOccupancy}
            onBookSlot={() => setCurrentView(currentUser ? "booking" : "login")}
          />
        )}
        {currentView === "qr-scanner" && (
          <QRScannerPage
            onSuccess={(res) => {
              fetchOccupancy();
              showToast(res.message, "info");
            }}
            showToast={showToast}
          />
        )}
        {currentView === "ai-vision" && (
          <AIVisionPage
            showToast={showToast}
            onOccupancyChange={fetchOccupancy}
          />
        )}
        {currentView === "admin" && (
          <AdminDashboard
            user={currentUser}
            showToast={showToast}
            onRefreshOccupancy={fetchOccupancy}
          />
        )}
      </main>

      {/* Ticket Pass Modal */}
      {selectedBookingForPass && currentView !== "confirmation" && (
        <BookingPassModal
          booking={selectedBookingForPass}
          onClose={() => setSelectedBookingForPass(null)}
          onCancelSuccess={() => {
            setSelectedBookingForPass(null);
            fetchOccupancy();
          }}
          showToast={showToast}
        />
      )}

      {/* Footer */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-4 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">AI CAR PARKING</span>
            <span>• Vehicle Recommendation & Smart Detection System</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>OpenCV / YOLO Vision</span>
            <span>•</span>
            <span>QR Authentication</span>
            <span>•</span>
            <span>100% Free Booking</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 1. LANDING PAGE
// ==========================================
function LandingPage({ onExplore, onViewOccupancy, onViewVision, liveOccupancy }) {
  return (
    <div className="relative overflow-hidden">
      {/* Background Neon Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          AI Car Parking & Vehicle Recommendation System
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          AI Car Parking <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            & Vehicle Recommendation System
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Reserve parking slots completely <strong>FREE</strong> with AI proximity recommendations, visual interactive bay layouts, instant QR entrance passes, and real-time computer vision vehicle recognition.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onExplore}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-base transition shadow-xl shadow-cyan-400/25 flex items-center gap-2.5"
          >
            <i className="fa-solid fa-car"></i>
            Book Free Parking Bay
          </button>
          <button
            onClick={onViewOccupancy}
            className="px-7 py-3.5 rounded-xl bg-navy-800/80 hover:bg-navy-700/80 border border-white/10 text-white font-semibold text-base transition flex items-center gap-2.5"
          >
            <i className="fa-solid fa-satellite-dish text-cyan-400"></i>
            Live Facility Occupancy
          </button>
          <button
            onClick={onViewVision}
            className="px-7 py-3.5 rounded-xl bg-navy-800/80 hover:bg-navy-700/80 border border-purple-500/30 text-purple-300 font-semibold text-base transition flex items-center gap-2.5"
          >
            <i className="fa-solid fa-eye text-purple-400"></i>
            AI Vehicle Vision Studio
          </button>
        </div>

        {/* Live Metrics Ticker Card */}
        {liveOccupancy && (
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 glass-card rounded-2xl border border-cyan-500/20 text-left">
            <div>
              <span className="text-xs text-gray-400 block">System Occupancy</span>
              <span className="text-2xl font-extrabold text-cyan-400 font-mono-code">{liveOccupancy.occupancy_percentage}%</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Real-time load factor</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Available Bays</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono-code">{liveOccupancy.available_slots} Slots</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Ready for instant booking</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Occupied / Reserved</span>
              <span className="text-2xl font-extrabold text-yellow-400 font-mono-code">{liveOccupancy.occupied_slots + liveOccupancy.reserved_slots} Slots</span>
              <span className="text-[10px] text-yellow-400 block mt-0.5">Active parked vehicles</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Reservation Fee</span>
              <span className="text-2xl font-extrabold text-white font-mono-code">100% FREE</span>
              <span className="text-[10px] text-cyan-300 block mt-0.5">Zero payment barrier</span>
            </div>
          </div>
        )}
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">AI Car Parking & Vehicle Recommendation Architecture</h2>
          <p className="text-sm text-gray-400 mt-2">Integrating Artificial Intelligence, Computer Vision, and Hardware Gate Simulation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl mb-4">
              <i className="fa-solid fa-brain"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Proximity Recommendation</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Algorithmic scoring weights slot-to-entrance walking distance, vehicle footprint compatibility (EV, SUV, Sedan), and area congestion load balancing.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
              <i className="fa-solid fa-camera"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">OpenCV / YOLO Vehicle Vision</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Automated computer vision pipeline detects vehicle classes, localizes registration plates, extracts numbers via OCR, and cross-checks database passes.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-2xl mb-4">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">QR Gate Automation</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Secure digital QR passes generated per reservation. Scannable via entrance camera or manual backup to open boom barriers and record audit logs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 2. LOGIN PAGE
// ==========================================
function LoginPage({ onSuccess, onSwitchToRegister, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter email and password.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await API.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember_me: rememberMe })
      });
      API.setToken(data.access_token);
      API.setUser(data.user);
      onSuccess(data.user);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (eMail, pwd) => {
    setEmail(eMail);
    setPassword(pwd);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-cyan-500/30 relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl mx-auto mb-3">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Sign In to AI CAR PARKING</h2>
          <p className="text-xs text-gray-400 mt-1">Access your customer dashboard or admin control panel</p>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div className="bg-navy-900/80 border border-cyan-500/20 rounded-2xl p-3.5 mb-6 text-xs">
          <span className="font-bold text-cyan-300 block mb-2">⚡ 1-Click College Demo Sign-In:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("customer@smartpark.ai", "Customer@123")}
              className="py-1.5 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-left transition"
            >
              <div className="font-bold">👤 Customer</div>
              <div className="text-[10px] text-gray-400">customer@smartpark.ai</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("admin@smartpark.ai", "Admin@123")}
              className="py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-left transition"
            >
              <div className="font-bold">🛡️ Administrator</div>
              <div className="text-[10px] text-gray-400">admin@smartpark.ai</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-gray-500 text-sm"><i className="fa-regular fa-envelope"></i></span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 focus:border-cyan-400 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300">Password</label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-gray-500 text-sm"><i className="fa-solid fa-key"></i></span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 focus:border-cyan-400 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-navy-900 border-white/20 text-cyan-400 focus:ring-0"
            />
            <label htmlFor="remember" className="ml-2 text-xs text-gray-400">Remember this device for 30 days</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-sm transition shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Don't have an account?{" "}
          <button onClick={onSwitchToRegister} className="text-cyan-400 font-bold hover:underline">
            Register Free Here
          </button>
        </div>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="max-w-sm w-full glass-card p-6 rounded-2xl border border-cyan-500/30">
              <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
              <p className="text-xs text-gray-400 mb-4">Enter your registered email address to receive reset instructions.</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-sm mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await API.request("/api/auth/forgot-password", {
                      method: "POST",
                      body: JSON.stringify({ email: forgotEmail || "customer@smartpark.ai" })
                    });
                    showToast("Password reset link sent! Check demo credentials.", "info");
                    setShowForgot(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-400 text-black font-bold text-xs"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. REGISTRATION PAGE
// ==========================================
function RegisterPage({ onSuccess, onSwitchToLogin, showToast }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile: "",
    password: "",
    confirm_password: "",
    vehicle_registration_number: "",
    vehicle_type: "Sedan",
    vehicle_model: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      showToast("Passwords do not match!", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await API.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      API.setToken(data.access_token);
      API.setUser(data.user);
      onSuccess(data.user);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full glass-card p-8 rounded-3xl border border-cyan-500/30">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl mx-auto mb-3">
            <i className="fa-solid fa-id-card"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Create Customer Profile</h2>
          <p className="text-xs text-gray-400 mt-1">Register for 100% Free Smart Parking & Vehicle Recommendation Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Vehicle Plate (Reg. No.)</label>
              <input
                type="text"
                required
                value={formData.vehicle_registration_number}
                onChange={(e) => setFormData({ ...formData, vehicle_registration_number: e.target.value.toUpperCase() })}
                placeholder="e.g. MH 12 AB 1234"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm font-mono-code focus:border-cyan-400 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Vehicle Classification</label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none text-white"
              >
                <option value="Sedan">Sedan (Standard)</option>
                <option value="SUV">SUV / Full-Size Utility</option>
                <option value="Hatchback">Hatchback (Compact)</option>
                <option value="EV">Electric Vehicle (EV Charging Port)</option>
                <option value="Motorcycle">Two-Wheeler / Motorcycle</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Vehicle Model</label>
              <input
                type="text"
                required
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                placeholder="e.g. Tata Nexon EV Max"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-sm transition shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-user-plus"></i>}
            Complete Free Registration
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Already registered?{" "}
          <button onClick={onSwitchToLogin} className="text-cyan-400 font-bold hover:underline">
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. CUSTOMER DASHBOARD
// ==========================================
function CustomerDashboard({ user, onBookSlot, onViewBookings, onViewPass, showToast }) {
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const fetchSummary = async () => {
    try {
      const data = await API.request("/api/bookings/active-summary");
      setSummary(data);
    } catch (e) {
      console.warn("Summary fetch error", e);
    }
  };

  const fetchAIRecommendations = async () => {
    setLoadingRec(true);
    try {
      const vtype = user.vehicle ? user.vehicle.vehicle_type : "Sedan";
      const data = await API.request(`/api/recommendations?vehicle_type=${encodeURIComponent(vtype)}`);
      setRecommendations(data);
    } catch (e) {
      console.warn("AI Rec fetch error", e);
    } finally {
      setLoadingRec(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchAIRecommendations();
  }, [user]);

  const active = summary && summary.active_booking;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Personalized Welcome Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-cyan-500/20 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Customer Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome, {user.full_name}!</h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Registered Vehicle: <span className="font-mono-code font-bold text-cyan-300">{user.vehicle ? user.vehicle.plate_number : "No Vehicle Added"}</span> ({user.vehicle ? user.vehicle.vehicle_model : ""})
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <button
            onClick={onBookSlot}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 text-black font-bold text-xs sm:text-sm transition shadow-lg shadow-cyan-400/20 flex items-center gap-2"
          >
            <i className="fa-solid fa-bolt"></i>
            Quick 1-Click Free Booking
          </button>
        </div>
      </div>

      {/* Prominently Show The Booked Slot if User Has One */}
      {active && (
        <div className="glass-card p-6 rounded-3xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-950/40 via-navy-900 to-navy-950 mb-8 shadow-xl shadow-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] uppercase font-bold text-emerald-400">YOUR BAY</span>
              <span className="text-3xl font-extrabold font-mono-code text-white">{active.slot_number}</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-full bg-emerald-400 text-black text-xs font-extrabold tracking-wider uppercase">
                  ✓ YOUR BOOKED SLOT
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-navy-800 border border-cyan-400/40 text-cyan-300 font-mono-code text-xs font-bold">
                  BOOKING ID: {active.booking_code}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {active.parking_area_name}
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                <i className="fa-regular fa-calendar-check text-cyan-400 mr-1.5"></i>
                Date: <strong className="text-white">{active.booking_date}</strong> • Window: <strong className="text-cyan-300 font-mono-code">{active.expected_arrival} - {active.expected_departure}</strong> • Status: <span className="text-emerald-400 font-bold uppercase">{active.status}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onViewPass(active)}
              className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/30"
            >
              <i className="fa-solid fa-qrcode text-base"></i> View QR Entrance Pass
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Total Bookings</span>
            <i className="fa-solid fa-calendar-check text-cyan-400"></i>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-code text-white">
            {summary ? summary.total_bookings : 0}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">Lifetime reservations</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Booked Slot Status</span>
            <i className="fa-solid fa-car text-emerald-400"></i>
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${active ? "text-emerald-400" : "text-gray-400"}`}>
            {active ? active.slot_number : "NO BOOKED BAY"}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">{active ? `ID: ${active.booking_code}` : "Ready to reserve"}</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Upcoming Reservations</span>
            <i className="fa-solid fa-clock text-yellow-400"></i>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-code text-yellow-400">
            {summary ? summary.upcoming_reservations_count : 0}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">Scheduled visits</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Parking Cost</span>
            <i className="fa-solid fa-tag text-purple-400"></i>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-code text-cyan-400">
            ₹0.00
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">100% Free Campus Access</span>
        </div>
      </div>

      {/* AI Vehicle Recommendation Section */}
      <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm">
              <i className="fa-solid fa-microchip"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Vehicle Recommendation Module</h2>
              <span className="text-[11px] text-gray-400">Multi-Factor Distance & Vehicle Compatibility Engine</span>
            </div>
          </div>
          <button
            onClick={fetchAIRecommendations}
            disabled={loadingRec}
            className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-300 text-xs font-medium border border-white/10 transition flex items-center gap-1.5"
          >
            <i className={`fa-solid fa-arrows-rotate ${loadingRec ? "animate-spin" : ""}`}></i>
            Refresh Engine
          </button>
        </div>

        {recommendations && recommendations.best_recommendation ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Best Recommended Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-navy-900 border border-cyan-400/40 relative">
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase">
                  ⭐ BEST MATCH
                </span>
                <span className="text-[11px] text-cyan-300 font-bold block mb-1">RECOMMENDED SLOT</span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-white font-mono-code">{recommendations.best_recommendation.slot_number}</span>
                  <span className="text-xs text-gray-400">({recommendations.best_recommendation.area_name})</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-navy-950/60 rounded-xl mb-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Distance</span>
                    <span className="font-bold text-white font-mono-code">{recommendations.best_recommendation.distance_from_entrance}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Walking Time</span>
                    <span className="font-bold text-cyan-300 font-mono-code">~{recommendations.best_recommendation.estimated_walking_seconds}s</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">AI Fit Score</span>
                    <span className="font-bold text-emerald-400 font-mono-code">{recommendations.best_recommendation.composite_score}/100</span>
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-3">
                  <i className="fa-solid fa-circle-check text-emerald-400 mr-1.5"></i>
                  {recommendations.best_recommendation.explanation}
                </p>
                <button
                  onClick={onBookSlot}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 text-black font-extrabold text-xs transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-bolt"></i> 1-Click Book Recommended Bay
                </button>
              </div>

              {/* Alternative Recommended Card */}
              {recommendations.alternative_recommendation && (
                <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/10 relative">
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-navy-700 text-gray-300 font-bold text-[10px] uppercase">
                    ALTERNATIVE
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold block mb-1">RUNNER-UP BAY</span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-white font-mono-code">{recommendations.alternative_recommendation.slot_number}</span>
                    <span className="text-xs text-gray-400">({recommendations.alternative_recommendation.area_name})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-navy-950/60 rounded-xl mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Distance</span>
                      <span className="font-bold text-white font-mono-code">{recommendations.alternative_recommendation.distance_from_entrance}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Walking Time</span>
                      <span className="font-bold text-cyan-300 font-mono-code">~{recommendations.alternative_recommendation.estimated_walking_seconds}s</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">AI Fit Score</span>
                      <span className="font-bold text-yellow-400 font-mono-code">{recommendations.alternative_recommendation.composite_score}/100</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    {recommendations.alternative_recommendation.explanation}
                  </p>
                  <button
                    onClick={onBookSlot}
                    className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-xs border border-white/10 transition"
                  >
                    Select Alternative Bay
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-navy-950/80 rounded-xl border border-white/5 text-[11px] text-gray-400 flex items-start gap-2">
              <i className="fa-solid fa-circle-info text-cyan-400 mt-0.5"></i>
              <span>{recommendations.summary_explanation}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-4 text-center">No available slots match current criteria.</p>
        )}
      </div>

      {/* Recent Booking History Section */}
      <div className="glass-card p-6 rounded-3xl border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Recent Booking History</h2>
          <button onClick={onViewBookings} className="text-xs text-cyan-400 hover:underline">
            View All ({summary ? summary.total_bookings : 0}) →
          </button>
        </div>

        {summary && summary.recent_history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-white/5 pb-2">
                <tr>
                  <th className="py-2.5 font-semibold">Pass ID</th>
                  <th className="py-2.5 font-semibold">Bay ID</th>
                  <th className="py-2.5 font-semibold">Vehicle Plate</th>
                  <th className="py-2.5 font-semibold">Date</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summary.recent_history.map(b => (
                  <tr key={b.id} className="hover:bg-white/5 transition">
                    <td className="py-3 font-mono-code text-cyan-300 font-semibold">{b.booking_code}</td>
                    <td className="py-3 font-mono-code font-bold text-white">{b.slot_number}</td>
                    <td className="py-3 font-mono-code">{b.vehicle_plate}</td>
                    <td className="py-3 text-gray-300">{b.booking_date}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === "Completed" ? "bg-emerald-500/20 text-emerald-300" :
                        b.status === "Cancelled" ? "bg-red-500/20 text-red-300" :
                        "bg-cyan-500/20 text-cyan-300"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onViewPass(b)}
                        className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-300 text-xs transition"
                      >
                        Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-6 text-center">No past bookings found.</p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. INTERACTIVE PARKING SLOT SELECTION & EASY BOOKING
// ==========================================
function SlotBookingPage({ user, onBookingSuccess, onRequireLogin, onViewPass, showToast }) {
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlotModal, setBookedSlotModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Area Modal State
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newAreaForm, setNewAreaForm] = useState({
    name: "",
    code: "",
    description: "",
    total_slots: 5
  });

  // Filter & Search
  const [slotFilter, setSlotFilter] = useState("ALL"); // ALL, AVAILABLE, BOOKED, EV
  const [searchQuery, setSearchQuery] = useState("");

  // Easy Booking Form State
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();
  const startHH = `${String(currentHour).padStart(2, "0")}:00`;
  const endHH = `${String((currentHour + 2) % 24).padStart(2, "0")}:00`;

  const [formData, setFormData] = useState({
    customer_name: user ? user.full_name : "",
    customer_email: user ? user.email : "",
    customer_mobile: user ? user.mobile : "",
    vehicle_plate: user && user.vehicle ? user.vehicle.plate_number : "",
    vehicle_model: user && user.vehicle ? user.vehicle.vehicle_model : "Standard Car",
    vehicle_type: user && user.vehicle ? user.vehicle.vehicle_type : "Sedan",
    booking_date: todayStr,
    expected_arrival: startHH,
    expected_departure: endHH
  });

  // Time preset helper
  const setDurationPreset = (hours) => {
    const sH = parseInt(formData.expected_arrival.split(":")[0]) || currentHour;
    const eH = (sH + hours) % 24;
    setFormData({
      ...formData,
      expected_departure: `${String(eH).padStart(2, "0")}:00`
    });
    showToast(`Time window set to ${hours} Hours`, "info");
  };

  const fetchAreas = async () => {
    try {
      const data = await API.request("/api/parking/areas");
      setAreas(data);
      if (data.length > 0 && !selectedAreaId) {
        setSelectedAreaId(data[0].id);
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const activeArea = areas.find(a => a.id === selectedAreaId) || areas[0];

  const handleSlotClick = (slot) => {
    // If slot is Occupied or Reserved -> Show Booked Slot Information Modal!
    if (slot.status === "Occupied" || slot.status === "Reserved") {
      setBookedSlotModal(slot);
      return;
    }

    if (slot.status === "Disabled") {
      showToast(`Slot ${slot.slot_number} is Disabled for facility maintenance.`, "error");
      return;
    }

    // Available -> Select for Easy Booking!
    setSelectedSlot(slot);
    showToast(`Ready to book ${slot.slot_number} (${slot.slot_type})`, "info");
  };

  const handleEasyBookingSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user) {
      showToast("Please sign in to confirm your free reservation.", "error");
      onRequireLogin();
      return;
    }

    if (!selectedSlot) {
      showToast("Please click on an available parking slot first.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        parking_area_name: activeArea.name,
        slot_number: selectedSlot.slot_number
      };

      const res = await API.request("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onBookingSuccess(res);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddArea = async (e) => {
    e.preventDefault();
    try {
      const res = await API.request("/api/parking/quick-add-area", {
        method: "POST",
        body: JSON.stringify(newAreaForm)
      });
      showToast(res.message, "info");
      setShowAddAreaModal(false);
      setNewAreaForm({ name: "", code: "", description: "", total_slots: 5 });
      await fetchAreas();
      if (res.area) setSelectedAreaId(res.area.id);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Filter slots in active area
  const filteredSlots = activeArea && activeArea.slots ? activeArea.slots.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      const matchNumber = s.slot_number.includes(q);
      const matchBooking = s.active_booking && s.active_booking.booking_code.toUpperCase().includes(q);
      if (!matchNumber && !matchBooking) return false;
    }
    if (slotFilter === "AVAILABLE") return s.status === "Available";
    if (slotFilter === "BOOKED") return s.status === "Occupied" || s.status === "Reserved";
    if (slotFilter === "EV") return s.slot_type.includes("EV");
    return true;
  }) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Interactive Facility Map</span>
          <h1 className="text-3xl font-extrabold text-white">Parking Slot Areas & Easy Booking</h1>
          <p className="text-sm text-gray-400 mt-1">Select an area, click an available slot for 1-Click Free Booking, or view booked slot IDs</p>
        </div>
        {/* Add Parking Area Action Button */}
        <button
          onClick={() => setShowAddAreaModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 text-black font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-400/25"
        >
          <i className="fa-solid fa-plus-circle text-sm"></i>
          + Add Parking Area
        </button>
      </div>

      {/* Parking Area Selector Tabs with Capacity Indicators */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        {areas.map(a => {
          const availCount = a.slots ? a.slots.filter(s => s.status === "Available").length : 0;
          const bookedCount = a.slots ? a.slots.filter(s => s.status === "Occupied" || s.status === "Reserved").length : 0;
          const isSelected = selectedAreaId === a.id;

          return (
            <button
              key={a.id}
              onClick={() => {
                setSelectedAreaId(a.id);
                setSelectedSlot(null);
              }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-2.5 border ${
                isSelected
                  ? "bg-cyan-400 text-black border-cyan-300 shadow-lg shadow-cyan-400/25"
                  : "bg-navy-900/90 text-gray-300 hover:text-white border-white/10 hover:border-white/20"
              }`}
            >
              <i className="fa-solid fa-location-dot"></i>
              <span>{a.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-extrabold ${
                isSelected ? "bg-black/20 text-black" : "bg-navy-800 text-emerald-400 border border-emerald-500/30"
              }`}>
                {availCount} Free • {bookedCount} Booked
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-3 rounded-2xl border border-white/10 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "All Bays" },
            { id: "AVAILABLE", label: "🟢 Available Only" },
            { id: "BOOKED", label: "🔴 Booked Slots Only" },
            { id: "EV", label: "⚡ EV Charging Bays" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSlotFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                slotFilter === f.id ? "bg-cyan-400 text-black" : "bg-navy-900 text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-2 text-gray-500 text-xs"><i className="fa-solid fa-magnifying-glass"></i></span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Bay (e.g. A-01) or Booking ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-navy-900 border border-white/10 text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Visual Parking Layout & Easy Booking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Floorplan (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{activeArea ? activeArea.name : "Loading Wing..."}</h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono-code font-bold">
                  {filteredSlots.length} Slots Shown
                </span>
              </div>
              <span className="text-xs text-gray-400">{activeArea ? activeArea.description : ""}</span>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#10B981]"></span> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#EF4444]"></span> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#F59E0B]"></span> Reserved</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#00E5FF]"></span> Selected</span>
            </div>
          </div>

          {/* Real-world Parking Facility Floor Container */}
          <div className="parking-bay-grid p-6 rounded-2xl">
            {/* Entrance Gate Indicator */}
            <div className="flex items-center justify-between mb-6 px-4 py-2 bg-navy-900/80 rounded-xl border border-cyan-500/20 text-xs">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <i className="fa-solid fa-door-open text-emerald-400"></i>
                FACILITY ENTRANCE GATE
              </div>
              <span className="text-[11px] text-gray-400 font-mono-code">Proximity to terminal: 10m - 50m</span>
            </div>

            {/* Parking Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {filteredSlots.map(slot => {
                const isSelected = selectedSlot && selectedSlot.id === slot.id;
                const isBooked = slot.status === "Occupied" || slot.status === "Reserved";
                const isUserBooked = slot.active_booking && user && slot.active_booking.user_id === user.id;

                let cardClass = isSelected ? "selected" : slot.status.toLowerCase();
                if (isUserBooked) cardClass += " border-2 border-emerald-400 ring-2 ring-emerald-400/50";

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`slot-card ${cardClass} p-3 flex flex-col justify-between min-h-[175px] cursor-pointer`}
                    title={isBooked ? `Click to view Booked Slot details (ID: ${slot.active_booking ? slot.active_booking.booking_code : 'BOOKED'})` : `Click to book ${slot.slot_number}`}
                  >
                    {/* Top Row: Slot ID & Special Badge */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-lg font-mono-code">{slot.slot_number}</span>
                        {slot.slot_type.includes("EV") && <span className="text-xs" title="Level 2 EV Charging">⚡</span>}
                      </div>

                      {/* Display Booked Slot ID Banner */}
                      {isBooked && (
                        <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold truncate ${
                          isUserBooked ? "bg-emerald-500 text-black animate-pulse" : "bg-red-950/80 text-red-300 border border-red-500/30"
                        }`}>
                          {isUserBooked ? "YOUR BOOKING" : (slot.active_booking ? slot.active_booking.booking_code : "BOOKED")}
                        </div>
                      )}
                      {!isBooked && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    {/* Middle Icon */}
                    <div className="text-center my-1.5 text-2xl">
                      <i className={`fa-solid ${
                        isUserBooked ? "fa-star text-yellow-300 animate-bounce" :
                        slot.status === "Occupied" ? "fa-car text-red-400" :
                        slot.status === "Reserved" ? "fa-clock text-yellow-400" :
                        slot.status === "Disabled" ? "fa-ban text-gray-500" :
                        isSelected ? "fa-car-side text-cyan-300" :
                        "fa-square-parking text-emerald-400"
                      }`}></i>
                    </div>

                    {/* Bottom Details */}
                    <div>
                      <div className="text-[10px] font-bold uppercase truncate">{slot.slot_type}</div>
                      <div className="text-[9px] text-gray-400 font-mono-code">{slot.distance_from_entrance}m away</div>
                      {isBooked && slot.active_booking && (
                        <div className="text-[9px] text-cyan-300 font-mono-code mt-0.5 truncate">
                          {slot.active_booking.expected_arrival}-{slot.active_booking.expected_departure}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Central Lane */}
            <div className="my-6 flex items-center justify-center gap-4">
              <div className="flex-1 parking-road-marking"></div>
              <span className="text-[10px] font-mono-code uppercase tracking-widest text-gray-400 bg-navy-950 px-3 py-1 rounded-full border border-white/5">
                TWO-WAY DRIVEWAY
              </span>
              <div className="flex-1 parking-road-marking"></div>
            </div>

            {/* Exit Barrier */}
            <div className="flex items-center justify-between mt-4 px-4 py-2 bg-navy-900/80 rounded-xl border border-white/5 text-xs text-gray-400">
              <span>Exit Barrier Gate Active</span>
              <span className="text-cyan-400 font-mono-code font-bold">SMART PARK TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* Easy To Book Form (1 Col) */}
        <div className="glass-card p-6 rounded-3xl border border-cyan-500/40 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-400 text-black flex items-center justify-center text-lg font-bold shadow-md shadow-cyan-400/30">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Easy 1-Click Free Booking</h3>
                <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Zero payment • Free Parking Pass</span>
              </div>
            </div>

            {selectedSlot ? (
              <div className="p-3.5 bg-gradient-to-br from-cyan-950/60 to-navy-900 border-2 border-cyan-400 rounded-2xl mb-4 text-xs shadow-lg shadow-cyan-400/20">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Ready to Reserve:</span>
                  <span className="text-xl font-extrabold font-mono-code text-cyan-300">Bay {selectedSlot.slot_number}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-gray-400">Area / Facility:</span>
                  <span className="text-white font-medium">{activeArea.name} ({selectedSlot.slot_type})</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-gray-400">Walking Proximity:</span>
                  <span className="text-emerald-400 font-bold font-mono-code">{selectedSlot.distance_from_entrance}m (~{Math.round(selectedSlot.distance_from_entrance / 1.25)}s walk)</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-navy-900 border border-dashed border-cyan-500/40 text-center text-xs text-gray-300 mb-4">
                <i className="fa-solid fa-hand-pointer text-cyan-400 text-2xl mb-1.5 block animate-bounce"></i>
                <strong className="text-white block mb-0.5">Click any available green parking slot</strong>
                to auto-fill and confirm your free reservation instantly.
              </div>
            )}

            {/* Quick Duration Preset Pills */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-gray-400 block mb-1.5">Quick Duration Presets:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDurationPreset(2)}
                  className="py-1.5 rounded-lg bg-navy-900 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 hover:border-cyan-400 text-[10px] font-bold transition"
                >
                  ⚡ 2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset(4)}
                  className="py-1.5 rounded-lg bg-navy-900 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 hover:border-cyan-400 text-[10px] font-bold transition"
                >
                  ⚡ 4 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset(8)}
                  className="py-1.5 rounded-lg bg-navy-900 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 hover:border-cyan-400 text-[10px] font-bold transition"
                >
                  ⚡ Full Day
                </button>
              </div>
            </div>

            <form onSubmit={handleEasyBookingSubmit} id="easy-booking-form" className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                    placeholder="Plate (e.g. MH 12 AB 1234)"
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code uppercase focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Arrival Time</label>
                  <input
                    type="time"
                    required
                    value={formData.expected_arrival}
                    onChange={(e) => setFormData({ ...formData, expected_arrival: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Departure Time</label>
                  <input
                    type="time"
                    required
                    value={formData.expected_departure}
                    onChange={(e) => setFormData({ ...formData, expected_departure: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Pricing & 1-Click Action */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center text-xs mb-4">
              <span className="text-gray-400">Total Price:</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono-code">₹0.00 (100% FREE)</span>
            </div>

            <button
              form="easy-booking-form"
              type="submit"
              disabled={submitting || !selectedSlot}
              className={`w-full py-4 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider transition shadow-2xl flex items-center justify-center gap-2 ${
                submitting || !selectedSlot
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 text-black shadow-cyan-400/30"
              }`}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i> Reserving Bay...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt text-base"></i> ⚡ CONFIRM 1-CLICK FREE BOOKING
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: SHOW BOOKED SLOT INFORMATION */}
      {bookedSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-red-500/40 relative shadow-2xl">
            <button
              onClick={() => setBookedSlotModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <div className="text-center mb-4">
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/40 uppercase">
                {bookedSlotModal.status} SLOT
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-2">Bay {bookedSlotModal.slot_number}</h3>
              <span className="text-xs text-gray-400">{activeArea.name}</span>
            </div>

            <div className="p-4 bg-navy-900 rounded-2xl border border-white/10 space-y-2.5 text-xs font-mono-code mb-5">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-gray-400">Booking Pass ID:</span>
                <span className="text-cyan-300 font-extrabold text-sm">
                  {bookedSlotModal.active_booking ? bookedSlotModal.active_booking.booking_code : "SP-20261122-ACTIVE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Registered Plate:</span>
                <span className="text-white font-bold">
                  {bookedSlotModal.active_booking ? bookedSlotModal.active_booking.vehicle_plate : "RESERVED"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Date of Session:</span>
                <span className="text-white">
                  {bookedSlotModal.active_booking ? bookedSlotModal.active_booking.booking_date : todayStr}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Time Window:</span>
                <span className="text-yellow-400 font-bold">
                  {bookedSlotModal.active_booking ? `${bookedSlotModal.active_booking.expected_arrival} - ${bookedSlotModal.active_booking.expected_departure}` : "Active Window"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-gray-400">Distance from Gate:</span>
                <span className="text-gray-300">{bookedSlotModal.distance_from_entrance} meters</span>
              </div>
            </div>

            {/* If booked by current user */}
            {bookedSlotModal.active_booking && user && bookedSlotModal.active_booking.user_id === user.id ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-center font-bold text-xs">
                  ✓ This is your active reserved parking slot!
                </div>
                <button
                  onClick={() => {
                    const passObj = {
                      ...bookedSlotModal.active_booking,
                      slot_number: bookedSlotModal.slot_number,
                      parking_area_name: activeArea.name,
                      qr_code_base64: "" // will be displayed or opened
                    };
                    setBookedSlotModal(null);
                    onViewPass(passObj);
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs"
                >
                  View My QR Entrance Pass
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 text-center">
                This bay is currently locked for another customer until departure. Please select any green available slot for instant booking.
              </p>
            )}

            <button
              onClick={() => setBookedSlotModal(null)}
              className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-gray-300 text-xs font-semibold mt-3"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD PARKING AREA */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-cyan-500/40 relative shadow-2xl">
            <button
              onClick={() => setShowAddAreaModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl mx-auto mb-2">
                <i className="fa-solid fa-square-plus"></i>
              </div>
              <h3 className="text-xl font-bold text-white">Add New Parking Slot Area</h3>
              <p className="text-xs text-gray-400 mt-1">Create a new wing and auto-generate parking bays</p>
            </div>

            <form onSubmit={handleQuickAddArea} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Area Name</label>
                <input
                  type="text"
                  required
                  value={newAreaForm.name}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, name: e.target.value })}
                  placeholder="e.g. Area D (Executive West Wing)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Area Code (Single Letter)</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={newAreaForm.code}
                    onChange={(e) => setNewAreaForm({ ...newAreaForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. D"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code uppercase focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Number of Bays (1-10)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={newAreaForm.total_slots}
                    onChange={(e) => setNewAreaForm({ ...newAreaForm, total_slots: parseInt(e.target.value) || 5 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Description / Location Info</label>
                <textarea
                  rows={2}
                  value={newAreaForm.description}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, description: e.target.value })}
                  placeholder="e.g. Shaded bays near West Escalator and Food Court"
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                ></textarea>
              </div>

              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/20 text-[11px] text-gray-300">
                <i className="fa-solid fa-circle-check text-cyan-400 mr-1.5"></i>
                Parking slots ({newAreaForm.code || 'D'}-01, {newAreaForm.code || 'D'}-02...) will be automatically generated with standard, compact, and EV charging dock specs!
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAreaModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold shadow-lg shadow-cyan-400/25"
                >
                  Create Area & Slots
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. BOOKING CONFIRMATION & PASS PAGE
// ==========================================
function BookingConfirmationPage({ booking, onViewAll, onCancel, showToast }) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking and release the slot?")) return;
    setCancelling(true);
    try {
      await API.request(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
      showToast("Booking cancelled successfully.", "info");
      onCancel();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    const a = document.createElement("a");
    a.href = booking.qr_code_base64;
    a.download = `CarParking_QR_${booking.booking_code}.png`;
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-3 animate-bounce">
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Free Parking Reserved!</h1>
        <p className="text-sm text-gray-400 mt-1">Your reservation is confirmed in the database. Scan this QR code at the entrance gate.</p>
      </div>

      {/* Printable Parking Ticket Pass */}
      <div id="printable-ticket" className="glass-card p-6 sm:p-8 rounded-3xl border border-cyan-500/40 relative shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-extrabold text-lg text-white">AI CAR PARKING PASS</span>
              <span className="px-2 py-0.5 rounded bg-emerald-400 text-black font-bold text-[10px] uppercase">CONFIRMED</span>
            </div>
            <span className="text-xs font-mono-code text-cyan-300">BOOKING ID: {booking.booking_code}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 block">Total Fee</span>
            <span className="text-xl font-bold font-mono-code text-white">₹0.00 (FREE)</span>
          </div>
        </div>

        {/* Pass Details & QR Code Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 items-center">
          <div className="md:col-span-2 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block">Customer Name</span>
                <span className="text-white font-bold">{booking.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Vehicle Registration</span>
                <span className="text-cyan-300 font-mono-code font-bold">{booking.vehicle_plate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block">Parking Area</span>
                <span className="text-white font-semibold">{booking.parking_area_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Assigned Bay</span>
                <span className="text-emerald-400 font-mono-code font-extrabold text-xl">{booking.slot_number}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block">Date of Reservation</span>
                <span className="text-white">{booking.booking_date}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Expected Window</span>
                <span className="text-white font-mono-code">{booking.expected_arrival} - {booking.expected_departure}</span>
              </div>
            </div>

            <div className="p-3 bg-navy-950/70 rounded-xl border border-white/5 text-[11px] text-gray-400">
              <i className="fa-solid fa-triangle-exclamation text-yellow-400 mr-1.5"></i>
              Arrival within scheduled window is required. Entrance gate scanner will cross-check this pass.
            </div>
          </div>

          {/* QR Code Graphic Box */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl">
            {booking.qr_code_base64 ? (
              <img src={booking.qr_code_base64} alt="Entrance QR Pass" className="w-40 h-40 object-contain" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-gray-500 text-xs">Generating QR...</div>
            )}
            <span className="text-[10px] text-gray-800 font-mono-code font-bold mt-2">SCAN AT GATE CAMERA</span>
          </div>
        </div>

        {/* Pass Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-white/10 text-xs">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold border border-white/10 transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-print"></i> Print Ticket Pass
            </button>
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-cyan-300 font-semibold border border-cyan-500/30 transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-download"></i> Save QR Code
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onViewAll}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold transition"
            >
              My Bookings
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold border border-red-500/30 transition"
            >
              Cancel Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. QR CODE GATE SCANNER & MANUAL OVERRIDE
// ==========================================
function QRScannerPage({ onSuccess, showToast }) {
  const [action, setAction] = useState("ENTRY"); // ENTRY or EXIT
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);

  const startScanner = () => {
    if (typeof Html5Qrcode === "undefined") {
      showToast("Camera scanner library loading. You can use manual code verification below.", "info");
      return;
    }
    setScanning(true);
    const html5QrCode = new Html5Qrcode("qr-reader-container");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        html5QrCode.stop().then(() => setScanning(false));
        handleVerification(decodedText);
      },
      (errorMessage) => {
        // scan progress frame
      }
    ).catch(err => {
      console.warn("Camera start error:", err);
      setScanning(false);
      showToast("Camera access unavailable. Please use manual booking verification below.", "info");
    });
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => setScanning(false)).catch(() => setScanning(false));
    }
  };

  const handleVerification = async (payload) => {
    setLoading(true);
    setLastResult(null);
    try {
      const data = await API.request("/api/qr/verify", {
        method: "POST",
        body: JSON.stringify({ qr_payload: payload, action })
      });
      setLastResult({ success: true, data });
      onSuccess(data);
    } catch (err) {
      setLastResult({ success: false, message: err.message });
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Gate Entry & Exit Management</span>
        <h1 className="text-3xl font-extrabold text-white">QR Code Gate Verification</h1>
        <p className="text-sm text-gray-400 mt-1">Simulate barrier gate access control via QR camera scan or manual booking pass code</p>
      </div>

      {/* Mode Switcher: Entry Gate vs Exit Gate */}
      <div className="flex justify-center mb-8">
        <div className="bg-navy-900 border border-white/10 p-1 rounded-2xl flex gap-1">
          <button
            onClick={() => { setAction("ENTRY"); setLastResult(null); }}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              action === "ENTRY" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-gray-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-door-open"></i> ENTRANCE GATE SCANNER
          </button>
          <button
            onClick={() => { setAction("EXIT"); setLastResult(null); }}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              action === "EXIT" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i> EXIT CHECKOUT SCANNER
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera Scanner View */}
        <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-cyan-300 uppercase">Live Camera Feed</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${scanning ? "bg-emerald-400 text-black animate-pulse" : "bg-gray-800 text-gray-400"}`}>
                {scanning ? "CAMERA ACTIVE" : "IDLE"}
              </span>
            </div>

            <div className="cv-viewfinder w-full h-64 flex items-center justify-center bg-black/80 rounded-2xl mb-4 relative">
              <div id="qr-reader-container" className="w-full h-full"></div>
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <i className="fa-solid fa-camera text-4xl text-gray-600 mb-2"></i>
                  <span className="text-xs text-gray-400">Click below to activate device webcam</span>
                </div>
              )}
              {scanning && <div className="cv-scanline"></div>}
            </div>
          </div>

          <div className="w-full flex gap-3">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-video"></i> Activate Scanner Camera
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-stop"></i> Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Manual Code Fallback & Result Display */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10">
            <h3 className="text-base font-bold text-white mb-2">Manual Booking Pass Entry</h3>
            <p className="text-xs text-gray-400 mb-4">If camera access is denied or for testing, paste or type the Booking Pass Code directly.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualCode) return;
                handleVerification(manualCode.trim());
              }}
              className="space-y-3"
            >
              <div>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SP-20261122-8192"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code uppercase text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                Verify & {action === "ENTRY" ? "Open Entrance Barrier" : "Release Parking Bay"}
              </button>
            </form>
          </div>

          {/* Verification Status Card */}
          {lastResult && (
            <div className={`glass-card p-6 rounded-3xl border transition-all ${
              lastResult.success ? "border-emerald-500/50 bg-emerald-950/30" : "border-red-500/50 bg-red-950/30"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <i className={`fa-solid ${lastResult.success ? "fa-circle-check text-emerald-400" : "fa-circle-xmark text-red-400"} text-2xl`}></i>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {lastResult.success ? (action === "ENTRY" ? "GATE ENTRY APPROVED" : "EXIT COMPLETED") : "ACCESS DENIED"}
                  </h4>
                  <span className="text-xs text-gray-300">{lastResult.message || (lastResult.data && lastResult.data.message)}</span>
                </div>
              </div>

              {lastResult.success && lastResult.data && lastResult.data.booking && (
                <div className="pt-3 border-t border-white/10 text-xs space-y-1.5 font-mono-code">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass Code:</span>
                    <span className="text-cyan-300 font-bold">{lastResult.data.booking.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white">{lastResult.data.booking.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vehicle Plate:</span>
                    <span className="text-white font-bold">{lastResult.data.booking.vehicle_plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned Bay:</span>
                    <span className="text-emerald-400 font-bold text-sm">{lastResult.data.booking.slot_number}</span>
                  </div>
                  <div className="mt-3 p-2 bg-emerald-500/20 text-emerald-300 text-center rounded-lg font-bold">
                    🟢 BOOM BARRIER OPEN • PROCEED SAFELY
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. AI VEHICLE DETECTION & LICENSE PLATE STUDIO
// ==========================================
function AIVisionPage({ showToast, onOccupancyChange }) {
  const [demoVehicles, setDemoVehicles] = useState([]);
  const [selectedDemoId, setSelectedDemoId] = useState("demo_car_1");
  const [action, setAction] = useState("ENTRY");
  const [analyzing, setAnalyzing] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const fetchDemoList = async () => {
    try {
      const data = await API.request("/api/vision/demo-images");
      setDemoVehicles(data);
    } catch (e) {
      console.warn("Demo images error:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await API.request("/api/vision/logs");
      setLogs(data);
    } catch (e) {
      console.warn("Logs error:", e);
    }
  };

  useEffect(() => {
    fetchDemoList();
    fetchLogs();
  }, []);

  const runDetection = async (demoId) => {
    const targetId = demoId || selectedDemoId;
    setAnalyzing(true);
    setCvResult(null);
    try {
      const res = await API.request(`/api/vision/detect?action=${action}`, {
        method: "POST",
        body: JSON.stringify({ camera_mode: "demo", demo_image_id: targetId })
      });
      setCvResult(res);
      fetchLogs();
      if (res.verification && res.verification.verified) {
        showToast(res.verification.message, "info");
        onOccupancyChange();
      } else if (res.verification) {
        showToast(res.verification.message, "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setAnalyzing(true);
      setCvResult(null);
      try {
        const res = await API.request(`/api/vision/detect?action=${action}`, {
          method: "POST",
          body: JSON.stringify({ camera_mode: "upload", image_base64: reader.result })
        });
        setCvResult(res);
        fetchLogs();
        if (res.verification && res.verification.verified) {
          showToast(res.verification.message, "info");
          onOccupancyChange();
        } else if (res.verification) {
          showToast(res.verification.message, "error");
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
          <i className="fa-solid fa-eye"></i> Computer Vision & License Plate OCR Module
        </div>
        <h1 className="text-3xl font-extrabold text-white">AI Vehicle Detection Studio</h1>
        <p className="text-sm text-gray-400 mt-1">
          OpenCV pipeline detects vehicle class, localizes registration plates, extracts plate text, and verifies active reservations in real time.
        </p>
      </div>

      {/* Top Selector: Action & Demo Vehicle Cards */}
      <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Select Test Vehicle for Examination</h3>
            <span className="text-xs text-gray-400">Pre-calibrated test cases with active reservations</span>
          </div>
          {/* Gate Direction Toggle */}
          <div className="flex items-center gap-2 bg-navy-900 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setAction("ENTRY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${action === "ENTRY" ? "bg-emerald-500 text-black" : "text-gray-400"}`}
            >
              Gate 1 (Entry)
            </button>
            <button
              onClick={() => setAction("EXIT")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${action === "EXIT" ? "bg-blue-500 text-white" : "text-gray-400"}`}
            >
              Gate 2 (Exit)
            </button>
          </div>
        </div>

        {/* Demo Vehicle Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {demoVehicles.map(v => (
            <div
              key={v.id}
              onClick={() => {
                setSelectedDemoId(v.id);
                runDetection(v.id);
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                selectedDemoId === v.id
                  ? "bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-400/20"
                  : "bg-navy-900/80 border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-white">{v.name}</span>
                <span className="px-2 py-0.5 rounded bg-navy-800 text-cyan-300 font-mono-code text-[10px] font-bold">
                  {v.plate_number}
                </span>
              </div>
              {v.thumbnail && (
                <img src={v.thumbnail} alt={v.name} className="w-full h-28 object-cover rounded-xl mb-2" />
              )}
              <p className="text-[11px] text-gray-400 leading-tight">{v.description}</p>
            </div>
          ))}
        </div>

        {/* Alternative: Upload Custom Car Image */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs">
          <label className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-cyan-300 font-semibold border border-white/10 cursor-pointer transition flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up"></i>
            Upload Custom Vehicle Photo
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => runDetection(selectedDemoId)}
            disabled={analyzing}
            className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold transition flex items-center gap-2"
          >
            {analyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-play"></i>}
            Run Computer Vision Analysis
          </button>
        </div>
      </div>

      {/* Live AI HUD Viewfinder & Detection Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* HUD Frame View (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-cyan-500/30 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              AI Computer Vision Viewfinder
            </span>
            <span className="font-mono-code text-cyan-400">OpenCV Pretrained YOLO Pipeline</span>
          </div>

          <div className="cv-viewfinder w-full bg-black rounded-2xl flex items-center justify-center min-h-[320px] relative overflow-hidden">
            {analyzing && <div className="cv-scanline"></div>}

            {cvResult && cvResult.detection && cvResult.detection.annotated_image ? (
              <img
                src={cvResult.detection.annotated_image}
                alt="AI Detected Vehicles"
                className="w-full h-auto object-contain rounded-xl"
              />
            ) : (
              <div className="text-center p-8">
                <i className="fa-solid fa-camera-viewfinder text-5xl text-gray-700 mb-3 block"></i>
                <span className="text-xs text-gray-500">Select any test vehicle above or click "Run Analysis" to view bounding boxes</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Telemetry & Verification Card */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-white/10">Detection Telemetry</h3>

            {cvResult && cvResult.detection ? (
              <div className="space-y-3 text-xs font-mono-code">
                <div className="p-3 bg-navy-900 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">VEHICLE CLASS:</span>
                  <span className="text-white font-bold text-base">{cvResult.detection.vehicle_class}</span>
                  <span className="text-[10px] text-cyan-400 block mt-0.5">Confidence: {Math.round(cvResult.detection.confidence * 100)}%</span>
                </div>

                <div className="p-3 bg-navy-900 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">RECOGNIZED LICENSE PLATE:</span>
                  <span className="text-emerald-400 font-bold text-xl">{cvResult.detection.plate_number || "NONE"}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">OCR Accuracy: 98.4%</span>
                </div>

                <div className={`p-4 rounded-xl border ${
                  cvResult.verification && cvResult.verification.verified
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : "bg-red-950/40 border-red-500/40 text-red-200"
                }`}>
                  <span className="text-[10px] font-bold block mb-1 uppercase tracking-wider">RESERVATION VERIFICATION:</span>
                  <div className="font-bold text-sm mb-1">{cvResult.verification.status}</div>
                  <p className="text-[11px] font-sans leading-relaxed">{cvResult.verification.message}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">Awaiting vehicle feed snapshot...</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <span className="text-[10px] text-gray-500">Autonomous Gate Actuator linked to Database Occupancy</span>
          </div>
        </div>
      </div>

      {/* Detection Audit Logs Table */}
      <div className="glass-card p-6 rounded-3xl border border-white/5">
        <h3 className="text-base font-bold text-white mb-4">Recent Computer Vision Audit Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="text-gray-400 border-b border-white/5 pb-2">
              <tr>
                <th className="py-2">Timestamp</th>
                <th className="py-2">Detected Classes</th>
                <th className="py-2">Plate OCR</th>
                <th className="py-2">Confidence</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-white/5">
                  <td className="py-2.5 text-gray-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 text-white">{l.detected_classes}</td>
                  <td className="py-2.5 text-cyan-300 font-bold">{l.detected_plate || "N/A"}</td>
                  <td className="py-2.5">{Math.round(l.confidence * 100)}%</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.verification_status === "MATCHED" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                    }`}>
                      {l.verification_status}
                    </span>
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

// ==========================================
// 9. LIVE OCCUPANCY DASHBOARD
// ==========================================
function LiveOccupancyPage({ data, onRefresh, onBookSlot }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <i className="fa-solid fa-spinner animate-spin text-3xl text-cyan-400"></i>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Facility Telemetry</span>
          <h1 className="text-3xl font-extrabold text-white">Live Parking Occupancy</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time status updates synced with entry/exit sensors and bookings</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-xs border border-white/10 transition flex items-center gap-2"
          >
            <i className="fa-solid fa-arrows-rotate text-cyan-400"></i> Refresh Feed
          </button>
          <button
            onClick={onBookSlot}
            className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition"
          >
            Reserve Slot Now
          </button>
        </div>
      </div>

      {/* Big Visual Gauge & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Occupancy Dial Card */}
        <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider mb-3">Capacity Utilization</span>
          <div className="relative w-44 h-44 flex items-center justify-center mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-navy-900"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 transition-all duration-1000 ease-out"
                strokeDasharray={`${data.occupancy_percentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold font-mono-code text-white">{data.occupancy_percentage}%</span>
              <span className="text-[10px] text-gray-400 uppercase">LOAD FACTOR</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400 font-mono-code">
            {data.available_slots} Bays Available for Instant Allocation
          </span>
        </div>

        {/* 4 Detail Metric Cards (2 Cols) */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
              <span className="font-bold">Available Bays</span>
              <i className="fa-solid fa-circle-check text-base"></i>
            </div>
            <div className="text-3xl font-extrabold font-mono-code text-white">{data.available_slots}</div>
            <span className="text-[10px] text-emerald-300 mt-1 block">Vacant for reservations</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-red-500/30 bg-red-950/20">
            <div className="flex items-center justify-between text-red-400 text-xs mb-2">
              <span className="font-bold">Occupied Bays</span>
              <i className="fa-solid fa-car text-base"></i>
            </div>
            <div className="text-3xl font-extrabold font-mono-code text-white">{data.occupied_slots}</div>
            <span className="text-[10px] text-red-300 mt-1 block">Currently parked</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-yellow-500/30 bg-yellow-950/20">
            <div className="flex items-center justify-between text-yellow-400 text-xs mb-2">
              <span className="font-bold">Reserved Bays</span>
              <i className="fa-solid fa-clock text-base"></i>
            </div>
            <div className="text-3xl font-extrabold font-mono-code text-white">{data.reserved_slots}</div>
            <span className="text-[10px] text-yellow-300 mt-1 block">Awaiting customer arrival</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-gray-500/30 bg-navy-900/60">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold">Total Capacity</span>
              <i className="fa-solid fa-layer-group text-base"></i>
            </div>
            <div className="text-3xl font-extrabold font-mono-code text-white">{data.total_slots}</div>
            <span className="text-[10px] text-gray-400 mt-1 block">Across all active wings</span>
          </div>
        </div>
      </div>

      {/* Area-by-Area Breakdown Bars */}
      <div className="glass-card p-6 rounded-3xl border border-white/10">
        <h3 className="text-base font-bold text-white mb-6">Zone & Wing Capacity Analysis</h3>

        <div className="space-y-6">
          {data.areas.map(a => (
            <div key={a.id} className="p-4 rounded-2xl bg-navy-900/60 border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-bold text-sm text-white">{a.name}</h4>
                  <span className="text-xs text-gray-400">{a.description}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono-code text-cyan-300 font-bold">{a.available} of {a.total_slots} Free</span>
                  <span className="text-[10px] text-gray-400 block">({a.occupancy_rate}% occupied)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-navy-950 rounded-full overflow-hidden flex">
                <div style={{ width: `${(a.occupied / a.total_slots) * 100}%` }} className="bg-red-500" title={`Occupied: ${a.occupied}`}></div>
                <div style={{ width: `${(a.reserved / a.total_slots) * 100}%` }} className="bg-yellow-500" title={`Reserved: ${a.reserved}`}></div>
                <div style={{ width: `${(a.available / a.total_slots) * 100}%` }} className="bg-emerald-500" title={`Available: ${a.available}`}></div>
                <div style={{ width: `${(a.disabled / a.total_slots) * 100}%` }} className="bg-gray-600" title={`Disabled: ${a.disabled}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 10. MY BOOKINGS PAGE
// ==========================================
function MyBookingsPage({ onViewPass, onBookMore, showToast }) {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const data = await API.request("/api/bookings/my");
      setBookings(data);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter(b => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return ["Confirmed", "Arrived", "Parked"].includes(b.status);
    if (filter === "COMPLETED") return b.status === "Completed";
    if (filter === "CANCELLED") return b.status === "Cancelled";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Reservation Portfolio</span>
          <h1 className="text-3xl font-extrabold text-white">My Parking Bookings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all your active, completed, and upcoming free parking sessions</p>
        </div>
        <button
          onClick={onBookMore}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition flex items-center gap-2"
        >
          <i className="fa-solid fa-plus-circle"></i> New Free Reservation
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${
              filter === t ? "bg-cyan-400 text-black" : "bg-navy-900 text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <i className="fa-solid fa-spinner animate-spin text-3xl text-cyan-400"></i>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-white/5">
          <i className="fa-solid fa-ticket-simple text-4xl text-gray-600 mb-3 block"></i>
          <h3 className="text-base font-bold text-white mb-1">No Reservations Found</h3>
          <p className="text-xs text-gray-400 mb-4">You have no {filter.toLowerCase()} parking reservations.</p>
          <button
            onClick={onBookMore}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs"
          >
            Book Free Parking Bay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(b => (
            <div key={b.id} className="glass-card p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <span className="font-mono-code font-bold text-xs text-cyan-300">{b.booking_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    b.status === "Parked" || b.status === "Confirmed" ? "bg-emerald-500/20 text-emerald-300" :
                    b.status === "Completed" ? "bg-blue-500/20 text-blue-300" :
                    "bg-red-500/20 text-red-300"
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Assigned Bay</span>
                    <span className="text-2xl font-mono-code font-extrabold text-white">{b.slot_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Area</span>
                    <span className="text-xs font-semibold text-gray-200">{b.parking_area_name}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-300 mb-4 font-mono-code">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plate:</span>
                    <span>{b.vehicle_plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span>{b.booking_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span>{b.expected_arrival} - {b.expected_departure}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => onViewPass(b)}
                  className="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-qrcode"></i> View QR Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 11. ADMINISTRATOR DASHBOARD
// ==========================================
function AdminDashboard({ user, showToast, onRefreshOccupancy }) {
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState("bookings"); // bookings, slots, customers, logs, report
  const [allBookings, setAllBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [gateLogs, setGateLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Slot Management Modal state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    slot_number: "",
    area_id: 1,
    slot_type: "Standard",
    status: "Available",
    vehicle_compatibility: "All",
    distance_from_entrance: 15
  });

  const fetchMetrics = async () => {
    try {
      const data = await API.request("/api/admin/metrics");
      setMetrics(data);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const fetchAllBookings = async () => {
    try {
      const data = await API.request(`/api/admin/bookings?status_filter=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
      setAllBookings(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await API.request("/api/admin/customers");
      setCustomers(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchSlots = async () => {
    try {
      const data = await API.request("/api/parking/slots");
      setSlots(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchGateLogs = async () => {
    try {
      const data = await API.request("/api/admin/entry-exit-logs");
      setGateLogs(data);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchMetrics(), fetchAllBookings(), fetchCustomers(), fetchSlots(), fetchGateLogs()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "bookings") fetchAllBookings();
  }, [statusFilter, searchQuery]);

  const handleOverrideStatus = async (bId, newSt) => {
    try {
      await API.request("/api/admin/override-booking-status", {
        method: "POST",
        body: JSON.stringify({ booking_id: bId, new_status: newSt })
      });
      showToast(`Status updated to ${newSt}`, "info");
      fetchAllBookings();
      fetchMetrics();
      onRefreshOccupancy();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await API.request("/api/parking/admin/slots", {
        method: "POST",
        body: JSON.stringify(slotForm)
      });
      showToast(`Created slot ${slotForm.slot_number}`, "info");
      setShowSlotModal(false);
      fetchSlots();
      fetchMetrics();
      onRefreshOccupancy();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleToggleSlotStatus = async (slotId, currentStatus) => {
    const nextSt = currentStatus === "Available" ? "Disabled" : "Available";
    try {
      await API.request(`/api/parking/admin/slots/${slotId}/status?new_status=${nextSt}`, { method: "PATCH" });
      showToast(`Slot toggled to ${nextSt}`, "info");
      fetchSlots();
      onRefreshOccupancy();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const exportReportCSV = () => {
    let csv = "BookingID,Customer,Email,Plate,Slot,Date,Arrival,Departure,Status\n";
    allBookings.forEach(b => {
      csv += `"${b.booking_code}","${b.customer_name}","${b.customer_email}","${b.vehicle_plate}","${b.slot_number}","${b.booking_date}","${b.expected_arrival}","${b.expected_departure}","${b.status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CarParking_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("CSV Report downloaded successfully.", "info");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-1">RBAC Controlled</span>
          <h1 className="text-3xl font-extrabold text-white">Administrator Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">Manage parking wings, slot inventory, customers, manual overrides, and audit trails</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReportCSV}
            className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-csv"></i> Export CSV Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Registered Customers</span>
            <div className="text-3xl font-extrabold font-mono-code text-white">{metrics.customers.total_registered}</div>
            <span className="text-[10px] text-cyan-300 mt-1 block">Active user database</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Total Parking Slots</span>
            <div className="text-3xl font-extrabold font-mono-code text-emerald-400">{metrics.facilities.total_slots}</div>
            <span className="text-[10px] text-gray-400 mt-1 block">{metrics.facilities.available_slots} currently vacant</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Total Bookings</span>
            <div className="text-3xl font-extrabold font-mono-code text-yellow-400">{metrics.bookings.total_bookings}</div>
            <span className="text-[10px] text-yellow-300 mt-1 block">{metrics.bookings.active_bookings} active sessions</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">CV Accuracy Rate</span>
            <div className="text-3xl font-extrabold font-mono-code text-purple-400">{metrics.ai_vision.accuracy_rate}%</div>
            <span className="text-[10px] text-purple-300 mt-1 block">{metrics.ai_vision.total_detections} visual checks logged</span>
          </div>
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-3">
        {[
          { id: "bookings", label: "All Reservations", icon: "fa-ticket" },
          { id: "slots", label: "Slot & Bay Inventory", icon: "fa-square-parking" },
          { id: "customers", label: "Customer Directory", icon: "fa-users" },
          { id: "logs", label: "Gate Audit Logs", icon: "fa-clock-rotate-left" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === t.id
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <i className={`fa-solid ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ALL BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="glass-card p-6 rounded-3xl border border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="relative w-full sm:w-80">
              <span className="absolute left-3 top-2.5 text-gray-500 text-xs"><i className="fa-solid fa-magnifying-glass"></i></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by pass, customer, plate, bay..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-1.5 text-xs">
              {["ALL", "Confirmed", "Parked", "Completed", "Cancelled"].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    statusFilter === st ? "bg-cyan-400 text-black font-bold" : "bg-navy-900 text-gray-400"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="text-gray-400 border-b border-white/10 pb-2">
                <tr>
                  <th className="py-2.5">Pass ID</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Plate Number</th>
                  <th className="py-2.5">Bay ID</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allBookings.map(b => (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className="py-3 text-cyan-300 font-bold">{b.booking_code}</td>
                    <td className="py-3 font-sans">
                      <div className="font-semibold text-white">{b.customer_name}</div>
                      <div className="text-[10px] text-gray-500">{b.customer_mobile}</div>
                    </td>
                    <td className="py-3">{b.vehicle_plate}</td>
                    <td className="py-3 font-bold text-emerald-400">{b.slot_number}</td>
                    <td className="py-3 text-gray-400">
                      <div>{b.booking_date}</div>
                      <div className="text-[10px]">{b.expected_arrival} - {b.expected_departure}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === "Parked" || b.status === "Confirmed" ? "bg-emerald-500/20 text-emerald-300" :
                        b.status === "Completed" ? "bg-blue-500/20 text-blue-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <select
                        value={b.status}
                        onChange={(e) => handleOverrideStatus(b.id, e.target.value)}
                        className="px-2 py-1 bg-navy-800 text-white border border-white/10 rounded-lg text-[10px] focus:outline-none"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Arrived">Arrived</option>
                        <option value="Parked">Parked</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SLOT INVENTORY */}
      {activeTab === "slots" && (
        <div className="glass-card p-6 rounded-3xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Parking Slot Allocation Inventory</h3>
            <button
              onClick={() => setShowSlotModal(true)}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus"></i> Add New Slot
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {slots.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-code font-bold text-lg text-white">{s.slot_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === "Available" ? "bg-emerald-500/20 text-emerald-300" :
                      s.status === "Occupied" ? "bg-red-500/20 text-red-300" :
                      s.status === "Reserved" ? "bg-yellow-500/20 text-yellow-300" :
                      "bg-gray-600/30 text-gray-400"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">{s.slot_type} • {s.distance_from_entrance}m</div>
                  <div className="text-[10px] text-cyan-400 mt-1">Compat: {s.vehicle_compatibility}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-[11px]">
                  <button
                    onClick={() => handleToggleSlotStatus(s.id, s.status)}
                    className="text-xs text-yellow-400 hover:underline"
                  >
                    {s.status === "Available" ? "Disable Bay" : "Enable Bay"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Slot Modal */}
          {showSlotModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-cyan-500/30">
                <h3 className="text-lg font-bold text-white mb-4">Add New Parking Bay</h3>
                <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Bay Number (e.g. A-06)</label>
                    <input
                      type="text"
                      required
                      value={slotForm.slot_number}
                      onChange={(e) => setSlotForm({ ...slotForm, slot_number: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Area ID</label>
                    <select
                      value={slotForm.area_id}
                      onChange={(e) => setSlotForm({ ...slotForm, area_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white"
                    >
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Slot Type</label>
                    <select
                      value={slotForm.slot_type}
                      onChange={(e) => setSlotForm({ ...slotForm, slot_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Compact">Compact</option>
                      <option value="EV Charging">EV Charging</option>
                      <option value="Handicap Accessible">Handicap Accessible</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Distance from Entrance (meters)</label>
                    <input
                      type="number"
                      required
                      value={slotForm.distance_from_entrance}
                      onChange={(e) => setSlotForm({ ...slotForm, distance_from_entrance: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-mono-code"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setShowSlotModal(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-bold"
                    >
                      Create Bay
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER DIRECTORY */}
      {activeTab === "customers" && (
        <div className="glass-card p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4">Registered Customers Directory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-white/10 pb-2">
                <tr>
                  <th className="py-2.5">Customer Name</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Mobile</th>
                  <th className="py-2.5">Registered Vehicles</th>
                  <th className="py-2.5">Total Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="py-3 font-semibold text-white">{c.full_name}</td>
                    <td className="py-3 text-gray-300">{c.email}</td>
                    <td className="py-3 text-gray-300">{c.mobile}</td>
                    <td className="py-3 font-mono-code">
                      {c.vehicles.map((v, i) => (
                        <span key={i} className="inline-block mr-2 px-2 py-0.5 rounded bg-navy-900 text-cyan-300 text-[10px]">
                          {v.plate} ({v.type})
                        </span>
                      ))}
                    </td>
                    <td className="py-3 font-bold text-white">{c.total_bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="glass-card p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4">Gate Access Audit Trail (Entry / Exit Events)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="text-gray-400 border-b border-white/10 pb-2">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">Vehicle Plate</th>
                  <th className="py-2">Bay</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gateLogs.map(l => (
                  <tr key={l.id} className="hover:bg-white/5">
                    <td className="py-2.5 text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 font-bold text-cyan-300">{l.vehicle_plate}</td>
                    <td className="py-2.5 font-bold text-white">{l.slot_number}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.action_type === "ENTRY" ? "bg-emerald-500/20 text-emerald-300" :
                        l.action_type === "EXIT" ? "bg-blue-500/20 text-blue-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {l.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">{l.verification_method}</td>
                    <td className="py-2.5 font-sans text-gray-300">{l.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 12. POPUP PASS MODAL
// ==========================================
function BookingPassModal({ booking, onClose, onCancelSuccess, showToast }) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancelling(true);
    try {
      await API.request(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
      showToast("Booking cancelled successfully.", "info");
      onCancelSuccess();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-lg w-full glass-card p-6 rounded-3xl border border-cyan-500/40 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <div className="text-center mb-4">
          <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">AI CAR PARKING • GATE PASS</span>
          <h3 className="text-xl font-bold text-white">Booking ID: {booking.booking_code}</h3>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl mb-4">
          {booking.qr_code_base64 ? (
            <img src={booking.qr_code_base64} alt="Pass QR" className="w-48 h-48 object-contain" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-gray-600 text-xs text-center p-4">
              <i className="fa-solid fa-qrcode text-5xl mb-2 text-cyan-500 block"></i>
              Pass verified in database!
            </div>
          )}
          <span className="text-[10px] text-gray-800 font-mono-code font-bold mt-2">PRESENT AT ENTRANCE GATE CAMERA</span>
        </div>

        <div className="space-y-1.5 text-xs font-mono-code mb-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Assigned Bay:</span>
            <span className="text-emerald-400 font-bold text-base">{booking.slot_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Customer:</span>
            <span className="text-white">{booking.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Vehicle:</span>
            <span className="text-cyan-300 font-bold">{booking.vehicle_plate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Window:</span>
            <span className="text-white">{booking.booking_date} ({booking.expected_arrival} - {booking.expected_departure})</span>
          </div>
        </div>

        <div className="flex gap-2">
          {["Confirmed", "Arrived"].includes(booking.status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/30 transition"
            >
              Cancel Reservation
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Render React Root
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
