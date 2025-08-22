import React, { useEffect } from "react";
import axios from "axios";
import {
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  IconButton,
  Menu,
  Collapse,
  ListItemButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircle from "@mui/icons-material/AccountCircle";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import KitchenIcon from "@mui/icons-material/Kitchen";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import EventIcon from "@mui/icons-material/Event";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useApiBaseUrl } from "../config/config";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import BoxIcon from "@mui/icons-material/Inventory2"; // For Box wise Annkut
import GroupWorkIcon from "@mui/icons-material/GroupWork"; // For Section wise Annkut
import ScaleIcon from "@mui/icons-material/Scale";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CalculateIcon from "@mui/icons-material/Calculate";
import SummarizeIcon from "@mui/icons-material/Summarize";
import "../App.css";
import AnnkutEventSelector from '../components/AnnkutEventSelector';
import CompareIcon from "@mui/icons-material/Compare";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddTaskIcon from "@mui/icons-material/AddTask";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
const drawerWidth = 250;

const sidebarItemSx = {
  cursor: "pointer",
  "&.Mui-selected": {
    backgroundColor: "#fff",
    color: "#245D6B",
    fontWeight: 700,
    "& .MuiListItemIcon-root": {
      color: "#245D6B",
    },
    "&:hover": {
      backgroundColor: "#fff",
    },
  },
  color: "#fff",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
};

