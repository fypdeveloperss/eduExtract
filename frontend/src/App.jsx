import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./context/FirebaseAuthContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import OnboardingModal from "./components/OnboardingModal";
import PreferencesSettings from "./components/PreferencesSettings";
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
import SellerDashboard from "./pages/SellerDashboard";
import Forum from "./pages/Forum";
import ForumCategory from "./pages/ForumCategory";
import ForumTopic from "./pages/ForumTopic";
import ForumCreate from "./pages/ForumCreate";
import AdminForum from "./pages/AdminForum";
import AdminForumModeration from "./pages/AdminForumModeration";
import ContentQualityHub from "./pages/ContentQualityHub";
import SmartMentorManagement from "./pages/SmartMentorManagement";
import UserEngagementAnalytics from "./pages/UserEngagementAnalytics";
import CollaborateHub from "./pages/CollaborateHub";
import CollaborationSpace from "./pages/CollaborationSpace";
import CollaborationInvites from "./pages/CollaborationInvites";
import InviteAccept from "./pages/InviteAccept";
import SharedContentView from "./pages/SharedContentView";

function App() {
  return (
    <AuthProvider>
      <CollaborationProvider>
        <OnboardingProvider>
          <PreferencesProvider>
            <Router>
              <Routes>
                <Route index element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/" element={<Layout />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="content" element={<MyContent/>}/>
                  <Route path="content/:contentId" element={<Content/>}/>
                  <Route path="preferences" element={<PreferencesSettings />} />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="marketplace/content/:id" element={<MarketplaceDetail />} />
                  <Route path="marketplace/upload" element={<MarketplaceUpload />} />
                  <Route path="marketplace/seller" element={<SellerDashboard />} />
                  <Route path="forum" element={<Forum />} />
                  <Route path="forum/category/:id" element={<ForumCategory />} />
                  <Route path="forum/topic/:id" element={<ForumTopic />} />
                  <Route path="forum/create" element={<ForumCreate />} />
                  <Route path="collaborate" element={<CollaborateHub />} />
                  <Route path="collaborate/invitations" element={<CollaborationInvites />} />
                  <Route path="collaborate/space/:spaceId" element={<CollaborationSpace />} />
                  <Route path="collaborate/invite/:token" element={<InviteAccept />} />
                  <Route path="collaborate/content/:contentId" element={<SharedContentView />} />
                </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Admin />} />
                <Route path="users" element={<Users />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="marketplace" element={<AdminMarketplace />} />
                <Route path="forum" element={<AdminForum />} />
                <Route path="forum-moderation" element={<AdminForumModeration />} />
                <Route path="content-quality" element={<ContentQualityHub />} />
                <Route path="smart-mentor" element={<SmartMentorManagement />} />
                <Route path="user-engagement" element={<UserEngagementAnalytics />} />
              </Route>
            </Routes>
            <OnboardingModal />
          </Router>
          </PreferencesProvider>
        </OnboardingProvider>
      </CollaborationProvider>
    </AuthProvider>
  );
}

export default App;
