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
          </Route>
            <Route path="/" element={<AdminLayout />}>
           <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
