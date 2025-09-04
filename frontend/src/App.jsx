import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./context/FirebaseAuthContext";
import Content from "./components/Content";
import MyContent from "./components/MyContent";
import Admin from "./pages/Admin";
import AdminLayout from "./components/AdminLayout";
import Users from "./pages/Users";
import AdminManagement from "./pages/AdminManagement";
import AdminMarketplace from "./pages/AdminMarketplace";
import Marketplace from "./pages/Marketplace";
import MarketplaceDetail from "./pages/MarketplaceDetail";
import MarketplaceUpload from "./pages/MarketplaceUpload";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="content" element={<MyContent/>}/>
            <Route path="content/:contentId" element={<Content/>}/>
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="marketplace/content/:id" element={<MarketplaceDetail />} />
            <Route path="marketplace/upload" element={<MarketplaceUpload />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="users" element={<Users />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="marketplace" element={<AdminMarketplace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