const Dashboard: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [username, setUsername] = React.useState("User");
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE_URL = useApiBaseUrl();

  const [annkutOpen, setAnnkutOpen] = React.useState(
    location.pathname.startsWith("/dashboard/box-annkut") ||
    location.pathname.startsWith("/dashboard/section-annkut") ||
  location.pathname === "/dashboard/FinalNosSummary" ||
  location.pathname === "/dashboard/FinalIngredientSummary"
  );

  const [boxAnnkutOpen, setBoxAnnkutOpen] = React.useState(
    location.pathname.startsWith("/dashboard/box-annkut")
  );

  const [sectionAnnkutOpen, setSectionAnnkutOpen] = React.useState(
    location.pathname.startsWith("/dashboard/section-annkut")
  );

  const handleAnnkutClick = () => setAnnkutOpen(!annkutOpen);
  const handleBoxAnnkutClick = () => setBoxAnnkutOpen(!boxAnnkutOpen);
  const handleSectionAnnkutClick = () =>
    setSectionAnnkutOpen(!sectionAnnkutOpen);

  React.useEffect(() => {
    interface UserResponse {
      username?: string;
    }

    const fetchUsername = () => {
      axios
        .get<UserResponse>(`${API_BASE_URL}/user/me`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((res) => {
          if (res.data && res.data.username) {
            setUsername(res.data.username);
            localStorage.setItem("user", JSON.stringify(res.data));
          } else {
            setUsername("User");
          }
        })
  .catch(() => { setUsername("User"); });
    };

    // Listen for user updates from Profile page
    const handleUserUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.username) {
        setUsername(event.detail.username);
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate as EventListener);
    fetchUsername();

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Helper for active tab
  const isActive = (path: string) => location.pathname === path;

  // Add helper function to check if current page is an Annkut page
  const isAnnkutPage = (pathname: string) => {
    const annkutPages = [
      '/dashboard/box-annkut/weight-entry',
      '/dashboard/box-annkut/box-weight-entry',
      '/dashboard/box-annkut/BoxRangeEntry',
      '/dashboard/box-annkut/WeightCalculation',
      '/dashboard/box-annkut/AnnkutNosSummary',
      '/dashboard/box-annkut/AnnkutSidhuSaman',
      '/dashboard/section-annkut/section-master',
      '/dashboard/section-annkut/vasan-master',
      '/dashboard/section-annkut/vasan-nos-calculation',
      '/dashboard/section-annkut/section-ingredient-summary',
      '/dashboard/section-annkut/section-nos-summary',
      '/dashboard/section-annkut/vasan-fill-plan',
      '/dashboard/section-annkut/layout-planner',
  '/dashboard/FinalNosSummary',
  '/dashboard/FinalIngredientSummary'
    ];
    return annkutPages.some(page => pathname.includes(page));
  };

  // Add useEffect to close dropdowns when navigating outside their sections
  useEffect(() => {
    const currentPath = location.pathname;
    const isBoxAnnkut = currentPath.startsWith('/dashboard/box-annkut/');
    const isSectionAnnkut = currentPath.startsWith('/dashboard/section-annkut/');
    const isAnnkutComparison = currentPath.includes('/annkut-comparison');
  const isFinalNosSummary = currentPath === '/dashboard/FinalNosSummary';
  const isFinalIngredientSummary = currentPath === '/dashboard/FinalIngredientSummary';
  const isAnyAnnkut = isBoxAnnkut || isSectionAnnkut || isAnnkutComparison || isFinalNosSummary || isFinalIngredientSummary;

    if (!isAnyAnnkut) {
      setAnnkutOpen(false);
      setBoxAnnkutOpen(false);
      setSectionAnnkutOpen(false);
      return;
    }
    // Ensure parent open
    setAnnkutOpen(true);
    setBoxAnnkutOpen(isBoxAnnkut);
    setSectionAnnkutOpen(isSectionAnnkut);
  }, [location.pathname]);

  const drawer = (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap>
          Kitchen Manager
        </Typography>
      </Toolbar>
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
      <List
        className="sidebar-scrollbar"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          maxHeight: "100%",
          overflowY: "auto",
        }}
      >
        <ListItem
          component="div"
          sx={sidebarItemSx}
          className={isActive("/dashboard") ? "Mui-selected" : ""}
          onClick={() => navigate("/dashboard")}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <DashboardIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem
          component="li"
          sx={{
            ...sidebarItemSx,
            ...(isActive("/dashboard/add-food-item") && {
              backgroundColor: "#fff",
              color: "#245D6B",
              fontWeight: 700,
              "& .MuiListItemIcon-root": {
                color: "#245D6B",
              },
              "&:hover": {
                backgroundColor: "#fff",
              },
            }),
          }}
          onClick={() => navigate("/dashboard/add-food-item")}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <RestaurantIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Food Item Master" />
        </ListItem>
        <ListItem
          component="li"
          sx={{
            ...sidebarItemSx,
            ...(isActive("/dashboard/add-ingredient") && {
              backgroundColor: "#fff",
              color: "#245D6B",
              fontWeight: 700,
              "& .MuiListItemIcon-root": {
                color: "#245D6B",
              },
              "&:hover": {
                backgroundColor: "#fff",
              },
            }),
          }}
          onClick={() => navigate("/dashboard/add-ingredient")}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <KitchenIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Ingredient Master" />
        </ListItem>
        <ListItem
          component="li"
          sx={{
            ...sidebarItemSx,
            ...(isActive("/dashboard/recipe-entry") && {
              backgroundColor: "#fff",
              color: "#245D6B",
              fontWeight: 700,
              "& .MuiListItemIcon-root": {
                color: "#245D6B",
              },
              "&:hover": {
                backgroundColor: "#fff",
              },
            }),
          }}
          onClick={() => navigate("/dashboard/recipe-entry")}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <ReceiptIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Recipe Entry" />
        </ListItem>
        <ListItem
          component="li"
          sx={{
            ...sidebarItemSx,
            ...(isActive("/dashboard/event-master") && {
              backgroundColor: "#fff",
              color: "#245D6B",
              fontWeight: 700,
              "& .MuiListItemIcon-root": {
                color: "#245D6B",
              },
              "&:hover": {
                backgroundColor: "#fff",
              },
            }),
          }}
          onClick={() => navigate("/dashboard/event-master")}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <EventIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Event Master" />
        </ListItem>
        <ListItemButton onClick={handleAnnkutClick}>
          <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
            <LunchDiningIcon fontSize="small" sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Annkut" />
          {annkutOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={annkutOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {/* Box wise Annkut */}
            <ListItemButton sx={{ pl: 4 }} onClick={handleBoxAnnkutClick}>
              <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                <BoxIcon fontSize="small" sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Box wise Annkut" />
              {boxAnnkutOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={boxAnnkutOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/weight-entry")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/box-annkut/weight-entry")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <ScaleIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Weight Entry Master" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/BoxRangeEntry")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() =>
                    navigate("/dashboard/box-annkut/BoxRangeEntry")
                  }
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <Inventory2Icon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Box Range Master" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/box-weight-entry")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() =>
                    navigate("/dashboard/box-annkut/box-weight-entry")
                  }
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <Inventory2Icon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Box Master" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/WeightCalculation")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() =>
                    navigate("/dashboard/box-annkut/WeightCalculation")
                  }
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <CalculateIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Weight Calculation" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/AnnkutNosSummary")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() =>
                    navigate("/dashboard/box-annkut/AnnkutNosSummary")
                  }
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Annkut Nos Summary" />
                </ListItemButton>

                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/AnnkutSidhuSaman")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/box-annkut/AnnkutSidhuSaman")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Annakut Sidhu Saman" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/box-annkut/annkut-comparison")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/box-annkut/annkut-comparison")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <CompareIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Annkut Comparison" />
                </ListItemButton>
              </List>
            </Collapse>
            <ListItemButton sx={{ pl: 4 }} onClick={handleSectionAnnkutClick}>
              <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                <GroupWorkIcon fontSize="small" sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Section wise Annkut" />
              {sectionAnnkutOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={sectionAnnkutOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/section-master")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/section-master")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <AccountTreeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Section Master" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/vasan-master")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/vasan-master")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Vasan Master" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/vasan-fill-plan")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/vasan-fill-plan")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <AddTaskIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Vasan Fill Plan" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/vasan-nos-calculation")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/vasan-nos-calculation")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <CalculateIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Vasan Nos Calculation" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/section-nos-summary")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/section-nos-summary")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Nos Summary" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/section-ingredient-summary")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/section-ingredient-summary")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Ingredient Summary" />
                </ListItemButton>
                <ListItemButton
                  selected={isActive("/dashboard/section-annkut/layout-planner")}
                  sx={{ pl: 8, ...sidebarItemSx }}
                  onClick={() => navigate("/dashboard/section-annkut/layout-planner")}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                    <ViewModuleIcon fontSize="small" sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Layout Planner" />
                </ListItemButton>
              </List>
            </Collapse>
            <ListItemButton
              selected={isActive("/dashboard/FinalNosSummary")}
              sx={{ pl: 4, ...sidebarItemSx }}
              onClick={() => navigate("/dashboard/FinalNosSummary")}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Final Nos Summary" />
            </ListItemButton>
            <ListItemButton
              selected={isActive("/dashboard/FinalIngredientSummary")}
              sx={{ pl: 4, ...sidebarItemSx }}
              onClick={() => navigate("/dashboard/FinalIngredientSummary")}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                <SummarizeIcon fontSize="small" sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Final Ingredient Summary" />
            </ListItemButton>
          </List>
        </Collapse>
        
      </List>
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          bgcolor: "#245D6B",
          zIndex: 1,
        }}
      >
        <List>
          {localStorage.getItem("user") &&
            JSON.parse(localStorage.getItem("user") || "{}")?.role ===
            "super-admin" && (
              <ListItem
                sx={{ cursor: "pointer", mt: 0 }}
                onClick={() => navigate("/dashboard/create-user")}
              >
                <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
                  <AccountCircle />
                </ListItemIcon>
                <ListItemText primary="Create User" />
              </ListItem>
            )}
          <ListItem
            sx={{
              cursor: "pointer",
              mt:
                localStorage.getItem("user") &&
                  JSON.parse(localStorage.getItem("user") || "{}")?.role ===
                  "super-admin"
                  ? 0 // No margin if super-admin
                  : 0, // Explicitly set to 0 to remove unnecessary space
            }}
            onClick={async () => {
              await fetch(`${API_BASE_URL}/user/logout`, {
                method: "POST",
                credentials: "include",
              }).catch(() => { });

              localStorage.clear();
              sessionStorage.clear();
              navigate("/login");
            }}
          >
            <ListItemIcon sx={{ color: "#fff", minWidth: 30 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sign Out" />
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          ml: { sm: `${drawerWidth}px` },
          bgcolor: "#fff",
          color: "#fff",
        }}
      >
        <Toolbar>
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              color: { xs: "#245D6B", sm: "#fff" },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Show event selector only on Annkut pages */}
            {isAnnkutPage(location.pathname) && (
              <>
                <AnnkutEventSelector />
                <Box
                  sx={{
                    width: "2px",
                    height: "28px",
                    bgcolor: "#ccc",
                    ml: 2,
                    mr: 1,
                    borderRadius: 1,
                  }}
                />
              </>
            )}
            <Typography
              variant="subtitle1"
              sx={{
                color: "#245D6B",
                fontWeight: 500,
                fontSize: 17,
                fontFamily:
                  '"Montserrat", "Segoe UI", "Roboto", "Arial", sans-serif',
              }}
            >
              Hi, {username}
            </Typography>
            <Box
              sx={{
                width: "2px",
                height: "28px",
                bgcolor: "#ccc",
                ml: 2,
                borderRadius: 1,
              }}
            />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              sx={{ color: "#245D6B", ml: 0 }}
              onClick={() => navigate("/dashboard/profile")}
            >
              <AccountCircle sx={{ fontSize: 40 }} />
            </IconButton>
          </Box>
        </Toolbar>
        <Menu
          id="menu-appbar"
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{
            sx: { mt: 0 },
          }}
          open={false}
        ></Menu>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#245D6B",
              color: "#fff",
              maxHeight: "100vh",
              overflowY: "auto",
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#245D6B",
              color: "#fff",
              maxHeight: "100vh",
              overflowY: "auto",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Dashboard;
