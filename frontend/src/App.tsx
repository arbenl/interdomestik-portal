import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Route-level code splitting
const Home = lazy(() => import("./pages/Home"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const AgentTools = lazy(() => import("./pages/AgentTools"));
const Membership = lazy(() => import("./pages/Membership"));
const Verify = lazy(() => import("./pages/Verify"));
const MemberPortal = lazy(() => import("./pages/MemberPortal"));
const Billing = lazy(() => import("./pages/Billing"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{padding:16}}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="verify" element={<Verify />} />
          <Route
            path="portal"
            element={
              <ProtectedRoute>
                <MemberPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="membership"
            element={
              <ProtectedRoute>
                <Membership />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="agent"
            element={
              <ProtectedRoute>
                <AgentTools />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
