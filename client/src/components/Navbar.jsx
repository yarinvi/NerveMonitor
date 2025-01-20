import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { 
  FiMenu, 
  FiX,
  FiLogOut, 
  FiLogIn, 
  FiSettings, 
  FiUser, 
  FiChevronDown,
  FiMoon,
  FiSun
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Navbar.css';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Successfully logged out!');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
      console.error('Failed to logout:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          NerveMonitor
        </Link>
        
        <button 
          className="hamburger" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/gallery" onClick={() => setIsMenuOpen(false)}>Gallery</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
          
          {currentUser && <div className="nav-separator"></div>}
          
          {currentUser ? (
            <>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              <Link to="/device-settings" onClick={() => setIsMenuOpen(false)}>Device Settings</Link>
              <Link to="/attack-history" onClick={() => setIsMenuOpen(false)}>Attack History</Link>
              <div className="user-menu-container" ref={dropdownRef}>
                <button 
                  className="menu-button"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(!dropdownOpen);
                  }}
                >
                  <div className="menu-button-content">
                    <FiUser className="user-icon" />
                    <span className="username">
                      {currentUser?.email?.split('@')[0]}
                    </span>
                    <FiChevronDown className={`dropdown-arrow ${dropdownOpen ? 'rotate' : ''}`} />
                  </div>
                </button>

                <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsMenuOpen(false);
                    }}
                  >
                    <FiUser className="dropdown-icon" />
                    Profile
                  </Link>
                  <Link 
                    to="/device-settings" 
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsMenuOpen(false);
                    }}
                  >
                    <FiSettings className="dropdown-icon" />
                    Settings
                  </Link>
                  <div className="dropdown-divider" />
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                      setIsMenuOpen(false);
                    }}
                  >
                    <FiLogOut className="dropdown-icon" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="nav-button" onClick={() => setIsMenuOpen(false)}>
              <FiLogIn />
              Login
            </Link>
          )}
          
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;