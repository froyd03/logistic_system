import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import "../../styles/Header.css";
import logo from "../../assets/logistics_logo.png";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { useRef, useState, useEffect } from "react";
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';


const Header = (props) => {
    const [greetUser, setGreetUser] = useState();

    const inputRef = useRef(); // Reference for input
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [searchVisible, setSearchVisible] = useState(false);

    useEffect(() => {
        
        const handleWindowResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            setSearchVisible(false); //Reset search bar when resizing
        };

        const handleDocumentClick = (event) => {
            if (!activeNotifRef.current.contains(event.target)) {
                setActiveNotif(false);
            }

            if (!activeSettingsRef.current.contains(event.target)) {
                SetActiveSetting(false);
            }

            const Navigation = document.querySelector('nav');
            if(!Navigation.contains(event.target)){
                Navigation.classList.remove('sideBarActive');
            }
        };

        document.addEventListener("click", handleDocumentClick);
        window.addEventListener("resize", handleWindowResize);
        return () => {
            window.removeEventListener("resize", handleWindowResize);
            document.removeEventListener("click", handleDocumentClick);
        }
    }, []);

    useEffect(() => {
        if (searchVisible) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [searchVisible]);

    const activeNotifRef = useRef();
    const [activeNotif, setActiveNotif] = useState(false);
    function handleToggleNotif(event){
        document.querySelector('nav').classList.remove("sideBarActive");
        SetActiveSetting(false);
        setActiveNotif(a => !a);
        event.stopPropagation();
    }

    const activeSettingsRef = useRef();
    const [activeSetting, SetActiveSetting] = useState(false);
    function handleToggleSettings(event){
        document.querySelector('nav').classList.remove("sideBarActive");
        setActiveNotif(false)
        SetActiveSetting(a => !a);
        event.stopPropagation();
    }

    function toggleMenu(event){
        document.querySelector('nav').classList.toggle("sideBarActive");
        SetActiveSetting(false);
        setActiveNotif(false)
        event.stopPropagation();
    }

    const navigate = useNavigate();
    function logOut(){
       localStorage.removeItem("token");
       navigate("/");
    }

    return (
        <>
        <header>
            <div className="menu-btn" onClick={toggleMenu}>
                <MenuOutlinedIcon />
            </div>
            <h4>{props.title}</h4>
            
            {windowWidth > 500 ? (
                <div className="inp-search">
                    <SearchOutlinedIcon sx={{color: "#1d4fd8c2"}}/>
                    <input type="text" placeholder="Search vehicle, drivers, or reservation" />
                </div>
            ) : (
                <>
                {searchVisible && (
                    <div className="inp-search">
                        <SearchOutlinedIcon />
                        <input 
                            type="text" 
                            ref={inputRef} 
                            placeholder="Search product, supplier, order" 
                            onBlur={() => setSearchVisible(false)}/>
                    </div>
                ) }
                </>
            ) }

            <img src={logo} width="50px" className="logo-img" alt="Logo" />
            <div className="footer">
                {!searchVisible && (
                    <div onClick={() => setSearchVisible(true)} className="search-icon">
                        <SearchOutlinedIcon />
                    </div>
                )}
                <div className="notif-container" ref={activeNotifRef}>
                    <div className="notif-icon" onClick={handleToggleNotif}>
                        {activeNotif ? <NotificationsIcon sx={{color: "#1d4fd8c2"}} /> : <NotificationsOutlinedIcon sx={{color: "#1d4fd8c2"}}/> }
                    </div>
                    {activeNotif && <div className="notifications">
                        <h3>Notifications</h3>
                        <hr />
                        <div className="notif-items">
                            <b><p>Item Delivered</p></b>
                            <p>your item has been delivered.</p>
                            <hr />
                        </div>
                    </div>}
                
                </div>
                <div className="" ref={activeSettingsRef}>
                   <div className="notif-icon" onClick={handleToggleSettings}>
                        {activeSetting ? < AccountCircleIcon sx={{color: "#1d4fd8c2"}}/>  : <AccountCircleOutlinedIcon sx={{color: "#1d4fd8c2"}} />}
                    </div>
                   {activeSetting && <div className="settings-container">
                        <h3>Account</h3>
                        <div className="setting-items">
                            <AccountCircleOutlinedIcon />
                           <h5>Profile</h5>
                        </div>
                        <div className="setting-items" >
                            <SettingsOutlinedIcon/>
                           <h5 >Settings</h5>
                        </div>
                        <div className="setting-items" onClick={logOut}>
                            <LogoutIcon/>
                           <h5 onClick={logOut}>Log out</h5>
                        </div>
                    </div>}
                </div>
            </div>
        </header>
        </>
    );
}

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? 'bg-[#5379E1] text-white '
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <span className="text-lg">{icon}</span>
    <span className="flex-1">{label}</span>
    {badge > 0 && (
      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>
    )}
  </NavLink>
);

const Sidebar = ({ pendingCount }) => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="sideBarHeader">
          <div>
            <img src={require('../../assets/logistics_logo.png')} alt="Logo" className="w-12 h-12" />
          </div>
          <div className="text-center">
            <h1 className="text-sm font-bold text-gray-900">Logistic 2</h1>
            <p className="text-xs text-gray-400">Fleet Operations</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
       <div className="pt-3">
          <NavItem to="/dashboard" icon={<HomeOutlinedIcon />} label="Dashboard" />
        </div>

        <div className="pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">FVM</p>
          <NavItem to="/vehicles" icon={<LocalShippingOutlinedIcon />} label="Vehicles" />
          {isManager() && <NavItem to="/maintenance" icon={<BuildOutlinedIcon />} label="Maintenance" />}
        </div>
        <div className="pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">VRDS</p>
          <NavItem to="/reservations" icon={<EventAvailableOutlinedIcon />} label="Reservations" badge={pendingCount} />
          <NavItem to="/dispatch" icon={<LocationOnOutlinedIcon />} label="Dispatch" />
          
        </div>
        <div className="pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Driver and Trip Monitoring</p>
          <NavItem to="/drivers" icon={<EngineeringOutlinedIcon />} label="Drivers" />
          {/**isManager() && <NavItem to="/incidents" icon="⚠️" label="Incidents" />**/}
          <NavItem to="/trips" icon={<ArticleOutlinedIcon />} label="Trip Logs" />
        </div>
        <div className="pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">TCAO</p>
          <NavItem to="/expenses" icon={<AttachMoneyOutlinedIcon />} label="Expenses" />
          {/**<NavItem to="/fuel-logs" icon="⛽" label="Fuel Logs" />**/}
          {isManager() && <NavItem to="/reports" icon={<BarChartOutlinedIcon />} label="Reports" />}
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

const Layout = ({ children, headerTitle, pendingCount = 0 }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Header title={headerTitle} />
    <Sidebar pendingCount={pendingCount} />
    <main className="sectionLayout">
      <div className="sectionContainer p-8">{children}</div>
    </main>
  </div>
);

export default Layout;